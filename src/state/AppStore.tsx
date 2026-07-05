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
  Role,
  Session,
  TeamMember
} from '../lib/types';
import { supabase, supabaseConfigured } from '../lib/supabase';
import {
  mockContacts,
  mockConversations,
  mockLifecycle,
  mockMessages,
  mockTeam
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

  sendMessage: (conversationId: string, text: string, kind: 'text' | 'comment', mentions?: string[]) => void;
  markRead: (conversationId: string) => void;
  setStatus: (conversationId: string, status: ConversationStatus) => void;
  assign: (conversationId: string, memberId: string | null) => void;
  setContactStage: (contactId: string, stageId: string | null) => void;

  addStage: (name: string, color: string, description?: string) => void;
  updateStage: (id: string, patch: Partial<LifecycleStage>) => void;
  removeStage: (id: string) => void;
  moveStage: (id: string, dir: -1 | 1) => void;

  inviteMember: (email: string, role: Role) => void;
  setMemberRole: (id: string, role: Role) => void;
  removeMember: (id: string) => void;
}

const Ctx = createContext<Store | null>(null);

let seq = 1000;
const nextId = (prefix: string) => `${prefix}${seq++}`;

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);

  const [team, setTeam] = useState<TeamMember[]>(mockTeam);
  const [lifecycle, setLifecycle] = useState<LifecycleStage[]>(mockLifecycle);
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [messages, setMessages] = useState<Message[]>(mockMessages);

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
        const { data: memberships } = await supabase
          .from('workspace_members')
          .select('workspace_id, role, workspaces ( id, name, source_app )')
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
            sourceApp: match.workspaces.source_app ?? 'PyDent'
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
    (conversationId: string, text: string, kind: 'text' | 'comment', mentions: string[] = []) => {
      const at = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        {
          id: nextId('m'),
          conversationId,
          kind,
          from: session?.userId ?? 'me',
          text,
          at,
          mentions
        }
      ]);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, lastMessageAt: at } : c))
      );
    },
    [session]
  );

  const markRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId && c.unread ? { ...c, unread: 0 } : c))
    );
  }, []);

  const setStatus = useCallback((conversationId: string, status: ConversationStatus) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, status } : c))
    );
  }, []);

  const assign = useCallback((conversationId: string, memberId: string | null) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, assigneeId: memberId } : c))
    );
  }, []);

  const setContactStage = useCallback((contactId: string, stageId: string | null) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, lifecycleStageId: stageId } : c))
    );
  }, []);

  const addStage = useCallback((name: string, color: string, description?: string) => {
    setLifecycle((prev) => [...prev, { id: nextId('stage'), name, color, description }]);
  }, []);

  const updateStage = useCallback((id: string, patch: Partial<LifecycleStage>) => {
    setLifecycle((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const removeStage = useCallback((id: string) => {
    setLifecycle((prev) => prev.filter((s) => s.id !== id));
    setContacts((prev) =>
      prev.map((c) => (c.lifecycleStageId === id ? { ...c, lifecycleStageId: null } : c))
    );
  }, []);

  const moveStage = useCallback((id: string, dir: -1 | 1) => {
    setLifecycle((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const inviteMember = useCallback((email: string, role: Role) => {
    const name = email
      .split('@')[0]
      .split(/[._-]/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
    const palette = ['#0A84FF', '#30B0C7', '#FF9F0A', '#34C759', '#FF6482', '#5E9BF7'];
    setTeam((prev) => [
      ...prev,
      {
        id: nextId('member'),
        name,
        email: email.trim().toLowerCase(),
        role,
        online: false,
        color: palette[prev.length % palette.length],
        pending: true
      }
    ]);
  }, []);

  const setMemberRole = useCallback((id: string, role: Role) => {
    setTeam((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
  }, []);

  const removeMember = useCallback((id: string) => {
    setTeam((prev) => prev.filter((m) => m.id !== id));
    setConversations((prev) =>
      prev.map((c) => (c.assigneeId === id ? { ...c, assigneeId: null } : c))
    );
  }, []);

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
