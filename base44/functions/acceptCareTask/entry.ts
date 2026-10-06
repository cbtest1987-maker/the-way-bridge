import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { task_id } = body;
    if (!task_id) return Response.json({ error: 'Missing task_id' }, { status: 400 });

    const svc = base44.asServiceRole;

    // Re-verify eligibility from VolunteerApplication — never trust client-writable User fields
    const vaPage = await svc.entities.VolunteerApplication.filter({ user_id: user.id }, { limit: 1 });
    const vaList = Array.isArray(vaPage) ? vaPage : (vaPage.items || []);
    const va = vaList[0];
    if (!va) return Response.json({ error: 'No volunteer application found. Please apply through Get Involved.' }, { status: 403 });
    if (va.role !== 'care_volunteer') {
      return Response.json({ error: 'You are not registered as a care volunteer.' }, { status: 403 });
    }
    if (va.background_check_status !== 'cleared') {
      return Response.json({ error: 'A cleared background check is required to accept care tasks.' }, { status: 403 });
    }
    if (!va.church_approved) {
      return Response.json({ error: 'You must be approved by your church to accept care tasks.' }, { status: 403 });
    }
    const church = await svc.entities.Church.get(va.church_id);
    if (!church || church.verification_status !== 'verified') {
      return Response.json({ error: 'Your church must be verified to accept care tasks.' }, { status: 403 });
    }

    const task = await svc.entities.CareTask.get(task_id);
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
    if (task.status !== 'open') {
      return Response.json({ error: 'This task has already been accepted.', current_status: task.status }, { status: 409 });
    }

    // Separation of Duties: reject if the volunteer is the requester
    const journey = await svc.entities.PrayerJourney.get(task.journey_id);
    if (journey && journey.requester_id === user.id) {
      return Response.json({ error: 'Cannot accept a task for your own request — Separation of Duties.' }, { status: 403 });
    }

    // Atomic compare-and-set — only succeeds if status is still 'open' (prevents race condition)
    await svc.entities.CareTask.updateMany(
      { id: task_id, status: 'open' },
      { $set: { status: 'accepted', assigned_volunteer_id: user.id } }
    );

    // Verify we won the race
    const updated = await svc.entities.CareTask.get(task_id);
    if (!updated || updated.assigned_volunteer_id !== user.id) {
      return Response.json({ error: 'This task has already been accepted by another volunteer.', current_status: updated?.status }, { status: 409 });
    }

    return Response.json({ success: true, task_id, status: 'accepted' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}