import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Admin-only: this is a scheduled maintenance task
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const svc = base44.asServiceRole;
    const timeoutMinutes = parseInt(secrets.get('PRAYER_ASSIGNMENT_TIMEOUT_MINUTES') || '720', 10);
    const now = new Date();
    const results = [];

    // Find all accepted assignments that have passed their due_at
    const expiredPage = await svc.entities.PrayerAssignment.filter({
      status: 'accepted',
      due_at: { $lt: now.toISOString() }
    }, { sort: '-created_date', limit: 100 });

    for (const assignment of expiredPage.items) {
      try {
        const journey = await svc.entities.PrayerJourney.get(assignment.journey_id);
        if (!journey) continue;

        // Mark the expired assignment
        await svc.entities.PrayerAssignment.update(assignment.id, {
          status: 'timeout_reassigned'
        });

        // Find the default prayer warrior: look for a User with is_default_prayer_warrior=true
        // belonging to the journey's matched church
        let defaultWarriorId = null;
        const churchId = journey.matched_church_id;

        if (churchId) {
          const warriors = await svc.entities.User.filter({
            church_id: churchId,
            is_default_prayer_warrior: true,
            church_approved: true,
          });
          const warriorList = Array.isArray(warriors) ? warriors : (warriors.items || []);
          if (warriorList.length > 0) {
            defaultWarriorId = warriorList[0].id;
          }
        }

        // Create the fallback assignment
        const fallbackAssignment = await svc.entities.PrayerAssignment.create({
          journey_id: assignment.journey_id,
          status: defaultWarriorId ? 'accepted' : 'open',
          assigned_warrior_id: defaultWarriorId,
          accepted_at: defaultWarriorId ? now.toISOString() : undefined,
          due_at: new Date(now.getTime() + timeoutMinutes * 60 * 1000).toISOString(),
          is_default_warrior: true
        });

        // Ensure only one active assignment — mark any other accepted assignments as timeout_reassigned
        const activeAssignments = await svc.entities.PrayerAssignment.filter({
          journey_id: assignment.journey_id,
          status: 'accepted'
        }, { limit: 50 });
        const activeList = Array.isArray(activeAssignments) ? activeAssignments : (activeAssignments.items || []);
        for (const a of activeList) {
          if (a.id !== fallbackAssignment.id) {
            await svc.entities.PrayerAssignment.update(a.id, {
              status: 'timeout_reassigned'
            });
          }
        }

        // Update journey status
        await svc.entities.PrayerJourney.update(assignment.journey_id, {
          status: 'open'
        });

        // Write audit event
        const run = await svc.entities.AgentRun.create({
          journey_id: assignment.journey_id,
          goal: 'Prayer assignment timeout — fallback reassignment',
          status: 'completed',
          safety_level: journey.safety_level || 'normal',
          summary: defaultWarriorId
            ? 'Prayer warrior timed out. Reassigned to default warrior.'
            : 'Prayer warrior timed out. Returned to open pool (no default warrior configured).'
        });

        await svc.entities.AgentAction.create({
          run_id: run.id,
          action_type: 'prayer_assignment_timeout',
          description: defaultWarriorId
            ? 'Prayer assignment timed out — reassigned to default warrior'
            : 'Prayer assignment timed out — returned to open pool',
          details: JSON.stringify({
            original_warrior_id: assignment.assigned_warrior_id,
            accepted_at: assignment.accepted_at,
            due_at: assignment.due_at,
            timeout_at: now.toISOString(),
            reason: 'PRAYER_ASSIGNMENT_TIMEOUT',
            fallback_warrior_id: defaultWarriorId,
            new_assignment_id: fallbackAssignment.id,
            timeout_minutes: timeoutMinutes
          }),
          result: 'success'
        });

        results.push({
          journey_id: assignment.journey_id,
          expired_assignment_id: assignment.id,
          new_assignment_id: fallbackAssignment.id,
          fallback_warrior_id: defaultWarriorId
        });
      } catch (err) {
        results.push({
          journey_id: assignment.journey_id,
          error: err.message
        });
      }
    }

    return Response.json({
      checked: expiredPage.items.length,
      reassigned: results.length,
      timeout_minutes: timeoutMinutes,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}