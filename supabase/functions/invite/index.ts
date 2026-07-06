// invite — email a teammate into a workspace with a role.
// Caller must be owner or manager of that workspace (checked server-side,
// on top of the RLS policy). Uses Supabase's built-in invitation email.
import { adminClient, callerRole, json, preflight } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const { workspace_id, email, role } = await req.json();
    if (!workspace_id || !email) return json({ error: 'workspace_id and email required' }, 400);
    const allowedRoles = ['owner', 'manager', 'doctor', 'agent'];
    const memberRole = allowedRoles.includes(role) ? role : 'agent';

    const caller = await callerRole(req, workspace_id);
    if (!caller || !['owner', 'manager'].includes(caller.role)) {
      return json({ error: 'Only owners and managers can invite teammates' }, 403);
    }

    const admin = adminClient();

    // Reuse the account if this email already exists in shared auth
    // (e.g. the person already uses PyDent AI) — otherwise send the invite.
    let userId: string | null = null;
    const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { invited_to_workspace: workspace_id }
    });
    if (invErr) {
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users.find(
        (u) => u.email?.toLowerCase() === String(email).toLowerCase()
      );
      if (!existing) return json({ error: invErr.message }, 400);
      userId = existing.id;
    } else {
      userId = invited.user.id;
    }

    const { error: memErr } = await admin.from('workspace_members').upsert({
      workspace_id,
      user_id: userId,
      role: memberRole,
      invited_email: String(email).toLowerCase()
    });
    if (memErr) return json({ error: memErr.message }, 400);

    return json({ ok: true, user_id: userId });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
