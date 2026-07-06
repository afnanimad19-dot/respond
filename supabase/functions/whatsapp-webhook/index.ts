// whatsapp-webhook — Meta calls this endpoint.
//   GET  = verification handshake (hub.challenge echo)
//   POST = inbound messages + delivery statuses
//
// Captures Click-to-WhatsApp ad attribution: messages carry a `referral`
// object (source, headline, ad id) when the customer tapped an ad — this
// fills the contact's ad_platform / ad_name / ad_campaign fields, which the
// app shows as the "Came from ad" banner.
import { adminClient, json } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // --- Meta verification handshake ---
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge') ?? '';
    if (mode === 'subscribe' && token === Deno.env.get('WHATSAPP_VERIFY_TOKEN')) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const admin = adminClient();
  const payload = await req.json().catch(() => null);
  if (!payload?.entry) return json({ ok: true });

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      // Which workspace does this WhatsApp number belong to?
      const { data: channel } = await admin
        .from('channels')
        .select('id, workspace_id')
        .eq('type', 'whatsapp')
        .eq('phone_number_id', phoneNumberId)
        .maybeSingle();
      if (!channel) continue;

      const profileNames: Record<string, string> = {};
      for (const c of value.contacts ?? []) {
        profileNames[c.wa_id] = c.profile?.name ?? c.wa_id;
      }

      for (const msg of value.messages ?? []) {
        const waId: string = msg.from;
        const phone = `+${waId}`;

        // Upsert contact by phone within this workspace.
        let { data: contact } = await admin
          .from('contacts')
          .select('id')
          .eq('workspace_id', channel.workspace_id)
          .eq('phone', phone)
          .maybeSingle();

        const adFields = msg.referral
          ? {
              ad_platform: `Meta · ${msg.referral.source_type ?? 'ad'}`,
              ad_name: msg.referral.headline ?? msg.referral.body ?? msg.referral.source_id ?? '',
              ad_campaign: msg.referral.source_url ?? msg.referral.source_id ?? null
            }
          : {};

        if (!contact) {
          const { data: created } = await admin
            .from('contacts')
            .insert({
              workspace_id: channel.workspace_id,
              name: profileNames[waId] ?? phone,
              phone,
              channel: 'whatsapp',
              ...adFields
            })
            .select('id')
            .single();
          contact = created;
        } else if (msg.referral) {
          await admin.from('contacts').update(adFields).eq('id', contact.id);
        }
        if (!contact) continue;

        // Find or open a conversation.
        let { data: convo } = await admin
          .from('conversations')
          .select('id, unread')
          .eq('contact_id', contact.id)
          .neq('status', 'closed')
          .order('last_message_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!convo) {
          const { data: created } = await admin
            .from('conversations')
            .insert({ workspace_id: channel.workspace_id, contact_id: contact.id, status: 'open' })
            .select('id, unread')
            .single();
          convo = created;
        }
        if (!convo) continue;

        // Message body per type.
        let kind = 'text';
        let body = '';
        switch (msg.type) {
          case 'text':
            body = msg.text?.body ?? '';
            break;
          case 'audio':
          case 'voice':
            kind = 'audio';
            body = 'Voice message';
            break;
          case 'image':
          case 'video':
          case 'document':
          case 'sticker':
            kind = 'file';
            body = msg[msg.type]?.filename ?? msg[msg.type]?.caption ?? `(${msg.type})`;
            break;
          default:
            kind = 'unsupported';
            body = 'Unsupported message';
        }

        await admin.from('messages').insert({
          conversation_id: convo.id,
          kind,
          from_contact: true,
          body
        });
        await admin
          .from('conversations')
          .update({
            last_message_at: new Date().toISOString(),
            unread: (convo.unread ?? 0) + 1,
            status: 'open'
          })
          .eq('id', convo.id);
      }
      // Delivery/read statuses (value.statuses) could update per-message
      // state here; kept minimal for now.
    }
  }

  return json({ ok: true });
});
