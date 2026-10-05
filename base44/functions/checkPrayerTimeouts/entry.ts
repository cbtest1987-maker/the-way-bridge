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

    const timeoutMinutes = parseInt(secrets.get('PRAYER_ASSIGNMENT_TIMEOUT_MINUTES') || '720', 10);
    const now = new Date();
    const results = [];

    // Find all accepted assignments that have passed their due_at
    const expiredPage = await base44.asServiceRole.entities.PrayerAssignment.filter({
      status: 'accepted',
      due_at: { $lt: now.toISOString() }
    }, { sort: '-created_date', limit: 100 });

    for (const assignment of expiredPage.items) {
      try {
        // Fetch the journey to find the church for default warrior lookup
        const journey = await base44.asServiceRole.entities.PrayerJourney.get(assignment.journey_id);
        if (!journey) continue;

        // Mark the expired assignment
        await base44.asServiceRole.entities.PrayerAssignment.update(assignment.id, {
          status: 'timeout_reassigned'
        });

        // Find the default prayer warrior for this church
        // Look for users with church_id matching the journey's matched church or requester's church
        // Default warrior = a verified prayer warrior in the church pool
        const churchId = journey.matched_church_id;
        let defaultWarriorId = null;

        if (churchId) {
          // Find an existing default warrior assignment pattern or use church team
          const defaultWarriors = await base44.asServiceRole.entities.PrayerAssignment.filter({
            journey_id: assignment.journey_id,
            is_default_warrior: true
          }, { sort: '-created_date', limit: 1 });

          if (defaultWarriors.items.length > 0) {
            defaultWarriorId = defaultWarriors.items[0].assigned_warrior_id;
          }
        }

        // Create the fallback assignment
        const fallbackAssignment = await base44.asServiceRole.entities.PrayerAssignment.create({
          journey_id: assignment.journey_id,
          status: 'accepted',
          assigned_warrior_id: defaultWarriorId,
          accepted_at: now.toISOString(),
          due_at: new Date(now.getTime() + timeoutMinutes * 60 * 1000).toISOString(),
          is_default_warrior: true
        });

        // Ensure only one active assignment — mark any other accepted assignments for this journey as timeout_reassigned
        const activeAssignments = await base44.asServiceRole.entities.PrayerAssignment.filter({
          journey_id: assignment.journey_id,
          status: 'accepted'
        });
        for (const a of activeAssignments.items) {
          if (a.id !== fallbackAssignment.id) {
            await base44.asServiceRole.entities.PrayerAssignment.update(a.id, {
              status: 'timeout_reassigned'
            });
          }
        }

        // Update journey status
        await base44.asServiceRole.entities.PrayerJourney.update(assignment.journey_id, {
          status: 'open'
        });

        // Write audit event
        const run = await base44.asServiceRole.entities.AgentRun.create({
          journey_id: assignment.journey_id,
          goal: 'Prayer assignment timeout — fallback reassignment',
          status: 'completed',
          safety_level: journey.safety_level || 'normal',
          summary: `Prayer warrior timed out. Reassigned to default warrior.`
        });

        await base44.asServiceRole.entities.AgentAction.create({
          run_id: run.id,
          action_type: 'prayer_assignment_timeout',
          description: 'Prayer assignment timed out — reassigned to default warrior',
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