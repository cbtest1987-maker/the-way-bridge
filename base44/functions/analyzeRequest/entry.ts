import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, follow_up_answers, is_anonymous, display_name, contact_email, location_text } = await req.json();
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }
    const trimmed = message.trim().slice(0, 2000);

    const followUpContext = follow_up_answers && Array.isArray(follow_up_answers) && follow_up_answers.length > 0
      ? `\n\nThe person also answered these follow-up questions:\n${follow_up_answers.map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.answer}`).join('\n')}\nIncorporate these answers into your analysis.`
      : '';

    const prompt = `You are the Care Agent for a Christian prayer and care platform called theWay Bridge AI.
A person submitted this request:
"""${trimmed}"""${followUpContext}

Step 1 — Safety screening. Classify safety_level as one of:
- "normal": an ordinary prayer or care request with no indication of danger.
- "sensitive": legitimate but delicate (grief, abuse disclosure, mental health, relationship crisis) — needs a caring, careful human response but is not an emergency.
- "danger": indicates potential immediate danger to self or others (suicidal intent, active abuse, threats of violence, crisis).

Step 2 — Write a short (1-2 sentence) compassionate, neutral ai_summary of what the person needs, suitable to show to a prayer team without exposing unnecessary personal detail.

Step 3 — Decompose the request into one or more discrete needs, each with a "type" from exactly this list: prayer, transportation, food, church_connection, resources, building, church_planting, fundraising, disaster. Always include a "prayer" need unless the request is purely a church-to-church business need (building/resources/church_planting/fundraising). Give each need a short "details" string.

Step 4 — Set confidence as "high" or "low". If low confidence or safety_level is sensitive/danger, set confidence to "low".

Return only the structured result.`;

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          safety_level: { type: 'string', enum: ['normal', 'sensitive', 'danger'] },
          ai_summary: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'low'] },
          needs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['prayer', 'transportation', 'food', 'church_connection', 'resources', 'building', 'church_planting', 'fundraising', 'disaster']
                },
                details: { type: 'string' }
              },
              required: ['type', 'details']
            }
          }
        },
        required: ['safety_level', 'ai_summary', 'confidence', 'needs']
      }
    });

    // Create PrayerJourney under the user's identity so it appears in their "My Journey" list
    const journey = await base44.entities.PrayerJourney.create({
      requester_id: user.id,
      message: trimmed,
      is_anonymous: is_anonymous || false,
      display_name: display_name || undefined,
      contact_email: contact_email || undefined,
      location_text: location_text || undefined,
      ai_summary: analysis.ai_summary,
      safety_level: analysis.safety_level,
      status: 'open'
    });

    // Create AgentRun
    const run = await base44.asServiceRole.entities.AgentRun.create({
      journey_id: journey.id,
      goal: 'Coordinate this person\'s prayer/care need safely.',
      status: 'running',
      safety_level: analysis.safety_level,
      detected_needs: analysis.needs.map(n => n.type),
      summary: analysis.ai_summary
    });

    const logAction = async (actionType, description, details, result) => {
      await base44.asServiceRole.entities.AgentAction.create({
        run_id: run.id,
        action_type: actionType,
        description,
        details: details ? JSON.stringify(details) : undefined,
        result: result || 'success'
      });
    };

    await logAction('read_request', 'Read and validated requester message', { message_length: trimmed.length });
    await logAction('classify_needs', `Detected ${analysis.needs.length} need(s): ${analysis.needs.map(n => n.type).join(', ')}`, { needs: analysis.needs }, 'success');
    await logAction('safety_check', `Safety level: ${analysis.safety_level}, confidence: ${analysis.confidence}`, { safety_level: analysis.safety_level, confidence: analysis.confidence }, 'success');

    // Safety routing
    if (analysis.safety_level === 'danger') {
      await base44.asServiceRole.entities.PrayerJourney.update(journey.id, { status: 'open' });
      await base44.asServiceRole.entities.HumanReview.create({
        journey_id: journey.id,
        reason: `Immediate danger detected: ${analysis.ai_summary}`,
        safety_level: 'danger',
        status: 'open',
        automation_paused: true
      });
      await logAction('human_review', 'Automation paused — immediate danger detected. Human review created.', { safety_level: 'danger' }, 'paused');
      await logAction('schedule_followup', 'Follow-up deferred — safety case requires human handling first', null, 'paused');
      await base44.asServiceRole.entities.AgentRun.update(run.id, { status: 'completed', summary: 'Danger detected. Automation paused. Human review required.' });
      return Response.json({
        journey_id: journey.id,
        run_id: run.id,
        safety_level: 'danger',
        ai_summary: analysis.ai_summary,
        needs: analysis.needs,
        show_safety_screen: true
      });
    }

    if (analysis.safety_level === 'sensitive' || analysis.confidence === 'low') {
      await base44.asServiceRole.entities.HumanReview.create({
        journey_id: journey.id,
        reason: `Sensitive or low-confidence request: ${analysis.ai_summary}`,
        safety_level: analysis.safety_level,
        status: 'open',
        automation_paused: true
      });
      await logAction('human_review', 'Sensitive/low-confidence — human review created, affected automation paused.', { safety_level: analysis.safety_level }, 'paused');

      // Still create prayer assignment for sensitive (prayer is safe) but pause care routing
      const prayerNeed = analysis.needs.find(n => n.type === 'prayer');
      if (prayerNeed) {
        await base44.asServiceRole.entities.PrayerAssignment.create({
          journey_id: journey.id,
          status: 'open'
        });
        await logAction('create_prayer_assignment', 'Prayer assignment created in open pool', { type: 'prayer' }, 'success');
      }

      await base44.asServiceRole.entities.AgentRun.update(run.id, { status: 'completed', summary: 'Sensitive request. Prayer routed. Care automation paused for human review.' });
      return Response.json({
        journey_id: journey.id,
        run_id: run.id,
        safety_level: analysis.safety_level,
        ai_summary: analysis.ai_summary,
        needs: analysis.needs,
        show_safety_screen: false
      });
    }

    // NORMAL flow — create prayer assignments and care tasks
    for (const need of analysis.needs) {
      if (need.type === 'prayer') {
        await base44.asServiceRole.entities.PrayerAssignment.create({
          journey_id: journey.id,
          status: 'open'
        });
        await logAction('create_prayer_assignment', 'Prayer assignment created in open pool', { type: 'prayer' }, 'success');
      } else {
        await base44.asServiceRole.entities.CareTask.create({
          journey_id: journey.id,
          type: need.type,
          details: need.details,
          status: 'open'
        });
        await logAction('create_care_task', `Care task created: ${need.type}`, { type: need.type, details: need.details }, 'success');
      }
    }

    // Church matching for church_connection needs
    const hasChurchConnection = analysis.needs.some(n => n.type === 'church_connection');
    if (hasChurchConnection) {
      const churches = await base44.asServiceRole.entities.Church.filter({ verification_status: 'verified' });
      await logAction('query_eligible', `Queried ${churches.length} verified churches for matching`, { church_count: churches.length }, 'success');
    }

    await logAction('schedule_followup', 'Next-morning follow-up scheduled', { type: 'next_morning' }, 'success');
    await base44.asServiceRole.entities.AgentRun.update(run.id, { status: 'completed', summary: `Normal flow completed. ${analysis.needs.length} task(s) created and routed.` });

    return Response.json({
      journey_id: journey.id,
      run_id: run.id,
      safety_level: 'normal',
      ai_summary: analysis.ai_summary,
      needs: analysis.needs,
      show_safety_screen: false
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}