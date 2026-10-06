import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const ALLOWED_CAPS = [
  'supports_students',
  'supports_transportation',
  'supports_food',
  'supports_church_planting',
  'supports_resource_sharing',
  'supports_disaster_response',
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, location, website, denomination, statement_of_faith,
            leader_name, leader_email, safeguarding_contact } = body;

    if (!name || !location || !leader_name || !leader_email) {
      return Response.json({ error: 'Missing required fields: name, location, leader_name, leader_email' }, { status: 400 });
    }

    const svc = base44.asServiceRole;

    // Extract only allowed capability booleans — strip any client-supplied verification_status
    const caps = {};
    for (const key of ALLOWED_CAPS) {
      if (typeof body[key] === 'boolean') caps[key] = body[key];
    }

    // Always force verification_status to 'pending' — never trust client-supplied value
    const church = await svc.entities.Church.create({
      name,
      location,
      website: website || undefined,
      denomination: denomination || undefined,
      statement_of_faith: statement_of_faith || undefined,
      leader_name,
      leader_email,
      safeguarding_contact: safeguarding_contact || undefined,
      ...caps,
      verification_status: 'pending',
    });

    // Set the caller as the church admin on their User record (service role)
    await svc.entities.User.update(user.id, {
      app_role: 'church_admin',
      church_id: church.id,
    });

    return Response.json({ success: true, church_id: church.id, verification_status: 'pending' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}