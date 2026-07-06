// whatsapp-send — deliver an agent's message to the customer via the
// WhatsApp Cloud API. Caller must be a member of the conversation's
// workspace. Internal comments are refused outright: they must never
// reach the customer.
import { adminClient, callerRole, json, preflight } from '../_shared/utils.ts';

const GRAPH = 'https://graph.facebook.com/v20.0';

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const { conversation_id, text, template } = await req.json();
    if (!conversation_id || (!text && !template)) {
      return json({ error: 'conversation_id and text or template required' }, 400);
    }

    const admin = adminClient();
    const { data: convo } = await admin
      .from('conversations')
      .select('id, workspace_id, contacts ( phone )')
      .eq('id', conversation_id)
      .maybeSingle();
    if (!convo) return json({ error: 'conversation not found' }, 404);

    const caller = await callerRole(req, convo.workspace_id);
    if (!caller) return json({ error: 'not a member of this workspace' }, 403);

    const { data: channel } = await admin
      .from('channels')
      .select('phone_number_id, access_token')
      .eq('workspace_id', convo.workspace_id)
      .eq('type', 'whatsapp')
      .maybeSingle();
    if (!channel?.phone_number_id || !channel.access_token) {
      return json({ error: 'no WhatsApp channel connected for this workspace' }, 400);
    }

    const to = String((convo as any).contacts?.phone ?? '').replace(/[^\d]/g, '');
    if (!to) return json({ error: 'contact has no phone number' }, 400);

    const body = template
      ? {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: { name: template.name, language: { code: template.language ?? 'en' } }
        }
      : { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } };

    const res = await fetch(`${GRAPH}/${channel.phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${channel.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (!res.ok) return json({ error: result?.error?.message ?? 'send failed' }, 502);

    return json({ ok: true, wa_message_id: result?.messages?.[0]?.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
