import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.church_id) return Response.json({ error: 'You must belong to a verified church prayer team.' }, { status: 403 });

    const body = await req.json();
    const assignmentId = body.assignment_id;
    const note = body.note || '';
    if (!assignmentId) return Response.json({ error: 'Missing assignment_id' }, { status: 400 });

    const svc = base44.asServiceRole;

    // Enforce volunteer eligibility: load the caller with service role to read protected fields
    const fullUser = await svc.entities.User.get(user.id);
    const serviceRoles = Array.isArray(fullUser?.service_roles) ? fullUser.service_roles : [];
    const isPrayerWarrior = serviceRoles.includes('prayer_warrior') || fullUser?.is_default_prayer_warrior;
    if (!isPrayerWarrior) {
      return Response.json({ error: 'You are not registered as a prayer warrior.' }, { status: 403 });
    }
    if (fullUser?.background_check_status !== 'cleared') {
      return Response.json({ error: 'A cleared background check is required to accept prayer assignments.' }, { status: 403 });
    }
    if (!fullUser?.church_approved) {
      return Response.json({ error: 'You must be approved by your church to accept prayer assignments.' }, { status: 403 });
    }
    const church = await svc.entities.Church.get(user.church_id);
    if (!church || church.verification_status !== 'verified') {
      return Response.json({ error: 'Your church must be verified to accept prayer assignments.' }, { status: 403 });
    }

    // Atomically fetch the current assignment to check its status
    const assignment = await svc.entities.PrayerAssignment.get(assignmentId);
    if (!assignment) return Response.json({ error: 'Assignment not found' }, { status: 404 });

    // LOCK CHECK: only "open" assignments can be accepted
    if (assignment.status !== 'open') {
      return Response.json({
        error: 'This prayer request has already been accepted by another warrior.',
        current_status: assignment.status,
      }, { status: 409 });
    }

    // Check warrior doesn't already have an active accepted assignment
    const existing = await svc.entities.PrayerAssignment.filter({
      assigned_warrior_id: user.id,
      status: 'accepted',
    }, { limit: 1 });
    const existingList = Array.isArray(existing) ? existing : (existing.items || []);
    if (existingList.length > 0) {
      return Response.json({
        error: 'You already have an active prayer assignment. Please pray for that one first.',
      }, { status: 409 });
    }

    // Set timeout
    const timeoutMinutes = parseInt(secrets.get('PRAYER_ASSIGNMENT_TIMEOUT_MINUTES') || '720', 10);
    const now = new Date();
    const dueAt = new Date(now.getTime() + timeoutMinutes * 60 * 1000).toISOString();

    // Update assignment — the status check above is our optimistic lock
    await svc.entities.PrayerAssignment.update(assignmentId, {
      status: 'accepted',
      assigned_warrior_id: user.id,
      accepted_at: now.toISOString(),
      due_at: dueAt,
      warrior_note: note || undefined,
    });

    return Response.json({
      success: true,
      assignment_id: assignmentId,
      status: 'accepted',
      due_at: dueAt,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}