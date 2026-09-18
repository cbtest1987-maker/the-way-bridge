import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message } = await req.json();
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }
    const trimmed = message.trim().slice(0, 2000);

    const prompt = `You are the Care AI for a Christian prayer and community platform called theWay Bridge.
A person just shared this:
"""${trimmed}"""

Your role is to ask 1-2 thoughtful, constructive follow-up questions that will help us better understand their needs and connect them to the right support.

Guidelines for good follow-up questions:
- If they mention moving or relocating, ask if they'd like to share their location to connect with a nearby church, or if they need help with moving/transportation.
- If they mention illness or health, ask if they'd like practical support (meals, rides to appointments) in addition to prayer.
- If they mention loneliness or isolation, ask if they'd like to be connected with a local church community.
- If they mention financial hardship, ask if they'd like to be connected with churches that offer practical resources.
- If the request is already clear and complete, return an empty questions array — don't ask unnecessary questions.
- Never ask for sensitive personal information (full address, SSN, financial details).
- Keep questions warm, brief, and optional in tone.

Return the questions as a JSON object.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 2
          }
        },
        required: ['questions']
      }
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}