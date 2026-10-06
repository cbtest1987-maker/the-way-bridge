import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // Check care_safety_reviewer from VolunteerApplication — never trust client-writable User fields
    // Also verify the reviewer's church is verified and they have been vetted (church_approved + background check)
    let isReviewer = user.role === 'admin';
    if (!isReviewer) {
      const vaPage = await base44.asServiceRole.entities.VolunteerApplication.filter({ user_id: user.id }, { limit: 1 });
      const vaList = Array.isArray(vaPage) ? vaPage : (vaPage.items || []);
      const va = vaList[0];
      if (va?.care_safety_reviewer === true && va?.church_approved === true && va?.background_check_status === 'cleared') {
        const reviewerChurch = await base44.asServiceRole.entities.Church.get(va.church_id);
        isReviewer = reviewerChurch?.verification_status === 'verified';
      }
    }
    if (!isReviewer) {
      return Response.json({ error: 'Forbidden — care & safety reviewer role required' }, { status: 403 });
    }

    const { journey_id, reviewer_notes } = await req.json();
    if (!journey_id) return Response.json({ error: 'journey_id is required' }, { status: 400 });

    // Load the journey
    const journey = await base44.asServiceRole.entities.PrayerJourney.get(journey_id);
    if (!journey) return Response.json({ error: 'Journey not found' }, { status: 404 });

    // Separation of Duties: the reviewer cannot be the original requester
    if (journey.requester_id === user.id) {
      return Response.json({ error: 'Cannot release your own request — Separation of Duties.' }, { status: 403 });
    }

    // Only allow release for journeys that were flagged for human review (danger or open review)
    if (journey.safety_level !== 'danger') {
      return Response.json({ error: 'This journey is not flagged for safety review release' }, { status: 400 });
    }
    const openReviews = await base44.asServiceRole.entities.HumanReview.filter({ journey_id, status: 'open' });
    if (openReviews.length === 0) {
      return Response.json({ error: 'No open safety review exists for this journey' }, { status: 400 });
    }

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