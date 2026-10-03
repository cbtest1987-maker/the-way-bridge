import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, church_id, target_user_id, role, capabilities } = await req.json();
    if (!church_id) return Response.json({ error: 'church_id is required' }, { status: 400 });
    if (caller.app_role !== 'church_admin' || caller.church_id !== church_id) {
      return Response.json({ error: 'Only the admin of this church can do this' }, { status: 403 });
    }

    if (action === 'listMembers') {
      const members = await base44.asServiceRole.entities.User.filter({ church_id });
      const safeMembers = members.map((m) => ({
        id: m.id,
        full_name: m.full_name,
        email: m.email,
        app_role: m.app_role,
        service_roles: m.service_roles || [],
        volunteer_status: m.volunteer_status,
        background_check_status: m.background_check_status || 'none',
        church_approved: m.church_approved || false,
        care_safety_reviewer: m.care_safety_reviewer || false,
        volunteer_capabilities: m.volunteer_capabilities || [],
        is_default_prayer_warrior: m.is_default_prayer_warrior || false
      }));
      return Response.json({ members: safeMembers });
    }

    if (action === 'approveServiceRole') {
      if (!target_user_id) return Response.json({ error: 'target_user_id is required' }, { status: 400 });
      const target = await base44.asServiceRole.entities.User.get(target_user_id);
      if (!target || target.church_id !== church_id) {
        return Response.json({ error: 'User not found in this church' }, { status: 404 });
      }
      await base44.asServiceRole.entities.User.update(target_user_id, { church_approved: true });
      return Response.json({ success: true });
    }

    if (action === 'rejectServiceRole') {
      if (!target_user_id) return Response.json({ error: 'target_user_id is required' }, { status: 400 });
      const target = await base44.asServiceRole.entities.User.get(target_user_id);
      if (!target || target.church_id !== church_id) {
        return Response.json({ error: 'User not found in this church' }, { status: 404 });
      }
      await base44.asServiceRole.entities.User.update(target_user_id, { church_approved: false, service_roles: [] });
      return Response.json({ success: true });
    }

    if (action === 'clearBackgroundCheck' || action === 'failBackgroundCheck') {
      if (!target_user_id) return Response.json({ error: 'target_user_id is required' }, { status: 400 });
      const target = await base44.asServiceRole.entities.User.get(target_user_id);
      if (!target || target.church_id !== church_id) {
        return Response.json({ error: 'User not found in this church' }, { status: 404 });
      }
      const newStatus = action === 'clearBackgroundCheck' ? 'cleared' : 'failed';
      await base44.asServiceRole.entities.User.update(target_user_id, { background_check_status: newStatus });
      return Response.json({ success: true });
    }

    if (action === 'assignCareSafetyReviewer') {
      if (!target_user_id) return Response.json({ error: 'target_user_id is required' }, { status: 400 });
      const target = await base44.asServiceRole.entities.User.get(target_user_id);
      if (!target || target.church_id !== church_id) {
        return Response.json({ error: 'User not found in this church' }, { status: 404 });
      }
      const current = target.care_safety_reviewer || false;
      await base44.asServiceRole.entities.User.update(target_user_id, { care_safety_reviewer: !current });
      return Response.json({ success: true, care_safety_reviewer: !current });
    }

    // Legacy compat
    if (action === 'approveVolunteer' || action === 'rejectVolunteer') {
      if (!target_user_id) return Response.json({ error: 'target_user_id is required' }, { status: 400 });
      const target = await base44.asServiceRole.entities.User.get(target_user_id);
      if (!target || target.church_id !== church_id) {
        return Response.json({ error: 'User not found in this church' }, { status: 404 });
      }
      const newStatus = action === 'approveVolunteer' ? 'approved' : 'none';
      await base44.asServiceRole.entities.User.update(target_user_id, { volunteer_status: newStatus });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}