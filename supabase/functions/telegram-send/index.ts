// telegram-send — deliver an agent's message via the Telegram Bot API.
// The chat id is stored on the contact as note "tg:<chat_id>".
import { adminClient, callerRole, json, preflight } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const { conversation_id, text } = await req.json();
    if (!conversation_id || !text) return json({ error: 'conversation_id and text required' }, 400);

    const admin = adminClient();
    const { data: convo } = await admin
      .from('conversations')
      .select('id, workspace_id, contacts ( note )')
      .eq('id', conversation_id)
      .maybeSingle();
    if (!convo) return json({ error: 'conversation not found' }, 404);

    const caller = await callerRole(req, convo.workspace_id);
    if (!caller) return json({ error: 'not a member of this workspace' }, 403);

    const chatId = String((convo as any).contacts?.note ?? '').replace(/^tg:/, '');
    if (!chatId) return json({ error: 'contact has no telegram chat id' }, 400);

    const { data: channel } = await admin
      .from('channels')
      .select('access_token')
      .eq('workspace_id', convo.workspace_id)
      .eq('type', 'telegram')
      .maybeSingle();
    if (!channel?.access_token) return json({ error: 'no Telegram bot connected' }, 400);

    const res = await fetch(`https://api.telegram.org/bot${channel.access_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    const result = await res.json();
    if (!result.ok) return json({ error: result.description ?? 'send failed' }, 502);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
