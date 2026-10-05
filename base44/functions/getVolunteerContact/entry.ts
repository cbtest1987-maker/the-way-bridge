import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { task_id } = body;
    if (!task_id) return Response.json({ error: 'task_id is required' }, { status: 400 });

    // Fetch the task using service role to bypass RLS
    const task = await base44.asServiceRole.entities.CareTask.get(task_id);
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
    if (task.status !== 'accepted') return Response.json({ error: 'Task not accepted' }, { status: 400 });
    if (!task.assigned_volunteer_id) return Response.json({ error: 'No volunteer assigned' }, { status: 400 });

    // Verify the requester owns this journey
    const journey = await base44.asServiceRole.entities.PrayerJourney.get(task.journey_id);
    if (!journey) return Response.json({ error: 'Journey not found' }, { status: 404 });
    const isOwner = journey.requester_id === user.id || journey.created_by_id === user.id || user.role === 'admin';
    if (!isOwner) return Response.json({ error: 'Not authorized' }, { status: 403 });

    // Fetch volunteer contact info using service role
    const volunteer = await base44.asServiceRole.entities.User.get(task.assigned_volunteer_id);
    if (!volunteer) return Response.json({ error: 'Volunteer not found' }, { status: 404 });

    return Response.json({
      full_name: volunteer.full_name || 'Volunteer',
      email: volunteer.email
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}