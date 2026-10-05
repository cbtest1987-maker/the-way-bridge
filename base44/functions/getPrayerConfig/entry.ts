import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const timeoutMinutes = parseInt(secrets.get('PRAYER_ASSIGNMENT_TIMEOUT_MINUTES') || '720', 10);
    return Response.json({ timeout_minutes: timeoutMinutes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}