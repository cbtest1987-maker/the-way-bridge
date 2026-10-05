// Tool schemas and dispatcher for theWay Care Agent
// All business logic here is deterministic TypeScript — Gloo never overrides these rules.

import { secrets } from 'base44:runtime';

const CAPABILITY_TO_CHURCH_FIELD = {
  transportation: 'supports_transportation',
  food: 'supports_food',
  church_connection: null,
  resources: 'supports_resource_sharing',
  building: null,
  church_planting: 'supports_church_planting',
  fundraising: null,
  disaster: 'supports_disaster_response',
  students: 'supports_students',
};

export const TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'create_prayer_journey',
      description: 'Create a prayer journey record for the user\'s prayer/care request. Call this FIRST to establish the journey before any other action.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'The original prayer/care request text from the user' },
          safety_level: { type: 'string', enum: ['normal', 'sensitive', 'danger'], description: 'Your assessed safety level for this request' },
          is_anonymous: { type: 'boolean', description: 'Whether the request was submitted anonymously' },
          display_name: { type: 'string', description: 'Display name for the requester' },
          contact_email: { type: 'string', description: 'Contact email' },
          location_text: { type: 'string', description: 'Location/city text' },
        },
        required: ['message', 'safety_level'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_prayer_assignment',
      description: 'Create a prayer assignment for a journey, placing it in the prayer warrior pool. Only call for normal/sensitive safety levels, never for danger.',
      parameters: {
        type: 'object',
        properties: {
          journey_id: { type: 'string', description: 'The ID of the PrayerJourney' },
        },
        required: ['journey_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_eligible_prayer_warriors',
      description: 'Find eligible prayer warriors from verified churches. Returns count and church info. Prayer warriors must belong to verified churches.',
      parameters: {
        type: 'object',
        properties: {
          location_text: { type: 'string', description: 'Optional location filter' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_care_task',
      description: 'Create a practical care task (transportation, food, church connection, etc.) for a journey. Only call for normal/sensitive safety levels.',
      parameters: {
        type: 'object',
        properties: {
          journey_id: { type: 'string', description: 'The ID of the PrayerJourney' },
          type: { type: 'string', enum: ['transportation', 'food', 'church_connection', 'resources', 'building', 'church_planting', 'fundraising', 'disaster'], description: 'The type of care needed' },
          details: { type: 'string', description: 'Specific details about the care need' },
        },
        required: ['journey_id', 'type', 'details'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_eligible_care_volunteers',
      description: 'Find eligible care volunteers from verified churches that support the requested capability. Volunteers must be from verified churches with matching capabilities.',
      parameters: {
        type: 'object',
        properties: {
          capability: { type: 'string', enum: ['transportation', 'food', 'church_connection', 'resources', 'building', 'church_planting', 'fundraising', 'disaster'], description: 'The capability needed' },
        },
        required: ['capability'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_matching_verified_churches',
      description: 'Find verified churches that match the user\'s needs based on their support capabilities.',
      parameters: {
        type: 'object',
        properties: {
          supports_transportation: { type: 'boolean' },
          supports_food: { type: 'boolean' },
          supports_students: { type: 'boolean' },
          supports_resource_sharing: { type: 'boolean' },
          supports_church_planting: { type: 'boolean' },
          supports_disaster_response: { type: 'boolean' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_care_safety_review',
      description: 'Create a care and safety review for a journey that requires human judgment. Call this for danger cases or sensitive cases needing review.',
      parameters: {
        type: 'object',
        properties: {
          journey_id: { type: 'string', description: 'The ID of the PrayerJourney' },
          reason: { type: 'string', description: 'Reason for the safety review' },
          safety_level: { type: 'string', enum: ['normal', 'sensitive', 'danger'], description: 'The safety level assessed' },
        },
        required: ['journey_id', 'reason', 'safety_level'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_next_morning_followup',
      description: 'Schedule a next-morning follow-up check-in with the requester for their prayer journey.',
      parameters: {
        type: 'object',
        properties: {
          journey_id: { type: 'string', description: 'The ID of the PrayerJourney' },
        },
        required: ['journey_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_audit_event',
      description: 'Write an audit event to the agent action log for observability and compliance.',
      parameters: {
        type: 'object',
        properties: {
          action_type: { type: 'string', description: 'e.g. safety_check, human_review, escalation, completion' },
          description: { type: 'string', description: 'Description of the event' },
          result: { type: 'string', enum: ['success', 'failure', 'paused', 'escalated'], description: 'Outcome of the event' },
        },
        required: ['action_type', 'description'],
      },
    },
  },
];

export async function dispatchTool(toolName, args, ctx) {
  const { base44, user, runId } = ctx;
  const svc = base44.asServiceRole;

  switch (toolName) {
    case 'create_prayer_journey': {
      const journey = await svc.entities.PrayerJourney.create({
        message: args.message,
        safety_level: args.safety_level || 'normal',
        is_anonymous: args.is_anonymous || false,
        display_name: args.display_name || user.full_name,
        contact_email: args.contact_email || user.email,
        location_text: args.location_text,
        status: 'open',
        requester_id: user.id,
      });
      return { journey_id: journey.id, status: journey.status, safety_level: journey.safety_level };
    }

    case 'create_prayer_assignment': {
      const timeoutMinutes = parseInt(secrets.get('PRAYER_ASSIGNMENT_TIMEOUT_MINUTES') || '720', 10);
      const dueAt = new Date(Date.now() + timeoutMinutes * 60 * 1000).toISOString();
      const assignment = await svc.entities.PrayerAssignment.create({
        journey_id: args.journey_id,
        status: 'open',
        due_at: dueAt,
      });
      return { assignment_id: assignment.id, status: assignment.status, due_at: dueAt, timeout_minutes: timeoutMinutes };
    }

    case 'find_eligible_prayer_warriors': {
      const query = { verification_status: 'verified' };
      if (args.location_text) query.location = { $regex: args.location_text, $options: 'i' };
      const page = await svc.entities.Church.filter(query, { limit: 50, fields: ['name', 'location', 'leader_name', 'leader_email'] });
      return { count: page.items.length, churches: page.items };
    }

    case 'create_care_task': {
      const task = await svc.entities.CareTask.create({
        journey_id: args.journey_id,
        type: args.type,
        details: args.details,
        status: 'open',
      });
      return { task_id: task.id, type: task.type, status: task.status };
    }

    case 'find_eligible_care_volunteers': {
      const churchField = CAPABILITY_TO_CHURCH_FIELD[args.capability];
      const query = { verification_status: 'verified' };
      if (churchField) query[churchField] = true;
      const page = await svc.entities.Church.filter(query, { limit: 50, fields: ['name', 'location', 'leader_name', 'leader_email'] });
      return { count: page.items.length, capability: args.capability, churches: page.items };
    }

    case 'find_matching_verified_churches': {
      const query = { verification_status: 'verified' };
      for (const [key, val] of Object.entries(args)) {
        if (val === true && key.startsWith('supports_')) query[key] = true;
      }
      const page = await svc.entities.Church.filter(query, { limit: 50, fields: ['name', 'location', 'website', 'denomination', 'languages', 'ministries', 'supports_transportation', 'supports_food', 'supports_students', 'supports_resource_sharing', 'supports_church_planting', 'supports_disaster_response'] });
      return { count: page.items.length, churches: page.items };
    }

    case 'create_care_safety_review': {
      const review = await svc.entities.HumanReview.create({
        journey_id: args.journey_id,
        reason: args.reason,
        safety_level: args.safety_level || 'sensitive',
        status: 'open',
        reviewer_id: user.id,
        automation_paused: true,
      });
      return { review_id: review.id, status: review.status, automation_paused: true };
    }

    case 'schedule_next_morning_followup': {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const followUpTime = tomorrow.toISOString();
      await svc.entities.AgentAction.create({
        run_id: runId,
        action_type: 'schedule_followup',
        description: `Next-morning follow-up scheduled for ${followUpTime}`,
        result: 'success',
      });
      return { scheduled: true, follow_up_time: followUpTime };
    }

    case 'write_audit_event': {
      const action = await svc.entities.AgentAction.create({
        run_id: runId,
        action_type: args.action_type,
        description: args.description,
        result: args.result || 'success',
      });
      return { action_id: action.id, logged: true };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}