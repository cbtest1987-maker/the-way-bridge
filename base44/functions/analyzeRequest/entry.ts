import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, follow_up_answers } = await req.json();
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }
    const trimmed = message.trim().slice(0, 2000);

    const followUpContext = follow_up_answers && Array.isArray(follow_up_answers) && follow_up_answers.length > 0
      ? `\n\nThe person also answered these follow-up questions:\n${follow_up_answers.map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.answer}`).join('\n')}\nIncorporate these answers into your analysis.`
      : '';

    const prompt = `You are the Safety and Need Decomposition AI for a Christian prayer and care platform called theWay Bridge AI.
A person submitted this request:
"""${trimmed}"""${followUpContext}

Step 1 — Safety screening. Classify safety_status as one of:
- "safe": an ordinary prayer or care request.
- "sensitive": legitimate but delicate (grief, abuse disclosure, mental health, relationship crisis) — needs a caring, careful human response but is not an emergency.
- "flagged": suspicious, abusive, exploitative, fraudulent, or clearly inappropriate content.
- "danger": indicates potential immediate danger to self or others (suicidal intent, active abuse, threats of violence).

Step 2 — Write a short (1-2 sentence) compassionate, neutral ai_summary of what the person needs, suitable to show to a prayer team without exposing unnecessary personal detail.

Step 3 — Decompose the request into one or more discrete needs, each with a "type" from exactly this list: prayer, transportation, food, church_connection, resources, building, church_planting, fundraising, disaster. Always include a "prayer" need unless the request is purely a church-to-church business need (building/resources/church_planting/fundraising). Give each need a short "details" string.

Return only the structured result.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          safety_status: { type: 'string', enum: ['safe', 'sensitive', 'flagged', 'danger'] },
          ai_summary: { type: 'string' },
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
        required: ['safety_status', 'ai_summary', 'needs']
      }
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}