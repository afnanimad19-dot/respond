import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { timeLabel, useStore } from '../state/AppStore';
import { Avatar } from '../components/Avatar';
import { BottomNav } from '../components/BottomNav';
import { SearchIcon } from '../components/icons';
import { ConversationStatus, Message } from '../lib/types';

type StatusFilter = 'all' | ConversationStatus;

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
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    return store.conversations
      .filter((c) => (status === 'all' ? true : c.status === status))
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
  }, [store, status, stageFilter, query]);

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
        <div className="greet">
          <div className="hello">
            {greeting()}, {firstName}
          </div>
          <div className="sub">{store.session?.workspace.name} · Responde</div>
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
    </>
  );
}

export function Notifications() {
  const store = useStore();
  const mentionsForMe = store.messages
    .filter(
      (m) => m.kind === 'comment' && m.mentions?.includes(store.session?.userId ?? 'me')
    )
    .sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <header className="topbar glass">
        <h1>Notifications</h1>
      </header>
      <div className="convo-list">
        {mentionsForMe.length === 0 ? (
          <div className="empty">
            <div className="big">🔔</div>
            You're all caught up. When a teammate mentions you with @ inside an internal
            comment, it will appear here.
          </div>
        ) : (
          <div className="convo-card">
            {mentionsForMe.map((m) => {
              const convo = store.conversations.find((c) => c.id === m.conversationId);
              const contact = convo ? store.contactById(convo.contactId) : undefined;
              const author = store.memberById(m.from);
              return (
                <div key={m.id} className="list-row">
                  <div className="grow">
                    <b>{author?.name ?? 'Teammate'}</b> mentioned you on{' '}
                    <b>{contact?.name ?? 'a conversation'}</b>
                    <div className="sub">{m.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
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
