import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, church_id, target_user_id, role, capabilities } = await req.json();
    if (!church_id) return Response.json({ error: 'church_id is required' }, { status: 400 });

    const svc = base44.asServiceRole;

    // Verify the church exists and is verified — pending self-registered churches cannot manage volunteers
    const church = await svc.entities.Church.get(church_id);
    if (!church) return Response.json({ error: 'Church not found' }, { status: 404 });
    if (church.verification_status !== 'verified') {
      return Response.json({ error: 'Church is not verified' }, { status: 403 });
    }
    // Verify the caller is the church leader (email matches leader_email) or a platform admin
    if (caller.email !== church.leader_email && caller.role !== 'admin') {
      return Response.json({ error: 'Only the verified church leader can perform this action' }, { status: 403 });
    }

    async function getOrCreateVA(userId, churchId, defaultRole) {
      const existing = await svc.entities.VolunteerApplication.filter({ user_id: userId, church_id: churchId }, { limit: 1 });
      const list = Array.isArray(existing) ? existing : (existing.items || []);
      if (list.length > 0) return list[0];
      return await svc.entities.VolunteerApplication.create({
        user_id: userId,
        church_id: churchId,
        role: defaultRole || 'prayer_warrior',
        status: 'pending',
        church_approved: false,
        background_check_status: 'none',
        care_safety_reviewer: false,
        is_default_prayer_warrior: false,
      });
    }

    if (action === 'listMembers') {
      const apps = await svc.entities.VolunteerApplication.filter({ church_id }, { sort: '-created_date', limit: 100 });
      const appList = Array.isArray(apps) ? apps : (apps.items || []);
      const userIds = appList.map(a => a.user_id);
      const users = await Promise.all(userIds.map(id => svc.entities.User.get(id)));
      const safeMembers = appList.map((va, i) => ({
        id: va.user_id,
        full_name: users[i]?.full_name || 'Unknown',
        email: users[i]?.email || '',
        service_roles: va.role ? [va.role] : [],
        background_check_status: va.background_check_status || 'none',
        church_approved: va.church_approved || false,
        care_safety_reviewer: va.care_safety_reviewer || false,
        volunteer_capabilities: va.capabilities || [],
        is_default_prayer_warrior: va.is_default_prayer_warrior || false
      }));
      return Response.json({ members: safeMembers });
    }

    if (action === 'approveServiceRole') {
      if (!target_user_id) return Response.json({ error: 'target_user_id is required' }, { status: 400 });
      const va = await getOrCreateVA(target_user_id, church_id, role);
      // church_id is admin-managed — only written to User when the church leader approves
      await svc.entities.User.update(target_user_id, { church_approved: true, church_id });
      await svc.entities.VolunteerApplication.update(va.id, { church_approved: true, status: 'approved' });
      return Response.json({ success: true });
    }

    if (action === 'rejectServiceRole') {
      if (!target_user_id) return Response.json({ error: 'target_user_id is required' }, { status: 400 });
      const va = await getOrCreateVA(target_user_id, church_id);
      await svc.entities.User.update(target_user_id, { church_approved: false, service_roles: [] });
      await svc.entities.VolunteerApplication.update(va.id, { church_approved: false, status: 'rejected' });
      return Response.json({ success: true });
    }

    if (action === 'clearBackgroundCheck' || action === 'failBackgroundCheck') {
      if (!target_user_id) return Response.json({ error: 'target_user_id is required' }, { status: 400 });
      const va = await getOrCreateVA(target_user_id, church_id);
      const newStatus = action === 'clearBackgroundCheck' ? 'cleared' : 'failed';
      await svc.entities.User.update(target_user_id, { background_check_status: newStatus });
      await svc.entities.VolunteerApplication.update(va.id, { background_check_status: newStatus });
      return Response.json({ success: true });
    }

    if (action === 'assignCareSafetyReviewer') {
      if (!target_user_id) return Response.json({ error: 'target_user_id is required' }, { status: 400 });
      if (target_user_id === caller.id) {
        return Response.json({ error: 'Cannot assign Care & Safety Reviewer to yourself' }, { status: 403 });
      }
      const va = await getOrCreateVA(target_user_id, church_id);
      const current = va.care_safety_reviewer || false;
      await svc.entities.User.update(target_user_id, { care_safety_reviewer: !current });
      await svc.entities.VolunteerApplication.update(va.id, { care_safety_reviewer: !current });
      return Response.json({ success: true, care_safety_reviewer: !current });
    }

    // Legacy compat
    if (action === 'approveVolunteer' || action === 'rejectVolunteer') {
      if (!target_user_id) return Response.json({ error: 'target_user_id is required' }, { status: 400 });
      const va = await getOrCreateVA(target_user_id, church_id);
      const newStatus = action === 'approveVolunteer' ? 'approved' : 'none';
      await svc.entities.User.update(target_user_id, { volunteer_status: newStatus });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}