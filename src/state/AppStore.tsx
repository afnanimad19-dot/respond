import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import {
  Contact,
  Conversation,
  ConversationStatus,
  LifecycleStage,
  Message,
  MessageTemplate,
  NotificationItem,
  Role,
  Session,
  Snippet,
  TeamMember
} from '../lib/types';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { db, loadWorkspace, newId, subscribeWorkspace } from '../lib/api';
import {
  mockContacts,
  mockConversations,
  mockLifecycle,
  mockMessages,
  mockNotifications,
  mockSnippets,
  mockTeam,
  mockTemplates
} from '../data/mock';

const SESSION_KEY = 'responde.session';

interface Store {
  session: Session | null;
  booting: boolean;
  supabaseConfigured: boolean;
  signIn: (email: string, password: string, workspace: string) => Promise<string | null>;
  signOut: () => void;

  team: TeamMember[];
  lifecycle: LifecycleStage[];
  contacts: Contact[];
  conversations: Conversation[];
  messages: Message[];

  contactById: (id: string) => Contact | undefined;
  memberById: (id: string) => TeamMember | undefined;
  stageById: (id: string | null) => LifecycleStage | undefined;
  messagesFor: (conversationId: string) => Message[];
  lastMessageFor: (conversationId: string) => Message | undefined;

  sendMessage: (
    conversationId: string,
    text: string,
    kind: 'text' | 'comment' | 'audio' | 'file',
    mentions?: string[]
  ) => void;
  markRead: (conversationId: string) => void;
  setStatus: (conversationId: string, status: ConversationStatus) => void;
  assign: (conversationId: string, memberId: string | null) => void;
  setContactStage: (contactId: string, stageId: string | null) => void;
  advanceStage: (contactId: string) => void;

  snippets: Snippet[];
  templates: MessageTemplate[];
  addTemplate: (name: string, language: string, body: string) => void;

  notifications: NotificationItem[];
  archiveNotification: (id: string) => void;
  archiveAllNotifications: () => void;

  addStage: (name: string, color: string, description?: string, emoji?: string) => void;
  updateStage: (id: string, patch: Partial<LifecycleStage>) => void;
  removeStage: (id: string) => void;
  moveStage: (id: string, dir: -1 | 1) => void;

  inviteMember: (email: string, role: Role) => void;
  setMemberRole: (id: string, role: Role) => void;
  removeMember: (id: string) => void;
}

const Ctx = createContext<Store | null>(null);

