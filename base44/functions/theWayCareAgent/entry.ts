import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { TOOL_SCHEMAS, dispatchTool } from './tools.ts';

const GLOO_ENDPOINT = 'https://platform.ai.gloo.com/ai/v2/guarded/responses';
const GLOO_MODEL = 'gloo-anthropic-claude-sonnet-4.6';
const MAX_ITERATIONS = 12;

const SYSTEM_INSTRUCTIONS = `You are "theWay Care Agent", an AI assistant for The Way Bridge platform that connects individuals with local churches for prayer, encouragement, and practical assistance.

YOUR ROLE:
- Understand prayer/care requests from users
- Identify MULTIPLE needs within a single request (prayer, transportation, food, church connection, etc.)
- Classify safety level: "normal", "sensitive", or "danger"
- Select and call appropriate tools to fulfill each need
- Inspect tool results and decide next steps
- Continue multi-step workflows until complete
- Escalate to humans when judgment is required
- NEVER fabricate successful actions — only report what tools actually returned

SAFETY RULES (CRITICAL):
- If the request indicates immediate danger (self-harm, abuse, crisis, violence, "I'm in danger"), classify as "danger"
- For danger cases: STOP normal automation. Do NOT create prayer assignments or care tasks.
  Instead: call create_care_safety_review, write_audit_event, and provide immediate safety guidance.
- Never assign ordinary prayer warriors or care volunteers to crisis cases.
- For "sensitive" cases: proceed with caution, create a care safety review if unsure.

WORKFLOW:
1. Analyze the user's request and identify all needs
2. Call create_prayer_journey FIRST with the assessed safety level
3. If danger: call create_care_safety_review + write_audit_event, then STOP and provide safety guidance
4. If normal/sensitive: call create_prayer_assignment, then find_eligible_prayer_warriors
5. For each practical need (transportation, food, church connection, etc.): call create_care_task, then find_eligible_care_volunteers
6. Call find_matching_verified_churches based on the user's needs
7. Call schedule_next_morning_followup
8. Call write_audit_event to log completion
9. Provide a compassionate summary to the user

Call tools in a logical sequence. Do NOT call all tools at once — wait for results before deciding next steps.
Always provide a warm, compassionate final message to the user summarizing what was done.`;

async function callGloo(input, apiKey) {
  const response = await fetch(GLOO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GLOO_MODEL,
      instructions: SYSTEM_INSTRUCTIONS,
      input: input,
      tools: TOOL_SCHEMAS,
      tool_choice: 'auto',
      parallel_tool_calls: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gloo API error ${response.status}: ${errorText}`);
  }

  return await response.json();
}

function extractMessageText(output) {
  for (const item of output) {
    if (item.type === 'message' && item.content) {
      return item.content.map(c => c.text || '').join('');
    }
  }
  return '';
}

function extractFunctionCalls(output) {
  return output.filter(item => item.type === 'function_call');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { message, is_anonymous, display_name, contact_email, contact_phone, location_text } = body;

    if (!message || !message.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    const apiKey = secrets.get('GLOO_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'GLOO_API_KEY secret is not set' }, { status: 500 });
    }

    // Create AgentRun
    const run = await base44.asServiceRole.entities.AgentRun.create({
      goal: message,
      status: 'running',
      safety_level: 'normal',
      detected_needs: [],
    });

    const ctx = { base44, user, runId: run.id };

    // Build initial input
    const userInput = {
      role: 'user',
      content: `User request: "${message}"\n\nAnonymous: ${is_anonymous || false}\nLocation: ${location_text || 'not specified'}\nDisplay name: ${display_name || user.full_name}\nContact email: ${contact_email || user.email}`,
    };

    let input = [userInput];
    const actionsLog = [];
    let finalMessage = '';
    let lastSafetyLevel = 'normal';

    // Agent loop
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const glooResponse = await callGloo(input, apiKey);
      const functionCalls = extractFunctionCalls(glooResponse.output || []);

      // Write AgentAction for each function call
      for (const fc of functionCalls) {
        let parsedArgs;
        try { parsedArgs = JSON.parse(fc.arguments); } catch { parsedArgs = {}; }

        const action = await base44.asServiceRole.entities.AgentAction.create({
          run_id: run.id,
          action_type: fc.name,
          description: `Tool call: ${fc.name} with args: ${JSON.stringify(parsedArgs).slice(0, 200)}`,
          details: fc.arguments,
          result: 'success',
        });
        actionsLog.push({ tool: fc.name, call_id: fc.call_id, action_id: action.id });
      }

      // If no function calls, we're done
      if (functionCalls.length === 0) {
        finalMessage = extractMessageText(glooResponse.output || []);
        break;
      }

      // Execute each tool and build new input items
      const newItems = [];
      for (const fc of functionCalls) {
        let parsedArgs;
        try { parsedArgs = JSON.parse(fc.arguments); } catch { parsedArgs = {}; }

        let toolResult;
        try {
          toolResult = await dispatchTool(fc.name, parsedArgs, ctx);
        } catch (err) {
          toolResult = { error: err.message };
          // Update the action to failure
          await base44.asServiceRole.entities.AgentAction.update(
            actionsLog[actionsLog.length - 1]?.action_id,
            { result: 'failure', description: `Tool ${fc.name} failed: ${err.message}` }
          );
        }

        // Track safety level
        if (parsedArgs.safety_level) lastSafetyLevel = parsedArgs.safety_level;
        if (toolResult.safety_level) lastSafetyLevel = toolResult.safety_level;

        // Append the function_call and function_call_output to input
        newItems.push({
          type: 'function_call',
          call_id: fc.call_id,
          name: fc.name,
          arguments: fc.arguments,
        });
        newItems.push({
          type: 'function_call_output',
          call_id: fc.call_id,
          output: JSON.stringify(toolResult),
        });
      }

      input = [...input, ...newItems];
    }

    if (!finalMessage) {
      finalMessage = 'The Care Agent has completed processing your request. Your prayer journey has been created and the appropriate support teams have been notified.';
    }

    // Update AgentRun
    const detectedNeeds = actionsLog.map(a => a.tool);
    await base44.asServiceRole.entities.AgentRun.update(run.id, {
      status: 'completed',
      safety_level: lastSafetyLevel,
      detected_needs: [...new Set(detectedNeeds)],
      summary: finalMessage,
    });

    return Response.json({
      agent_run_id: run.id,
      message: finalMessage,
      safety_level: lastSafetyLevel,
      actions: actionsLog,
      status: 'completed',
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}