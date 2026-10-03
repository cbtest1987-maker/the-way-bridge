import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { journey_id, reviewer_notes } = await req.json();
    if (!journey_id) return Response.json({ error: 'journey_id is required' }, { status: 400 });

    // Load the journey
    const journey = await base44.asServiceRole.entities.PrayerJourney.get(journey_id);
    if (!journey) return Response.json({ error: 'Journey not found' }, { status: 404 });

    // Refine the AI summary using the reviewer's notes
    const originalText = journey.ai_summary || journey.message;
    const notes = (reviewer_notes || '').trim();
    const refinePrompt = `You are the Care Agent for a Christian prayer and care platform called The Way Bridge AI.
A prayer request was initially flagged as "danger" and held for human review. A risk admin has reviewed it and determined it is safe to release to the prayer care team.

Original request summary:
"""${originalText}"""${notes ? `\n\nRisk admin additional guidance:\n"""${notes}"""` : ''}

Rewrite this as a short (1-2 sentence) compassionate, neutral summary suitable to show to a prayer team. Incorporate the admin's guidance. Do NOT include any dangerous or harmful details. Focus on the prayer and care need.`;

    const refined = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: refinePrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          refined_summary: { type: 'string' }
        },
        required: ['refined_summary']
      }
    });

    // Update the journey: change safety_level to normal, set status to prayer_care, update the summary
    await base44.asServiceRole.entities.PrayerJourney.update(journey_id, {
      safety_level: 'normal',
      status: 'prayer_care',
      ai_summary: refined.refined_summary
    });

    // Resolve the HumanReview
    const reviews = await base44.asServiceRole.entities.HumanReview.filter({ journey_id, status: 'open' });
    for (const review of reviews) {
      await base44.asServiceRole.entities.HumanReview.update(review.id, {
        status: 'resolved',
        reviewer_id: user.id,
        reviewer_notes: notes || undefined,
        resolution: 'care_handling',
        automation_paused: false
      });
    }

    // Create a prayer assignment so it enters the prayer queue
    await base44.asServiceRole.entities.PrayerAssignment.create({
      journey_id,
      status: 'open'
    });

    // Log to AgentRun
    const runs = await base44.asServiceRole.entities.AgentRun.filter({ journey_id });
    if (runs.length > 0) {
      const run = runs[0];
      await base44.asServiceRole.entities.AgentAction.create({
        run_id: run.id,
        action_type: 'human_review',
        description: 'Risk admin released request from danger to prayer care. Summary refined.',
        details: JSON.stringify({ reviewer_id: user.id, original_safety: journey.safety_level, new_safety: 'normal', notes }),
        result: 'success'
      });
      await base44.asServiceRole.entities.AgentRun.update(run.id, {
        status: 'completed',
        safety_level: 'normal',
        summary: 'Released to prayer care by risk admin. Prayer assignment created.'
      });
    }

    return Response.json({
      journey_id,
      safety_level: 'normal',
      status: 'prayer_care',
      ai_summary: refined.refined_summary
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}