// Client-generated ids (uuid in live mode) so optimistic local state and the
// database row share the same id.
const nextId = (_prefix?: string) => newId();

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);

  const [team, setTeam] = useState<TeamMember[]>(mockTeam);
  const [lifecycle, setLifecycle] = useState<LifecycleStage[]>(mockLifecycle);
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [templates, setTemplates] = useState<MessageTemplate[]>(mockTemplates);
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications);
  const [snippets, setSnippets] = useState(mockSnippets);

  // Live mode = Supabase configured AND signed in with a real account.
  const live = supabaseConfigured && !!session && !session.demo;
  const wsId = session?.workspace.id ?? '';

  // Load real workspace data + subscribe to Realtime when live.
  useEffect(() => {
    if (!live || !wsId) return;
    let cancelled = false;

    loadWorkspace(wsId).then((data) => {
      if (!data || cancelled) return;
      if (data.team.length) setTeam(data.team);
      if (data.lifecycle.length) setLifecycle(data.lifecycle);
      setContacts(data.contacts);
      setConversations(data.conversations);
      setMessages(data.messages);
      setTemplates(data.templates);
      setNotifications(data.notifications);
      if (data.snippets.length) setSnippets(data.snippets);
    });

    const unsubscribe = subscribeWorkspace(wsId, {
      onMessage: (m) =>
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m])),
      onConversation: (c) =>
        setConversations((prev) => {
          const i = prev.findIndex((x) => x.id === c.id);
          if (i < 0) return [...prev, c];
          const next = [...prev];
          next[i] = c;
          return next;
        }),
      onContact: (c) =>
        setContacts((prev) => {
          const i = prev.findIndex((x) => x.id === c.id);
          if (i < 0) return [...prev, c];
          const next = [...prev];
          next[i] = c;
          return next;
        }),
      onNotification: (n) =>
        setNotifications((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev])),
      onTemplate: (t) =>
        setTemplates((prev) => {
          const i = prev.findIndex((x) => x.id === t.id);
          if (i < 0) return [...prev, t];
          const next = [...prev];
          next[i] = t;
          return next;
        })
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [live, wsId]);

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        setSession(JSON.parse(raw));
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setBooting(false);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, workspace: string): Promise<string | null> => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !password) return 'Please enter your email and password.';

      if (supabaseConfigured && supabase) {
        // Same credentials the user already has in PyDent / other LHDM
        // software — Supabase auth is shared across the products.
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password
        });
        if (error) return error.message;

        // Match the workspace the user typed against their memberships.
        // Each workspace carries the product it came from (PyDent, PyHealth,
        // ...) via products.slug — one shared schema for every software.
        const { data: memberships } = await supabase
          .from('workspace_members')
          .select('workspace_id, role, workspaces ( id, name, product_slug, products ( name ) )')
          .eq('user_id', data.user.id);

        const rows = (memberships ?? []) as any[];
        const wanted = workspace.trim().toLowerCase();
        const match =
          rows.find(
            (r) =>
              r.workspaces &&
              (String(r.workspaces.id).toLowerCase() === wanted ||
                String(r.workspaces.name).toLowerCase() === wanted)
          ) ?? rows[0];

        if (!match || !match.workspaces) {
          return 'No workspace found for this account. Check your workspace name or ID.';
        }

        const s: Session = {
          userId: data.user.id,
          email: trimmed,
          name: (data.user.user_metadata?.name as string) ?? trimmed.split('@')[0],
          workspace: {
            id: match.workspaces.id,
            name: match.workspaces.name,
            sourceApp:
              match.workspaces.products?.name ?? match.workspaces.product_slug ?? 'PyDent'
          },
          demo: false
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(s));
        setSession(s);
        return null;
      }

      // Demo mode — no backend configured. Any credentials sign into the
      // sample PyDent workspace so the app can be explored end to end.
      const s: Session = {
        userId: 'me',
        email: trimmed,
        name: trimmed
          .split('@')[0]
          .split(/[._-]/)
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' '),
        workspace: {
          id: 'demo',
          name: workspace.trim() || 'PyDent Clinic',
          sourceApp: 'PyDent'
        },
        demo: true
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      setSession(s);
      return null;
    },
    []
  );

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    if (supabaseConfigured && supabase) supabase.auth.signOut();
    setSession(null);
  }, []);

  const contactById = useCallback((id: string) => contacts.find((c) => c.id === id), [contacts]);
  const memberById = useCallback((id: string) => team.find((m) => m.id === id), [team]);
  const stageById = useCallback(
    (id: string | null) => (id ? lifecycle.find((s) => s.id === id) : undefined),
    [lifecycle]
  );

  const messagesFor = useCallback(
    (conversationId: string) =>
      messages
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => a.at.localeCompare(b.at)),
    [messages]
  );

  const lastMessageFor = useCallback(
    (conversationId: string) => {
      const list = messagesFor(conversationId).filter((m) => m.kind !== 'event');
      return list[list.length - 1] ?? messagesFor(conversationId).slice(-1)[0];
    },
    [messagesFor]
  );

  const sendMessage = useCallback(
    (
      conversationId: string,
      text: string,
      kind: 'text' | 'comment' | 'audio' | 'file',
      mentions: string[] = []
    ) => {
      const at = new Date().toISOString();
      const senderId = session?.userId ?? 'me';
      const msg: Message = {
        id: nextId('m'),
        conversationId,
        kind,
        from: senderId,
        text,
        at,
        mentions
      };
      setMessages((prev) => [...prev, msg]);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, lastMessageAt: at } : c))
      );

      const convo = conversations.find((c) => c.id === conversationId);
      const contact = convo ? contacts.find((x) => x.id === convo.contactId) : undefined;

      if (live) {
        // Mirror to the database; whatsapp/telegram texts are delivered by
        // Edge Functions. Internal comments never leave the workspace.
        db.sendMessage(
          wsId,
          { id: msg.id, conversationId, kind, senderId, text, mentions },
          contact?.channel
        );
      }

      // @-mentions inside internal comments raise a notification for the
      // mentioned teammates.
      if (kind === 'comment' && mentions.length) {
        const who = session?.name ?? 'A teammate';
        const items: NotificationItem[] = mentions.map((memberId) => ({
          id: nextId('n'),
          kind: 'mention' as const,
          title: `${who} mentioned ${
            memberId === senderId ? 'you' : 'a teammate'
          } in ${contact?.name ?? 'a conversation'}`,
          body: text,
          at,
          archived: false,
          conversationId
        }));
        setNotifications((prev) => [...items, ...prev]);
        if (live) {
          items.forEach((n, i) =>
            db.addNotification(wsId, {
              id: n.id,
              userId: mentions[i],
              kind: 'mention',
              title: n.title,
              body: n.body,
              conversationId
            })
          );
        }
      }
    },
    [session, conversations, contacts, live, wsId]
  );

  const markRead = useCallback(
    (conversationId: string) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId && c.unread ? { ...c, unread: 0 } : c))
      );
      if (live) db.markRead(conversationId);
    },
    [live]
  );

  const setStatus = useCallback(
    (conversationId: string, status: ConversationStatus) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, status } : c))
      );
      if (live) db.setStatus(conversationId, status);
    },
    [live]
  );

  const assign = useCallback(
    (conversationId: string, memberId: string | null) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, assigneeId: memberId } : c))
      );
      if (live) db.assign(conversationId, memberId);
    },
    [live]
  );

  const setContactStage = useCallback(
    (contactId: string, stageId: string | null) => {
      setContacts((prev) =>
        prev.map((c) => (c.id === contactId ? { ...c, lifecycleStageId: stageId } : c))
      );
      if (live) db.setContactStage(contactId, stageId);
    },
    [live]
  );

  const advanceStage = useCallback(
    (contactId: string) => {
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) return;
      const i = lifecycle.findIndex((s) => s.id === contact.lifecycleStageId);
      const next = lifecycle[i + 1] ?? lifecycle[0];
      setContactStage(contactId, next?.id ?? null);
    },
    [lifecycle, contacts, setContactStage]
  );

  const addTemplate = useCallback(
    (name: string, language: string, body: string) => {
      const t: MessageTemplate = { id: nextId('tpl'), name, language, body, status: 'pending' };
      setTemplates((prev) => [...prev, t]);
      if (live) db.addTemplate(wsId, t);
    },
    [live, wsId]
  );

  const archiveNotification = useCallback(
    (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, archived: true } : n))
      );
      if (live) db.archiveNotification(id);
    },
    [live]
  );

  const archiveAllNotifications = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, archived: true })));
    if (live) db.archiveAllNotifications();
  }, [live]);

  const addStage = useCallback(
    (name: string, color: string, description?: string, emoji?: string) => {
      const stage: LifecycleStage = { id: nextId('stage'), name, color, description, emoji };
      setLifecycle((prev) => [...prev, stage]);
      if (live) db.addStage(wsId, stage, lifecycle.length);
    },
    [live, wsId, lifecycle.length]
  );

  const updateStage = useCallback(
    (id: string, patch: Partial<LifecycleStage>) => {
      setLifecycle((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      if (live) db.updateStage(id, patch);
    },
    [live]
  );

  const removeStage = useCallback(
    (id: string) => {
      setLifecycle((prev) => prev.filter((s) => s.id !== id));
      setContacts((prev) =>
        prev.map((c) => (c.lifecycleStageId === id ? { ...c, lifecycleStageId: null } : c))
      );
      if (live) db.removeStage(id);
    },
    [live]
  );

  const moveStage = useCallback(
    (id: string, dir: -1 | 1) => {
      const i = lifecycle.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= lifecycle.length) return;
      const next = [...lifecycle];
      [next[i], next[j]] = [next[j], next[i]];
      setLifecycle(next);
      if (live) db.saveStageOrder(next);
    },
    [lifecycle, live]
  );

  const inviteMember = useCallback(
    (email: string, role: Role) => {
      const cleaned = email.trim().toLowerCase();
      const name = cleaned
        .split('@')[0]
        .split(/[._-]/)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
      const palette = ['#1F6BFF', '#17A2B8', '#F79009', '#12B76A', '#F6668D', '#5E9BF7'];
      setTeam((prev) => [
        ...prev,
        {
          id: nextId('member'),
          name,
          email: cleaned,
          role,
          online: false,
          color: palette[prev.length % palette.length],
          pending: true
        }
      ]);
      // Live: the `invite` Edge Function sends the actual email and creates
      // the pending membership (owner/manager only, enforced server-side).
      if (live) db.invite(wsId, cleaned, role);
    },
    [live, wsId]
  );

  const setMemberRole = useCallback(
    (id: string, role: Role) => {
      setTeam((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
      if (live) db.setMemberRole(wsId, id, role);
    },
    [live, wsId]
  );

  const removeMember = useCallback(
    (id: string) => {
      setTeam((prev) => prev.filter((m) => m.id !== id));
      setConversations((prev) =>
        prev.map((c) => (c.assigneeId === id ? { ...c, assigneeId: null } : c))
      );
      if (live) db.removeMember(wsId, id);
    },
    [live, wsId]
  );

  const value = useMemo<Store>(
    () => ({
      session,
      booting,
      supabaseConfigured,
      signIn,
      signOut,
      team,
      lifecycle,
      contacts,
      conversations,
      messages,
      contactById,
      memberById,
      stageById,
      messagesFor,
      lastMessageFor,
      sendMessage,
      markRead,
      setStatus,
      assign,
      setContactStage,
      advanceStage,
      snippets,
      templates,
      addTemplate,
      notifications,
      archiveNotification,
      archiveAllNotifications,
      addStage,
      updateStage,
      removeStage,
      moveStage,
      inviteMember,
      setMemberRole,
      removeMember
    }),
    [
      session,
      booting,
      signIn,
      signOut,
      team,
      lifecycle,
      contacts,
      conversations,
      messages,
      contactById,
      memberById,
      stageById,
      messagesFor,
      lastMessageFor,
      sendMessage,
      markRead,
      setStatus,
      assign,
      setContactStage,
      advanceStage,
      snippets,
      templates,
      addTemplate,
      notifications,
      archiveNotification,
      archiveAllNotifications,
      addStage,
      updateStage,
      removeStage,
      moveStage,
      inviteMember,
      setMemberRole,
      removeMember
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error('useStore must be used inside AppStoreProvider');
  return store;
}

export function timeLabel(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (mins < 60 * 24 * 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function clockLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function agoLabel(iso: string): string {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
