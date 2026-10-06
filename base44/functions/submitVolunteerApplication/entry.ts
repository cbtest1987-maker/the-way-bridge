import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const VALID_ROLES = ['prayer_warrior', 'care_volunteer', 'church_connect_coordinator'];
const VALID_CAPS = ['transportation', 'food', 'resources', 'building', 'church_planting', 'fundraising', 'disaster'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { church_id, role, capabilities } = body;
    if (!church_id) return Response.json({ error: 'church_id is required' }, { status: 400 });
    if (!VALID_ROLES.includes(role)) return Response.json({ error: 'Invalid role' }, { status: 400 });

    const svc = base44.asServiceRole;

    // Verify the church exists and is verified
    const church = await svc.entities.Church.get(church_id);
    if (!church) return Response.json({ error: 'Church not found' }, { status: 404 });
    if (church.verification_status !== 'verified') {
      return Response.json({ error: 'Church is not verified' }, { status: 400 });
    }

    // Filter capabilities to valid values only
    const validCaps = role === 'care_volunteer'
      ? (Array.isArray(capabilities) ? capabilities.filter(c => VALID_CAPS.includes(c)) : [])
      : [];

    // Create or update VolunteerApplication — vetting fields always reset to defaults
    // These fields are NEVER accepted from the client; only church admins can change them
    const existing = await svc.entities.VolunteerApplication.filter(
      { user_id: user.id, church_id },
      { limit: 1 }
    );
    const existingList = Array.isArray(existing) ? existing : (existing.items || []);

    const vaData = {
      user_id: user.id,
      church_id,
      role,
      capabilities: validCaps,
      church_approved: false,
      background_check_status: role === 'care_volunteer' ? 'pending' : 'none',
      care_safety_reviewer: false,
      is_default_prayer_warrior: false,
      status: 'pending',
    };

    let va;
    if (existingList.length > 0) {
      // Preserve existing admin-set vetting fields if the user is re-submitting for the same role
      const existingVA = existingList[0];
      const keepVetting = existingVA.role === role && existingVA.church_approved;
      va = await svc.entities.VolunteerApplication.update(existingVA.id, {
        ...vaData,
        ...(keepVetting ? {
          church_approved: existingVA.church_approved,
          background_check_status: existingVA.background_check_status,
          care_safety_reviewer: existingVA.care_safety_reviewer,
          is_default_prayer_warrior: existingVA.is_default_prayer_warrior,
          status: existingVA.status,
        } : {}),
      });
    } else {
      va = await svc.entities.VolunteerApplication.create(vaData);
    }

    // Also update non-sensitive User fields for UI display (these are not security-critical)
    // NOTE: church_id is NOT written here — it is admin-managed and only set by churchTeam
    // when a verified church leader approves the volunteer application.
    await svc.entities.User.update(user.id, {
      service_roles: [role],
      volunteer_capabilities: validCaps,
    });

    return Response.json({ success: true, application_id: va.id, status: va.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}