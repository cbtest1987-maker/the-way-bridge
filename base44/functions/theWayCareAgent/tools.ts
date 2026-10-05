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
      name: 'create_church_connect_request',
      description: 'Create a church-to-church connection request when a church needs space, building, or resource support from another church. For ministry resources, call search_ministry_resources first. If no matching church is found, omit responding_church_id to create a purchase-pending request.',
      parameters: {
        type: 'object',
        properties: {
          journey_id: { type: 'string', description: 'The ID of the PrayerJourney' },
          requesting_church_id: { type: 'string', description: 'The church requesting help (omit to use the user\'s church)' },
          responding_church_id: { type: 'string', description: 'The church being asked to help (omit if no match found)' },
          need_type: { type: 'string', enum: ['space', 'building', 'church_planting', 'fundraising', 'disaster', 'resources', 'ministry_resource'], description: 'The type of support needed' },
          resource_name: { type: 'string', description: 'The specific ministry resource requested (e.g. Communion Tray). Include for ministry_resource need type.' },
          details: { type: 'string', description: 'Specific details about what is needed' },
        },
        required: ['journey_id', 'need_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_ministry_resources',
      description: 'Search participating churches for a specific ministry resource (e.g. Communion Tray, Hymnals, Baptismal Font). Returns matching churches that can provide, share, donate, or lend the resource. Call this BEFORE creating a church connect request for ministry resources.',
      parameters: {
        type: 'object',
        properties: {
          resource_name: { type: 'string', description: 'The name of the ministry resource needed (e.g. "Communion Tray", "Hymnals", "Baptismal Font")' },
        },
        required: ['resource_name'],
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
      // Enforce per-volunteer eligibility: church_verified AND church_approved AND background_check_status=cleared
      const churchField = CAPABILITY_TO_CHURCH_FIELD[args.capability];
      const churchQuery = { verification_status: 'verified' };
      if (churchField) churchQuery[churchField] = true;
      const churchPage = await svc.entities.Church.filter(churchQuery, { limit: 50, fields: ['id', 'name', 'location'] });
      const churchIds = churchPage.items.map(c => c.id);
      if (churchIds.length === 0) return { count: 0, capability: args.capability, volunteers: [] };

      // Find users at those churches who are approved, background-cleared, and have the capability
      const userQuery = {
        church_id: { $in: churchIds },
        church_approved: true,
        background_check_status: 'cleared',
        volunteer_capabilities: args.capability,
      };
      const volunteers = await svc.entities.User.filter(userQuery, { limit: 50, fields: ['id', 'full_name', 'church_id'] });
      const volunteerList = volunteers.items || volunteers;
      const churchMap = {};
      churchPage.items.forEach(c => { churchMap[c.id] = c; });
      const result = volunteerList.map(v => ({
        id: v.id,
        name: v.full_name,
        church: churchMap[v.church_id]?.name || 'Unknown',
        location: churchMap[v.church_id]?.location || '',
      }));
      return { count: result.length, capability: args.capability, volunteers: result };
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

    case 'create_church_connect_request': {
      const hasRespondingChurch = !!args.responding_church_id;
      const requestingChurchId = args.requesting_church_id || user.church_id;
      if (!requestingChurchId) {
        return { error: 'Requesting church ID is required (user has no church_id)' };
      }
      const ccRequest = await svc.entities.ChurchConnectRequest.create({
        journey_id: args.journey_id,
        requesting_church_id: requestingChurchId,
        responding_church_id: args.responding_church_id || undefined,
        need_type: args.need_type,
        resource_name: args.resource_name,
        details: args.details || '',
        status: hasRespondingChurch ? 'open' : 'purchase_pending',
      });
      return { request_id: ccRequest.id, status: ccRequest.status };
    }

    case 'search_ministry_resources': {
      const resourceName = (args.resource_name || '').toLowerCase().trim();
      const page = await svc.entities.Church.filter(
        { verification_status: 'verified', available_resources: { $regex: resourceName, $options: 'i' } },
        { limit: 50, fields: ['id', 'name', 'location', 'available_resources', 'leader_name', 'leader_email'] }
      );
      const churches = page.items || page;
      return {
        count: churches.length,
        resource_name: args.resource_name,
        matches: churches.map(c => ({
          church_id: c.id,
          name: c.name,
          location: c.location,
          available_resources: c.available_resources || [],
          leader_name: c.leader_name,
          leader_email: c.leader_email,
        })),
      };
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