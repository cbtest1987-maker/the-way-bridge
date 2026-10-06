import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;

    // Check care_safety_reviewer from VolunteerApplication — never trust client-writable User fields
    // Also verify the reviewer's church is verified and they have been vetted (church_approved + background check)
    let isReviewer = user.role === 'admin';
    if (!isReviewer) {
      const vaPage = await svc.entities.VolunteerApplication.filter({ user_id: user.id }, { limit: 1 });
      const vaList = Array.isArray(vaPage) ? vaPage : (vaPage.items || []);
      const va = vaList[0];
      if (va?.care_safety_reviewer === true && va?.church_approved === true && va?.background_check_status === 'cleared') {
        const reviewerChurch = await svc.entities.Church.get(va.church_id);
        isReviewer = reviewerChurch?.verification_status === 'verified';
      }
    }
    if (!isReviewer) {
      return Response.json({ error: 'You need Care & Safety Reviewer permission to resolve reviews.' }, { status: 403 });
    }

    const body = await req.json();
    const { review_id, resolution, reviewer_notes } = body;
    if (!review_id) return Response.json({ error: 'Missing review_id' }, { status: 400 });
    if (!['return_to_normal', 'care_handling', 'escalate', 'close_inappropriate'].includes(resolution)) {
      return Response.json({ error: 'Invalid resolution' }, { status: 400 });
    }

    const review = await svc.entities.HumanReview.get(review_id);
    if (!review) return Response.json({ error: 'Review not found' }, { status: 404 });
    if (review.status !== 'open') {
      return Response.json({ error: 'Review is already resolved.' }, { status: 409 });
    }

    // Separation of Duties: reject if the reviewer is the requester
    const journey = await svc.entities.PrayerJourney.get(review.journey_id);
    if (journey && journey.requester_id === user.id) {
      return Response.json({ error: 'Cannot resolve your own request — Separation of Duties.' }, { status: 403 });
    }

    await svc.entities.HumanReview.update(review_id, {
      status: 'resolved',
      reviewer_id: user.id,
      reviewer_notes: reviewer_notes || '',
      resolution,
      automation_paused: false,
    });

    return Response.json({ success: true, review_id, status: 'resolved' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}