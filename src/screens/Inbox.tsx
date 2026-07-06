import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agoLabel, timeLabel, useStore } from '../state/AppStore';
import { Avatar } from '../components/Avatar';
import { BottomNav } from '../components/BottomNav';
import { MenuIcon, SearchIcon, XIcon } from '../components/icons';
import { ConversationStatus, Message } from '../lib/types';

type StatusFilter = 'all' | ConversationStatus;
type OwnerFilter = 'all' | 'mine' | 'unassigned' | string;

function previewText(m: Message | undefined): string {
  if (!m) return 'No messages yet';
  switch (m.kind) {
    case 'audio':
      return '(Audio)';
    case 'file':
      return '(File)';
    case 'unsupported':
      return '(Unsupported Message)';
    case 'comment':
      return `Internal note: ${m.text}`;
    default:
      return m.text;
  }
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function Inbox() {
  const store = useStore();
  const nav = useNavigate();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [owner, setOwner] = useState<OwnerFilter>('all');
  const [query, setQuery] = useState('');
  const [drawer, setDrawer] = useState(false);

  const me = store.session?.userId ?? 'me';

  const rows = useMemo(() => {
    return store.conversations
      .filter((c) => (status === 'all' ? true : c.status === status))
      .filter((c) => {
        if (owner === 'all') return true;
        if (owner === 'mine') return c.assigneeId === me;
        if (owner === 'unassigned') return !c.assigneeId;
        return c.assigneeId === owner;
      })
      .filter((c) => {
        if (!stageFilter) return true;
        return store.contactById(c.contactId)?.lifecycleStageId === stageFilter;
      })
      .filter((c) => {
        if (!query.trim()) return true;
        const contact = store.contactById(c.contactId);
        return contact?.name.toLowerCase().includes(query.trim().toLowerCase());
      })
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  }, [store, status, stageFilter, owner, query, me]);

  const stageCount = (stageId: string) =>
    store.conversations.filter(
      (c) => store.contactById(c.contactId)?.lifecycleStageId === stageId
    ).length;

  const mineCount = store.conversations.filter((c) => c.assigneeId === me).length;
  const unassignedTotal = store.conversations.filter((c) => !c.assigneeId).length;

  const openCount = store.conversations.filter((c) => c.status === 'open').length;
  const unreadCount = store.conversations.reduce((n, c) => n + c.unread, 0);
  const unassignedCount = store.conversations.filter(
    (c) => c.status === 'open' && !c.assigneeId
  ).length;
  const closedCount = store.conversations.filter((c) => c.status === 'closed').length;

  const firstName = (store.session?.name ?? 'there').split(' ')[0];

  return (
    <>
      <header className="topbar glass">
        <button className="iconbtn" onClick={() => setDrawer(true)} aria-label="Menu">
          <MenuIcon />
        </button>
        <div className="greet">
          <div className="hello">
            {greeting()}, {firstName}
          </div>
          <div className="sub">
            {store.session?.workspace.name}
            {owner === 'mine' ? ' · Mine' : owner === 'unassigned' ? ' · Unassigned' : ''}
          </div>
        </div>
        <button className="me-dot" onClick={() => nav('/settings')} aria-label="Profile">
          {firstName.charAt(0).toUpperCase()}
        </button>
      </header>

      <div className="searchbar">
        <SearchIcon />
        <input
          placeholder="Search conversations, customers…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="stat-tiles">
        <button className="stat-tile hot" onClick={() => setStatus('open')}>
          <b>{openCount}</b>
          <span>Open</span>
        </button>
        <button className="stat-tile" onClick={() => setStatus('open')}>
          <b>{unreadCount}</b>
          <span>Unread</span>
        </button>
        <button className="stat-tile" onClick={() => setStatus('open')}>
          <b>{unassignedCount}</b>
          <span>No owner</span>
        </button>
        <button className="stat-tile" onClick={() => setStatus('closed')}>
          <b>{closedCount}</b>
          <span>Closed</span>
        </button>
      </div>

      <div className="chips">
        {(['all', 'open', 'closed', 'snoozed'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            className={`chip${status === s ? ' on' : ''}`}
            onClick={() => setStatus(s)}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span style={{ width: 1, background: 'var(--line)', flex: '0 0 1px', margin: '4px 2px' }} />
        {store.lifecycle.map((stage) => (
          <button
            key={stage.id}
            className={`chip stage${stageFilter === stage.id ? ' on' : ''}`}
            style={{ ['--chip-color' as any]: stage.color }}
            onClick={() => setStageFilter(stageFilter === stage.id ? null : stage.id)}
          >
            {stage.name}
          </button>
        ))}
      </div>

      <div className="convo-list">
        {rows.length === 0 ? (
          <div className="empty">
            <div className="big">📭</div>
            Nothing here yet. New messages from WhatsApp, Instagram, Telegram and your other
            channels will show up in this inbox.
          </div>
        ) : (
          <div className="convo-card">
            {rows.map((c) => {
              const contact = store.contactById(c.contactId);
              if (!contact) return null;
              const last = store.lastMessageFor(c.id);
              const stage = store.stageById(contact.lifecycleStageId);
              const assignee = c.assigneeId ? store.memberById(c.assigneeId) : undefined;
              return (
                <button key={c.id} className="convo" onClick={() => nav(`/chat/${c.id}`)}>
                  <Avatar name={contact.name} color={contact.color} channel={contact.channel} />
                  <div className="body">
                    <div className="row1">
                      <span className="name">{contact.name}</span>
                      <span className="when">{timeLabel(c.lastMessageAt)}</span>
                    </div>
                    <div className="preview">{previewText(last)}</div>
                    <div className="meta">
                      {stage && (
                        <span className="stage-pill" style={{ background: stage.color }}>
                          {stage.name}
                        </span>
                      )}
                      {assignee ? (
                        <span className="meta-label">
                          {assignee.id === store.session?.userId ? 'You' : assignee.name}
                        </span>
                      ) : (
                        <span className="meta-label warn">Unassigned</span>
                      )}
                      {c.unread > 0 && <span className="badge-unread">{c.unread}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />

      {drawer && (
        <div className="drawer-backdrop" onClick={() => setDrawer(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <h2>Inbox</h2>

            <button
              className={`drawer-row${owner === 'all' ? ' on' : ''}`}
              onClick={() => { setOwner('all'); setStageFilter(null); setDrawer(false); }}
            >
              <span className="emoji">📥</span> All
              <span className="count">{store.conversations.length}</span>
            </button>
            <button
              className={`drawer-row${owner === 'mine' ? ' on' : ''}`}
              onClick={() => { setOwner('mine'); setDrawer(false); }}
            >
              <span className="emoji">👤</span> Mine
              <span className="count">{mineCount}</span>
            </button>
            <button
              className={`drawer-row${owner === 'unassigned' ? ' on' : ''}`}
              onClick={() => { setOwner('unassigned'); setDrawer(false); }}
            >
              <span className="emoji">🫥</span> Unassigned
              <span className="count">{unassignedTotal}</span>
            </button>

            <div className="drawer-label">Lifecycle</div>
            {store.lifecycle.map((s) => (
              <button
                key={s.id}
                className={`drawer-row${stageFilter === s.id ? ' on' : ''}`}
                onClick={() => {
                  setStageFilter(stageFilter === s.id ? null : s.id);
                  setDrawer(false);
                }}
              >
                <span className="emoji">{s.emoji ?? '•'}</span> {s.name}
                <span className="count">{stageCount(s.id)}</span>
              </button>
            ))}

            <div className="drawer-label">Team</div>
            {store.team.filter((t) => !t.pending).map((t) => (
              <button
                key={t.id}
                className={`drawer-row${owner === t.id ? ' on' : ''}`}
                onClick={() => { setOwner(owner === t.id ? 'all' : t.id); setDrawer(false); }}
              >
                <span
                  className="avatar sm"
                  style={{ width: 22, height: 22, fontSize: 9, background: t.color }}
                >
                  {t.name.charAt(0)}
                </span>
                {t.id === me ? 'You' : t.name}
                <span className="count">
                  {store.conversations.filter((c) => c.assigneeId === t.id).length}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function Notifications() {
  const store = useStore();
  const nav = useNavigate();
  const [filter, setFilter] = useState<'new' | 'archived' | 'all'>('new');

  const list = store.notifications
    .filter((n) =>
      filter === 'all' ? true : filter === 'archived' ? n.archived : !n.archived
    )
    .sort((a, b) => b.at.localeCompare(a.at));

  const dayAgo = Date.now() - 24 * 3600_000;
  const recent = list.filter((n) => new Date(n.at).getTime() >= dayAgo);
  const older = list.filter((n) => new Date(n.at).getTime() < dayAgo);

  const icon = (kind: string) => (kind === 'mention' ? '💬' : kind === 'assignment' ? '👤' : '❗');

  const section = (title: string, items: typeof list) =>
    items.length > 0 && (
      <>
        <div className="section-label" style={{ paddingLeft: 4 }}>{title}</div>
        <div className="convo-card">
          {items.map((n) => (
            <div key={n.id} className="notif-row">
              <span className="notif-icon">{icon(n.kind)}</span>
              <button
                style={{ flex: 1, minWidth: 0, textAlign: 'left' }}
                onClick={() => n.conversationId && nav(`/chat/${n.conversationId}`)}
              >
                <div className="title">{n.title}</div>
                {n.body && <div className="quote">{n.body}</div>}
                <div className="when">{agoLabel(n.at)}</div>
              </button>
              {!n.archived && (
                <button
                  onClick={() => store.archiveNotification(n.id)}
                  aria-label="Archive"
                  style={{ color: 'var(--ink-3)', padding: 4 }}
                >
                  <XIcon style={{ width: 15, height: 15 }} />
                </button>
              )}
            </div>
          ))}
        </div>
      </>
    );

  return (
    <>
      <header className="topbar glass">
        <h1>Notifications</h1>
        {list.some((n) => !n.archived) && (
          <button
            onClick={store.archiveAllNotifications}
            style={{ color: 'var(--blue)', fontWeight: 600, fontSize: 14 }}
          >
            Archive All
          </button>
        )}
      </header>

      <div className="chips">
        {(['new', 'archived', 'all'] as const).map((f) => (
          <button
            key={f}
            className={`chip${filter === f ? ' on' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="convo-list">
        {list.length === 0 ? (
          <div className="empty">
            <div className="big">🔔</div>
            {filter === 'archived'
              ? 'No archived notifications.'
              : "You're all caught up. Mentions, assignments and system updates will appear here."}
          </div>
        ) : (
          <>
            {section('Recent', recent)}
            {section('Older', older)}
          </>
        )}
      </div>
      <BottomNav />
    </>
  );
}

export function Calls() {
  return (
    <>
      <header className="topbar glass">
        <h1>Calls</h1>
      </header>
      <div className="convo-list">
        <div className="empty">
          <div className="big">📞</div>
          Voice calls with your contacts are coming soon to Responde.
        </div>
      </div>
      <BottomNav />
    </>
  );
}
