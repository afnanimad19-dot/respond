// whatsapp-templates — create a template at Meta and sync approval status.
//   { action: 'create', workspace_id, template_id }   → submits to Meta
//   { action: 'sync',   workspace_id }                → pulls statuses
// Meta reviews templates (usually minutes–hours); once APPROVED they can be
// sent to customers even outside the 24-hour service window.
import { adminClient, callerRole, json, preflight } from '../_shared/utils.ts';

const GRAPH = 'https://graph.facebook.com/v20.0';

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const { action, workspace_id, template_id } = await req.json();
    if (!workspace_id) return json({ error: 'workspace_id required' }, 400);

    const caller = await callerRole(req, workspace_id);
    if (!caller) return json({ error: 'not a member of this workspace' }, 403);

    const admin = adminClient();
    const { data: channel } = await admin
      .from('channels')
      .select('waba_id, access_token')
      .eq('workspace_id', workspace_id)
      .eq('type', 'whatsapp')
      .maybeSingle();
    if (!channel?.waba_id || !channel.access_token) {
      return json({ error: 'no WhatsApp Business Account connected' }, 400);
    }
    const auth = { Authorization: `Bearer ${channel.access_token}` };

    if (action === 'create') {
      const { data: tpl } = await admin
        .from('message_templates')
        .select('*')
        .eq('id', template_id)
        .maybeSingle();
      if (!tpl) return json({ error: 'template not found' }, 404);

      const res = await fetch(`${GRAPH}/${channel.waba_id}/message_templates`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tpl.name,
          language: tpl.language,
          category: 'UTILITY',
          components: [{ type: 'BODY', text: tpl.body }]
        })
      });
      const result = await res.json();
      if (!res.ok) {
        await admin.from('message_templates').update({ status: 'rejected' }).eq('id', tpl.id);
        return json({ error: result?.error?.message ?? 'create failed' }, 502);
      }
      return json({ ok: true, meta_id: result.id });
    }

    // sync: pull statuses from Meta and update our rows by name+language
    const res = await fetch(
      `${GRAPH}/${channel.waba_id}/message_templates?fields=name,language,status&limit=200`,
      { headers: auth }
    );
    const result = await res.json();
    if (!res.ok) return json({ error: result?.error?.message ?? 'sync failed' }, 502);

    let updated = 0;
    for (const t of result.data ?? []) {
      const status =
        t.status === 'APPROVED' ? 'approved' : t.status === 'REJECTED' ? 'rejected' : 'pending';
      const { count } = await admin
        .from('message_templates')
        .update({ status }, { count: 'exact' })
        .eq('workspace_id', workspace_id)
        .eq('name', t.name)
        .eq('language', t.language);
      updated += count ?? 0;
    }
    return json({ ok: true, updated });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
