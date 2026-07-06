// All Supabase reads/writes/Realtime for live mode. Every function is a
// safe no-op when Supabase isn't configured, so demo mode never breaks.
// UI code should never import the supabase client directly — only this file.

import { supabase } from './supabase';
import {
  ChannelType,
  Contact,
  Conversation,
  ConversationStatus,
  LifecycleStage,
  Message,
  MessageTemplate,
  NotificationItem,
  Role,
  TeamMember
} from './types';

const PALETTE = ['#1F6BFF', '#17A2B8', '#F79009', '#12B76A', '#F6668D', '#5E9BF7'];
const colorFor = (seed: string) =>
  PALETTE[Math.abs([...seed].reduce((a, c) => a + c.charCodeAt(0), 0)) % PALETTE.length];

// ---- row mappers -----------------------------------------------------------

const mapMember = (row: any): TeamMember => ({
  id: row.user_id,
  name: row.profiles?.name || row.invited_email || 'Teammate',
  email: row.invited_email ?? '',
  role: row.role as Role,
  online: row.profiles?.online ?? false,
  color: row.profiles?.color ?? colorFor(row.user_id),
  pending: !row.accepted_at && !!row.invited_email
});

const mapStage = (row: any): LifecycleStage => ({
  id: row.id,
  name: row.name,
  color: row.color,
  emoji: row.emoji ?? undefined,
  description: row.description ?? undefined
});

const mapContact = (row: any): Contact => ({
  id: row.id,
  name: row.name,
  phone: row.phone ?? undefined,
  handle: row.handle ?? undefined,
  channel: row.channel as ChannelType,
  color: colorFor(row.id),
  lifecycleStageId: row.lifecycle_stage_id,
  note: row.note ?? undefined,
  adSource: row.ad_platform
    ? { platform: row.ad_platform, adName: row.ad_name ?? '', campaign: row.ad_campaign ?? undefined }
    : undefined
});

const mapConversation = (row: any): Conversation => ({
  id: row.id,
  contactId: row.contact_id,
  status: row.status as ConversationStatus,
  assigneeId: row.assignee_id,
  unread: row.unread ?? 0,
  lastMessageAt: row.last_message_at
});

const mapMessage = (row: any): Message => ({
  id: row.id,
  conversationId: row.conversation_id,
  kind: row.kind,
  from: row.from_contact ? 'contact' : row.sender_user_id ?? 'contact',
  text: row.body,
  at: row.created_at,
  mentions: row.mentions ?? []
});

const mapTemplate = (row: any): MessageTemplate => ({
  id: row.id,
  name: row.name,
  language: row.language,
  body: row.body,
  status: row.status
});

const mapNotification = (row: any): NotificationItem => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  body: row.body ?? undefined,
  at: row.created_at,
  archived: row.archived,
  conversationId: row.conversation_id ?? undefined
});

// ---- initial load ------------------------------------------------------------

export interface WorkspaceData {
  team: TeamMember[];
  lifecycle: LifecycleStage[];
  contacts: Contact[];
  conversations: Conversation[];
  messages: Message[];
  templates: MessageTemplate[];
  notifications: NotificationItem[];
  snippets: { shortcut: string; text: string }[];
}

export async function loadWorkspace(workspaceId: string): Promise<WorkspaceData | null> {
  if (!supabase) return null;
  const [members, stages, contacts, convos, templates, notifs, snippets] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('user_id, role, invited_email, accepted_at, profiles ( name, color, online )')
      .eq('workspace_id', workspaceId),
    supabase.from('lifecycle_stages').select('*').eq('workspace_id', workspaceId).order('position'),
    supabase.from('contacts').select('*').eq('workspace_id', workspaceId),
    supabase.from('conversations').select('*').eq('workspace_id', workspaceId),
    supabase.from('message_templates').select('*').eq('workspace_id', workspaceId),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('snippets').select('shortcut, body').eq('workspace_id', workspaceId)
  ]);

  const conversationIds = (convos.data ?? []).map((c: any) => c.id);
  const messages = conversationIds.length
    ? await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at')
    : { data: [] };

  return {
    team: (members.data ?? []).map(mapMember),
    lifecycle: (stages.data ?? []).map(mapStage),
    contacts: (contacts.data ?? []).map(mapContact),
    conversations: (convos.data ?? []).map(mapConversation),
    messages: (messages.data ?? []).map(mapMessage),
    templates: (templates.data ?? []).map(mapTemplate),
    notifications: (notifs.data ?? []).map(mapNotification),
    snippets: (snippets.data ?? []).map((s: any) => ({ shortcut: s.shortcut, text: s.body }))
  };
}

// ---- realtime -----------------------------------------------------------------

export interface LiveHandlers {
  onMessage: (m: Message) => void;
  onConversation: (c: Conversation) => void;
  onContact: (c: Contact) => void;
  onNotification: (n: NotificationItem) => void;
  onTemplate: (t: MessageTemplate) => void;
}

