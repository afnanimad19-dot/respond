import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clockLabel, useStore } from '../state/AppStore';
import { Avatar, channelName } from '../components/Avatar';
import {
  BackIcon,
  BoltIcon,
  CheckCircleIcon,
  DotsIcon,
  NoteIcon,
  SendIcon
} from '../components/icons';
import { Message } from '../lib/types';

const SHORTCUTS: Record<string, string> = {
  '/welcome': 'Hi! 👋 Thanks for reaching out to us. How can I help you today?',
  '/hours': 'Our clinic is open Monday–Saturday, 9:00am to 7:00pm.',
  '/book': "I'd love to get you booked in! What day and time works best for you?",
  '/thanks': 'Thank you so much! Have a lovely day. 😊'
};

function renderWithMentions(text: string) {
  const parts = text.split(/(@[\w.'-]+(?: [A-Z][\w.'-]+)*)/g);
  return parts.map((p, i) =>
    p.startsWith('@') ? (
      <span key={i} className="mention">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export function Chat() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const nav = useNavigate();

  const convo = store.conversations.find((c) => c.id === id);
  const contact = convo ? store.contactById(convo.contactId) : undefined;
  const msgs = useMemo(() => (convo ? store.messagesFor(convo.id) : []), [store, convo]);

  const [commentMode, setCommentMode] = useState(false);
  const [draft, setDraft] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [sheet, setSheet] = useState<null | 'assign' | 'stage' | 'more' | 'shortcuts'>(null);
  const [showMentionPicker, setShowMentionPicker] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (convo) store.markRead(convo.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convo?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs.length, commentMode]);

  if (!convo || !contact) {
    return (
      <div className="empty" style={{ marginTop: 100 }}>
        <div className="big">🤔</div>
        Conversation not found.
        <div style={{ marginTop: 16 }}>
          <button className="btn ghost" onClick={() => nav('/inbox')}>
            Back to Inbox
          </button>
        </div>
      </div>
    );
  }

  const stage = store.stageById(contact.lifecycleStageId);
  const assignee = convo.assigneeId ? store.memberById(convo.assigneeId) : undefined;
  const me = store.session?.userId ?? 'me';

  const onDraftChange = (v: string) => {
    setDraft(v);
    if (commentMode && v.endsWith('@')) {
      setShowMentionPicker(true);
    } else if (showMentionPicker && !v.includes('@')) {
      setShowMentionPicker(false);
    }
    if (!commentMode && v.startsWith('/')) {
      setSheet('shortcuts');
    }
  };

  const pickMention = (memberId: string) => {
    const member = store.memberById(memberId);
    if (!member) return;
    setDraft((d) => d.replace(/@$/, `@${member.name} `));
    setMentions((m) => (m.includes(memberId) ? m : [...m, memberId]));
    setShowMentionPicker(false);
    inputRef.current?.focus();
  };

  const applyShortcut = (key: string) => {
    setDraft(SHORTCUTS[key]);
    setSheet(null);
    inputRef.current?.focus();
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    store.sendMessage(convo.id, text, commentMode ? 'comment' : 'text', mentions);
    setDraft('');
    setMentions([]);
    setShowMentionPicker(false);
  };

  const bubbleFor = (m: Message) => {
    if (m.kind === 'event') {
      const closed = m.text.toLowerCase().includes('closed');
      return (
        <div key={m.id} className={`event-line${closed ? ' closed' : ''}`}>
          {m.text}
        </div>
      );
    }

    const isContact = m.from === 'contact';
    const isComment = m.kind === 'comment';
    const author = !isContact ? store.memberById(m.from) : undefined;
    const mine = m.from === me;

    return (
      <div key={m.id} className={`msg-row${isContact ? '' : ' out'}`}>
        {isContact ? (
          <Avatar name={contact.name} color={contact.color} channel={contact.channel} small />
        ) : (
          author && <Avatar name={author.name} color={author.color} small />
        )}
        <div
          className={`bubble ${isComment ? 'comment' : isContact ? 'in' : 'out'}`}
        >
          {isComment && <span className="comment-tag">🔒 INTERNAL — hidden from {contact.name.split(' ')[0]}</span>}
          {!isContact && !mine && author && <span className="who">{author.name}</span>}
          {m.kind === 'audio' && <span>🎙 {m.text}</span>}
          {m.kind === 'file' && <span>📎 {m.text}</span>}
          {m.kind === 'unsupported' && <span style={{ opacity: 0.7 }}>{m.text}</span>}
          {(m.kind === 'text' || m.kind === 'comment') &&
            (isComment ? renderWithMentions(m.text) : m.text)}
          <span className="stamp">
            {clockLabel(m.at)}
            {!isContact && !isComment && ' ✓✓'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <header className="topbar glass" style={{ paddingBottom: 8 }}>
        <button className="iconbtn" onClick={() => nav('/inbox')} aria-label="Back">
          <BackIcon />
        </button>
        <button
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
          onClick={() => setSheet('stage')}
        >
          <Avatar name={contact.name} color={contact.color} channel={contact.channel} small />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: '-0.02em' }}>
              {contact.name}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--ink-2)',
                display: 'flex',
                gap: 5,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {channelName[contact.channel]}
              {stage && (
                <span style={{ color: stage.color, fontWeight: 700 }}>· {stage.name}</span>
              )}
            </div>
          </div>
        </button>
        <button className="iconbtn" aria-label="Automations">
          <BoltIcon />
        </button>
        <button
          className="iconbtn"
          aria-label="Close conversation"
          onClick={() =>
            store.setStatus(convo.id, convo.status === 'closed' ? 'open' : 'closed')
          }
          style={convo.status === 'closed' ? { background: 'rgba(52,199,89,.18)', color: 'var(--green)' } : undefined}
        >
          <CheckCircleIcon />
        </button>
        <button className="iconbtn" aria-label="More" onClick={() => setSheet('more')}>
          <DotsIcon />
        </button>
      </header>

      <button
        className="card"
        style={{
          margin: '10px 16px 0',
          padding: '10px 14px',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--ink-2)'
        }}
        onClick={() => setSheet('assign')}
      >
        {assignee ? (
          <>
            <span
              className="avatar sm"
              style={{ width: 22, height: 22, fontSize: 10, background: assignee.color }}
            >
              {assignee.name.charAt(0)}
            </span>
            Assigned to {assignee.id === me ? 'you' : assignee.name}
          </>
        ) : (
          <>👤 Unassigned — tap to assign a teammate</>
        )}
        <span style={{ marginLeft: 'auto', color: 'var(--blue)' }}>Change</span>
      </button>

      <div className="chat-scroll" ref={scrollRef}>
        {msgs.map(bubbleFor)}
      </div>

      <div className="composer-wrap glass" style={{ position: 'relative' }}>
        {showMentionPicker && (
          <div className="mention-sheet glass">
            {store.team
              .filter((t) => t.id !== me && !t.pending)
              .map((t) => (
                <button key={t.id} onClick={() => pickMention(t.id)}>
                  <span className="avatar sm" style={{ background: t.color }}>
                    {t.name.charAt(0)}
                  </span>
                  <span style={{ fontWeight: 600 }}>{t.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-3)' }}>
                    {t.role}
                  </span>
                </button>
              ))}
          </div>
        )}

        {commentMode && (
          <div className="comment-hint">
            🔒 Internal comment — {contact.name.split(' ')[0]} can't see this. Type @ to tag a
            teammate.
          </div>
        )}

        <div className={`composer${commentMode ? ' comment-mode' : ''}`}>
          <button
            className={`comment-toggle${commentMode ? ' on' : ''}`}
            onClick={() => {
              setCommentMode((v) => !v);
              inputRef.current?.focus();
            }}
            aria-label="Toggle internal comment mode"
            title="Internal comment"
          >
            <NoteIcon />
          </button>

          <div className="box">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder={
                commentMode
                  ? `Comment privately to your team…`
                  : `Message ${contact.name.split(' ')[0]}`
              }
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button
              className={`sendbtn${commentMode ? ' comment' : ''}`}
              onClick={send}
              disabled={!draft.trim()}
              aria-label="Send"
            >
              <SendIcon width={18} height={18} />
            </button>
          </div>
        </div>
      </div>

      {sheet && (
        <div className="sheet-backdrop" onClick={() => setSheet(null)}>
          <div className="sheet glass-strong glass" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />

            {sheet === 'assign' && (
              <>
                <h3>Assign this conversation</h3>
                <div className="card" style={{ overflow: 'hidden' }}>
                  <button className="list-row" onClick={() => { store.assign(convo.id, null); setSheet(null); }}>
                    <span className="avatar sm" style={{ background: 'var(--ink-3)' }}>—</span>
                    <span className="grow">Unassigned</span>
                  </button>
                  {store.team.filter((t) => !t.pending).map((t) => (
                    <button
                      key={t.id}
                      className="list-row"
                      onClick={() => {
                        store.assign(convo.id, t.id);
                        setSheet(null);
                      }}
                    >
                      <span className="avatar sm" style={{ background: t.color }}>
                        {t.name.charAt(0)}
                      </span>
                      <span className="grow">
                        {t.name}
                        <div className="sub">{t.role}</div>
                      </span>
                      {convo.assigneeId === t.id && <span style={{ color: 'var(--blue)' }}>✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}

            {sheet === 'stage' && (
              <>
                <h3>Lifecycle stage for {contact.name}</h3>
                <div className="card" style={{ overflow: 'hidden' }}>
                  {store.lifecycle.map((s) => (
                    <button
                      key={s.id}
                      className="list-row"
                      onClick={() => {
                        store.setContactStage(contact.id, s.id);
                        setSheet(null);
                      }}
                    >
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: s.color,
                          flexShrink: 0
                        }}
                      />
                      <span className="grow">
                        {s.name}
                        {s.description && <div className="sub">{s.description}</div>}
                      </span>
                      {contact.lifecycleStageId === s.id && (
                        <span style={{ color: 'var(--blue)' }}>✓</span>
                      )}
                    </button>
                  ))}
                  <button
                    className="list-row"
                    onClick={() => {
                      store.setContactStage(contact.id, null);
                      setSheet(null);
                    }}
                  >
                    <span style={{ width: 14 }} />
                    <span className="grow" style={{ color: 'var(--ink-3)' }}>
                      No stage
                    </span>
                  </button>
                </div>
              </>
            )}

            {sheet === 'more' && (
              <>
                <h3>Conversation</h3>
                <div className="card" style={{ overflow: 'hidden' }}>
                  <button
                    className="list-row"
                    onClick={() => {
                      store.setStatus(convo.id, 'open');
                      setSheet(null);
                    }}
                  >
                    <span className="grow">Mark as Open</span>
                    {convo.status === 'open' && <span style={{ color: 'var(--blue)' }}>✓</span>}
                  </button>
                  <button
                    className="list-row"
                    onClick={() => {
                      store.setStatus(convo.id, 'snoozed');
                      setSheet(null);
                    }}
                  >
                    <span className="grow">Snooze</span>
                    {convo.status === 'snoozed' && <span style={{ color: 'var(--blue)' }}>✓</span>}
                  </button>
                  <button
                    className="list-row"
                    onClick={() => {
                      store.setStatus(convo.id, 'closed');
                      setSheet(null);
                    }}
                  >
                    <span className="grow">Close conversation</span>
                    {convo.status === 'closed' && <span style={{ color: 'var(--blue)' }}>✓</span>}
                  </button>
                </div>
              </>
            )}

            {sheet === 'shortcuts' && (
              <>
                <h3>Shortcuts</h3>
                <div className="card" style={{ overflow: 'hidden' }}>
                  {Object.entries(SHORTCUTS).map(([key, text]) => (
                    <button key={key} className="list-row" onClick={() => applyShortcut(key)}>
                      <span className="grow">
                        <b style={{ color: 'var(--blue)' }}>{key}</b>
                        <div className="sub">{text}</div>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
