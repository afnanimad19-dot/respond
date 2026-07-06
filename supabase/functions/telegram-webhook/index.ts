// telegram-webhook — Telegram Bot API updates land here.
// Set it up once per bot:
//   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<this function URL>?secret=<WHATSAPP_VERIFY_TOKEN>
// The bot token itself lives in channels.access_token for the workspace.
import { adminClient, json } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const url = new URL(req.url);
  if (url.searchParams.get('secret') !== Deno.env.get('WHATSAPP_VERIFY_TOKEN')) {
    return json({ error: 'forbidden' }, 403);
  }

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  if (!msg?.chat?.id) return json({ ok: true });

  const admin = adminClient();
  // channel_hint: pass ?channel=<channels.id> in the webhook URL when a
  // workspace has several bots; otherwise the first telegram channel wins.
  const channelId = url.searchParams.get('channel');
  const q = admin.from('channels').select('id, workspace_id').eq('type', 'telegram');
  const { data: channel } = channelId
    ? await q.eq('id', channelId).maybeSingle()
    : await q.limit(1).maybeSingle();
  if (!channel) return json({ ok: true });

  const handle = msg.from?.username ? `@${msg.from.username}` : String(msg.chat.id);
  const name =
    [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || handle;

  let { data: contact } = await admin
    .from('contacts')
    .select('id')
    .eq('workspace_id', channel.workspace_id)
    .eq('handle', handle)
    .maybeSingle();
  if (!contact) {
    const { data: created } = await admin
      .from('contacts')
      .insert({ workspace_id: channel.workspace_id, name, handle, channel: 'telegram', note: `tg:${msg.chat.id}` })
      .select('id')
      .single();
    contact = created;
  }
  if (!contact) return json({ ok: true });

  let { data: convo } = await admin
    .from('conversations')
    .select('id, unread')
    .eq('contact_id', contact.id)
    .neq('status', 'closed')
    .limit(1)
    .maybeSingle();
  if (!convo) {
    const { data: created } = await admin
      .from('conversations')
      .insert({ workspace_id: channel.workspace_id, contact_id: contact.id })
      .select('id, unread')
      .single();
    convo = created;
  }
  if (!convo) return json({ ok: true });

  const body = msg.text ?? (msg.voice ? 'Voice message' : msg.document?.file_name ?? '(media)');
  const kind = msg.text ? 'text' : msg.voice ? 'audio' : 'file';

  await admin.from('messages').insert({ conversation_id: convo.id, kind, from_contact: true, body });
  await admin
    .from('conversations')
    .update({ last_message_at: new Date().toISOString(), unread: (convo.unread ?? 0) + 1, status: 'open' })
    .eq('id', convo.id);

  return json({ ok: true });
});