/** Subscribe to workspace changes; returns an unsubscribe function. */
export function subscribeWorkspace(workspaceId: string, h: LiveHandlers): () => void {
  const client = supabase;
  if (!client) return () => {};
  const ch = client
    .channel(`ws-${workspaceId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (p) => h.onMessage(mapMessage(p.new))
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'conversations', filter: `workspace_id=eq.${workspaceId}` },
      (p) => p.new && h.onConversation(mapConversation(p.new))
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'contacts', filter: `workspace_id=eq.${workspaceId}` },
      (p) => p.new && h.onContact(mapContact(p.new))
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      (p) => h.onNotification(mapNotification(p.new))
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'message_templates', filter: `workspace_id=eq.${workspaceId}` },
      (p) => p.new && h.onTemplate(mapTemplate(p.new))
    )
    .subscribe();
  return () => {
    client.removeChannel(ch);
  };
}

// ---- writes ---------------------------------------------------------------------
// Fire-and-forget mirrors of the optimistic local updates. Errors are logged,
// not thrown — the UI already updated and Realtime will reconcile.

const swallow = (label: string) => (e: unknown) => console.warn(`[api] ${label}:`, e);

export const db = {
  async sendMessage(
    workspaceId: string,
    m: { id: string; conversationId: string; kind: string; senderId: string; text: string; mentions: string[] },
    contactChannel?: ChannelType
  ) {
    if (!supabase) return;
    await supabase
      .from('messages')
      .insert({
        id: m.id,
        conversation_id: m.conversationId,
        kind: m.kind,
        sender_user_id: m.senderId,
        from_contact: false,
        body: m.text,
        mentions: m.mentions
      })
      .then(({ error }) => error && swallow('sendMessage')(error));
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', m.conversationId);
    // Deliver to the real channel — comments are internal and NEVER sent out.
    if (m.kind === 'text' && contactChannel === 'whatsapp') {
      supabase.functions
        .invoke('whatsapp-send', { body: { conversation_id: m.conversationId, message_id: m.id, text: m.text } })
        .catch(swallow('whatsapp-send'));
    }
    if (m.kind === 'text' && contactChannel === 'telegram') {
      supabase.functions
        .invoke('telegram-send', { body: { conversation_id: m.conversationId, message_id: m.id, text: m.text } })
        .catch(swallow('telegram-send'));
    }
  },

  markRead(conversationId: string) {
    supabase?.from('conversations').update({ unread: 0 }).eq('id', conversationId)
      .then(({ error }) => error && swallow('markRead')(error));
  },

  setStatus(conversationId: string, status: ConversationStatus) {
    supabase?.from('conversations').update({ status }).eq('id', conversationId)
      .then(({ error }) => error && swallow('setStatus')(error));
  },

  assign(conversationId: string, memberId: string | null) {
    supabase?.from('conversations').update({ assignee_id: memberId }).eq('id', conversationId)
      .then(({ error }) => error && swallow('assign')(error));
  },

  setContactStage(contactId: string, stageId: string | null) {
    supabase?.from('contacts').update({ lifecycle_stage_id: stageId }).eq('id', contactId)
      .then(({ error }) => error && swallow('setContactStage')(error));
  },

  addStage(workspaceId: string, s: { id: string; name: string; color: string; description?: string; emoji?: string }, position: number) {
    supabase?.from('lifecycle_stages')
      .insert({ id: s.id, workspace_id: workspaceId, name: s.name, color: s.color, description: s.description, emoji: s.emoji, position })
      .then(({ error }) => error && swallow('addStage')(error));
  },

  updateStage(id: string, patch: Partial<LifecycleStage>) {
    supabase?.from('lifecycle_stages')
      .update({ name: patch.name, color: patch.color, description: patch.description, emoji: patch.emoji })
      .eq('id', id)
      .then(({ error }) => error && swallow('updateStage')(error));
  },

  removeStage(id: string) {
    supabase?.from('lifecycle_stages').delete().eq('id', id)
      .then(({ error }) => error && swallow('removeStage')(error));
  },

  saveStageOrder(stages: LifecycleStage[]) {
    const client = supabase;
    if (!client) return;
    stages.forEach((s, i) => {
      client.from('lifecycle_stages').update({ position: i }).eq('id', s.id)
        .then(({ error }) => error && swallow('saveStageOrder')(error));
    });
  },

  /** Email invitation via the `invite` Edge Function (owner/manager only). */
  invite(workspaceId: string, email: string, role: Role) {
    supabase?.functions
      .invoke('invite', { body: { workspace_id: workspaceId, email, role } })
      .catch(swallow('invite'));
  },

  setMemberRole(workspaceId: string, userId: string, role: Role) {
    supabase?.from('workspace_members').update({ role })
      .eq('workspace_id', workspaceId).eq('user_id', userId)
      .then(({ error }) => error && swallow('setMemberRole')(error));
  },

  removeMember(workspaceId: string, userId: string) {
    supabase?.from('workspace_members').delete()
      .eq('workspace_id', workspaceId).eq('user_id', userId)
      .then(({ error }) => error && swallow('removeMember')(error));
  },

  /** Creates the template at Meta (pending) via Edge Function. */
  addTemplate(workspaceId: string, t: { id: string; name: string; language: string; body: string }) {
    if (!supabase) return;
    supabase.from('message_templates')
      .insert({ id: t.id, workspace_id: workspaceId, name: t.name, language: t.language, body: t.body, status: 'pending' })
      .then(({ error }) => error && swallow('addTemplate')(error));
    supabase.functions
      .invoke('whatsapp-templates', { body: { action: 'create', workspace_id: workspaceId, template_id: t.id } })
      .catch(swallow('whatsapp-templates'));
  },

  archiveNotification(id: string) {
    supabase?.from('notifications').update({ archived: true }).eq('id', id)
      .then(({ error }) => error && swallow('archiveNotification')(error));
  },

  archiveAllNotifications() {
    supabase?.from('notifications').update({ archived: true }).eq('archived', false)
      .then(({ error }) => error && swallow('archiveAll')(error));
  },

  addNotification(workspaceId: string, n: { id: string; userId: string; kind: string; title: string; body?: string; conversationId?: string }) {
    supabase?.from('notifications')
      .insert({
        id: n.id, workspace_id: workspaceId, user_id: n.userId, kind: n.kind,
        title: n.title, body: n.body, conversation_id: n.conversationId
      })
      .then(({ error }) => error && swallow('addNotification')(error));
  }
};

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
