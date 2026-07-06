import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clockLabel, useStore } from '../state/AppStore';
import { Avatar, channelName } from '../components/Avatar';
import {
  BackIcon,
  CheckCircleIcon,
  ClipIcon,
  ClockIcon,
  DotsIcon,
  DownIcon,
  MegaphoneIcon,
  MicIcon,
  NoteIcon,
  SendIcon,
  SnippetIcon,
  VarIcon,
  WandIcon,
  WhatsAppLogo
} from '../components/icons';
import { Message } from '../lib/types';

type SheetKind =
  | null
  | 'assign'
  | 'stage'
  | 'more'
  | 'snippets'
  | 'variables'
  | 'ai'
  | 'attach'
  | 'templates'
  | 'newTemplate'
  | 'channel';

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

const VARIABLES: { token: string; hint: string }[] = [
  { token: '$name', hint: 'Full name of the contact' },
  { token: '$firstName', hint: 'First name of the contact' },
  { token: '$phone', hint: 'Phone number of the contact' },
  { token: '$agent', hint: 'Your name (the assignee)' },
  { token: '$workspace', hint: 'Workspace / clinic name' }
];

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
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [tplName, setTplName] = useState('');
  const [tplBody, setTplBody] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (convo) store.markRead(convo.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convo?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs.length, commentMode]);

  useEffect(() => {
    return () => {
      if (recTimer.current) clearInterval(recTimer.current);
    };
  }, []);

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
  const firstName = contact.name.split(' ')[0];

  const resolveVars = (text: string) =>
    text
      .replaceAll('$firstName', firstName)
      .replaceAll('$name', contact.name)
      .replaceAll('$phone', contact.phone ?? contact.handle ?? '')
      .replaceAll('$agent', store.session?.name ?? '')
      .replaceAll('$workspace', store.session?.workspace.name ?? '');

  const onDraftChange = (v: string) => {
    setDraft(v);
    if (commentMode && v.endsWith('@')) {
      setShowMentionPicker(true);
    } else if (showMentionPicker && !v.includes('@')) {
      setShowMentionPicker(false);
    }
    if (!commentMode && v === '/') setSheet('snippets');
    if (!commentMode && v.endsWith('$')) setSheet('variables');
  };

  const pickMention = (memberId: string) => {
    const member = store.memberById(memberId);
    if (!member) return;
    setDraft((d) => d.replace(/@$/, `@${member.name} `));
    setMentions((m) => (m.includes(memberId) ? m : [...m, memberId]));
    setShowMentionPicker(false);
    inputRef.current?.focus();
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    store.sendMessage(
      convo.id,
      commentMode ? text : resolveVars(text),
      commentMode ? 'comment' : 'text',
      mentions
    );
    setDraft('');
    setMentions([]);
    setShowMentionPicker(false);
  };

  // ---- voice notes ----------------------------------------------------------

  const startRecording = () => {
    setRecording(true);
    setRecSeconds(0);
    recTimer.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
  };

  const stopRecording = (sendIt: boolean) => {
    if (recTimer.current) clearInterval(recTimer.current);
    setRecording(false);
    if (sendIt && recSeconds > 0) {
      const mm = Math.floor(recSeconds / 60);
      const ss = String(recSeconds % 60).padStart(2, '0');
      store.sendMessage(convo.id, `Voice message (${mm}:${ss})`, 'audio');
    }
  };

  // ---- attachments ------------------------------------------------------------

  const pickFile = (accept: string, capture?: string) => {
    const el = fileRef.current;
    if (!el) return;
    el.accept = accept;
    if (capture) el.setAttribute('capture', capture);
    else el.removeAttribute('capture');
    el.click();
    setSheet(null);
  };

  const onFileChosen = () => {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    store.sendMessage(convo.id, f.name, 'file');
    if (fileRef.current) fileRef.current.value = '';
  };

  // ---- AI prompts (demo transforms; full AI arrives with the backend) ---------

  const aiTransform = (mode: string) => {
    const t = draft.trim();
    if (!t) {
      setSheet(null);
      return;
    }
    let out = t;
    const capped = t.charAt(0).toUpperCase() + t.slice(1);
    switch (mode) {
      case 'friendly':
        out = `${capped.replace(/[.!]*$/, '')}! 😊`;
        break;
      case 'professional':
        out = `Dear ${firstName}, ${t.charAt(0).toLowerCase() + t.slice(1)}`.replace(/[.!]*$/, '.');
        break;
      case 'grammar':
        out = capped.replace(/\s{2,}/g, ' ').replace(/([^.!?])$/, '$1.');
        break;
      case 'simplify':
        out = capped.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
        break;
    }
    setDraft(out);
    setSheet(null);
    inputRef.current?.focus();
  };

  // ---- rendering ---------------------------------------------------------------

  const bubbleFor = (m: Message) => {
    if (m.kind === 'event') {
      const closed = m.text.toLowerCase().includes('closed by');
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
        <div className={`bubble ${isComment ? 'comment' : isContact ? 'in' : 'out'}`}>
          {isComment && (
            <span className="comment-tag">🔒 Internal — hidden from {firstName}</span>
          )}
          {!isContact && !mine && author && <span className="who">{author.name}</span>}
          {m.kind === 'audio' && <span>🎙 {m.text}</span>}
          {m.kind === 'file' && <span>📎 {m.text}</span>}
          {m.kind === 'unsupported' && <span style={{ opacity: 0.7 }}>{m.text}</span>}
          {(m.kind === 'text' || m.kind === 'comment') && (
            <span dir="auto" style={{ unicodeBidi: 'plaintext', display: 'block' }}>
              {isComment ? renderWithMentions(m.text) : m.text}
            </span>
          )}
          <span className="stamp">
            {clockLabel(m.at)}
            {!isContact && !isComment && ' ✓✓'}
          </span>
        </div>
      </div>
    );
  };

  const closeSheet = () => setSheet(null);

  return (
    <>
      <header className="topbar glass" style={{ paddingBottom: 6 }}>
        <button className="iconbtn" onClick={() => nav('/inbox')} aria-label="Back">
          <BackIcon />
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Avatar name={contact.name} color={contact.color} channel={contact.channel} small />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: '-0.02em' }}>
              {contact.name}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--ink-2)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {channelName[contact.channel]}
            </div>
          </div>
        </div>
        <button
          className="iconbtn"
          aria-label="Close conversation"
          onClick={() => store.setStatus(convo.id, convo.status === 'closed' ? 'open' : 'closed')}
          style={
            convo.status === 'closed'
              ? { background: 'rgba(18,183,106,.14)', color: 'var(--green)', borderColor: 'transparent' }
              : undefined
          }
        >
          <CheckCircleIcon />
        </button>
        <button className="iconbtn" aria-label="More" onClick={() => setSheet('more')}>
          <DotsIcon />
        </button>
      </header>

      {/* assignee + lifecycle stage row (like respond.io) */}
      <div style={{ display: 'flex', gap: 8, margin: '8px 16px 0', alignItems: 'center' }}>
        <button
          className="card"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 11px',
            borderRadius: 12,
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--ink-2)',
            minWidth: 0
          }}
          onClick={() => setSheet('assign')}
        >
          {assignee ? (
            <>
              <span
                className="avatar sm"
                style={{ width: 20, height: 20, fontSize: 9, background: assignee.color }}
              >
                {assignee.name.charAt(0)}
              </span>
              <span
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {assignee.id === me ? 'You' : assignee.name}
              </span>
            </>
          ) : (
            <span>Unassigned</span>
          )}
          <DownIcon style={{ width: 13, height: 13, marginLeft: 'auto', flexShrink: 0 }} />
        </button>

        <button
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 11px',
            borderRadius: 12,
            fontSize: 12.5,
            fontWeight: 700,
            color: stage?.color ?? 'var(--ink-2)'
          }}
          onClick={() => setSheet('stage')}
        >
          {stage ? `${stage.emoji ?? ''} ${stage.name}` : 'No stage'}
        </button>
        <button
          className="iconbtn"
          aria-label="Move to next stage"
          title="Move to next lifecycle stage"
          onClick={() => store.advanceStage(contact.id)}
          style={{ width: 34, height: 34 }}
        >
          <BackIcon style={{ transform: 'rotate(180deg)', width: 16 }} />
        </button>
        <button
          className="iconbtn"
          aria-label="Snooze"
          onClick={() => store.setStatus(convo.id, convo.status === 'snoozed' ? 'open' : 'snoozed')}
          style={{
            width: 34,
            height: 34,
            ...(convo.status === 'snoozed'
              ? { background: 'var(--orange-soft)', color: 'var(--orange-deep)', borderColor: 'transparent' }
              : {})
          }}
        >
          <ClockIcon style={{ width: 16 }} />
        </button>
      </div>

      {/* ad attribution banner */}
      {contact.adSource && (
        <div
          className="card"
          style={{
            margin: '8px 16px 0',
            padding: '9px 12px',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            fontSize: 12,
            color: 'var(--ink-2)'
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              background: 'var(--blue-soft)',
              color: 'var(--blue)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0
            }}
          >
            <MegaphoneIcon style={{ width: 15 }} />
          </span>
          <span style={{ minWidth: 0 }}>
            Came from <b>{contact.adSource.platform}</b>
            {contact.adSource.campaign ? ` · ${contact.adSource.campaign}` : ''}
            <span
              dir="auto"
              style={{
                display: 'block',
                unicodeBidi: 'plaintext',
                color: 'var(--ink)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {contact.adSource.adName}
            </span>
          </span>
        </div>
      )}

      <div className="chat-scroll" ref={scrollRef}>
        {msgs.map(bubbleFor)}
      </div>

      <div className="composer-wrap" style={{ position: 'relative' }}>
        {showMentionPicker && (
          <div className="mention-sheet">
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

        {/* channel selector */}
        <button className="channel-row" onClick={() => setSheet('channel')}>
          <span
            className="channel-chip"
            style={{ background: contact.channel === 'whatsapp' ? '#25D366' : 'var(--blue)' }}
          >
            <WhatsAppLogo width={11} height={11} />
          </span>
          {contact.channel === 'whatsapp' ? 'WhatsApp Business' : channelName[contact.channel]}
          <DownIcon style={{ width: 13, height: 13 }} />
        </button>

        {commentMode && (
          <div className="comment-hint">
            🔒 Internal comment — {firstName} can't see this. Type @ to tag a teammate.
          </div>
        )}

        {recording ? (
          <div className="rec-bar">
            <span className="rec-dot" />
            Recording… {Math.floor(recSeconds / 60)}:{String(recSeconds % 60).padStart(2, '0')}
            <span style={{ flex: 1 }} />
            <button className="rec-cancel" onClick={() => stopRecording(false)}>
              Cancel
            </button>
            <button className="rec-send" onClick={() => stopRecording(true)}>
              Send
            </button>
          </div>
        ) : (
          <div className={`composer${commentMode ? ' comment-mode' : ''}`}>
            <div className="box">
              <textarea
                ref={inputRef}
                rows={1}
                placeholder={
                  commentMode
                    ? 'Comment privately to your team…'
                    : "Use '/' for snippets, '$' for variables"
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
                <SendIcon width={17} height={17} />
              </button>
            </div>
          </div>
        )}

        {/* toolbar: comment · AI · voice · attach · snippets · variables · template */}
        <div className="toolbar">
          <button
            className={`toolbtn orange${commentMode ? ' on' : ''}`}
            onClick={() => {
              setCommentMode((v) => !v);
              inputRef.current?.focus();
            }}
            aria-label="Toggle internal comment mode"
            title="Internal comment (hidden from the contact)"
          >
            <NoteIcon />
          </button>
          <button className="toolbtn" onClick={() => setSheet('ai')} aria-label="AI Prompts" title="AI Prompts">
            <WandIcon />
          </button>
          <button
            className="toolbtn"
            onClick={startRecording}
            aria-label="Record voice message"
            title="Record voice message"
            disabled={recording}
          >
            <MicIcon />
          </button>
          <button className="toolbtn" onClick={() => setSheet('attach')} aria-label="Attach file" title="Attach">
            <ClipIcon />
          </button>
          <button className="toolbtn" onClick={() => setSheet('snippets')} aria-label="Snippets" title="Snippets ( / )">
            <SnippetIcon />
          </button>
          <button className="toolbtn" onClick={() => setSheet('variables')} aria-label="Variables" title="Variables ( $ )">
            <VarIcon />
          </button>
          <button
            className="toolbtn wa"
            onClick={() => setSheet('templates')}
            aria-label="WhatsApp templates"
            title="WhatsApp templates (Meta approved)"
          >
            <WhatsAppLogo width={17} height={17} />
          </button>
        </div>

        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={onFileChosen} />
      </div>

      {sheet && (
        <div className="sheet-backdrop" onClick={closeSheet}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />

            {sheet === 'assign' && (
              <>
                <h3>Assign this conversation</h3>
                <div className="card" style={{ overflow: 'hidden' }}>
                  <button className="list-row" onClick={() => { store.assign(convo.id, null); closeSheet(); }}>
                    <span className="avatar sm" style={{ background: 'var(--ink-3)' }}>—</span>
                    <span className="grow">Unassigned</span>
                  </button>
                  {store.team.filter((t) => !t.pending).map((t) => (
                    <button
                      key={t.id}
                      className="list-row"
                      onClick={() => { store.assign(convo.id, t.id); closeSheet(); }}
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
                      onClick={() => { store.setContactStage(contact.id, s.id); closeSheet(); }}
                    >
                      <span style={{ fontSize: 17 }}>{s.emoji ?? '•'}</span>
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
                    onClick={() => { store.setContactStage(contact.id, null); closeSheet(); }}
                  >
                    <span style={{ width: 17 }} />
                    <span className="grow" style={{ color: 'var(--ink-3)' }}>No stage</span>
                  </button>
                </div>
              </>
            )}

            {sheet === 'more' && (
              <>
                <h3>Conversation</h3>
                <div className="card" style={{ overflow: 'hidden' }}>
                  {(['open', 'snoozed', 'closed'] as const).map((s) => (
                    <button
                      key={s}
                      className="list-row"
                      onClick={() => { store.setStatus(convo.id, s); closeSheet(); }}
                    >
                      <span className="grow">
                        {s === 'open' ? 'Mark as Open' : s === 'snoozed' ? 'Snooze' : 'Close conversation'}
                      </span>
                      {convo.status === s && <span style={{ color: 'var(--blue)' }}>✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}

            {sheet === 'snippets' && (
              <>
                <h3>Snippets</h3>
                <div className="card" style={{ overflow: 'hidden' }}>
                  {store.snippets.map((s) => (
                    <button
                      key={s.shortcut}
                      className="list-row"
                      onClick={() => {
                        setDraft(s.text);
                        closeSheet();
                        inputRef.current?.focus();
                      }}
                    >
                      <span className="grow">
                        <b style={{ color: 'var(--blue)' }}>{s.shortcut}</b>
                        <div className="sub">{s.text}</div>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {sheet === 'variables' && (
              <>
                <h3>Variables</h3>
                <p style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 12 }}>
                  Variables are replaced with the real value when the message is sent.
                </p>
                <div className="card" style={{ overflow: 'hidden' }}>
                  {VARIABLES.map((v) => (
                    <button
                      key={v.token}
                      className="list-row"
                      onClick={() => {
                        setDraft((d) => (d.endsWith('$') ? d.slice(0, -1) : d) + v.token + ' ');
                        closeSheet();
                        inputRef.current?.focus();
                      }}
                    >
                      <span className="grow">
                        <b style={{ color: 'var(--blue)' }}>{v.token}</b>
                        <div className="sub">
                          {v.hint} → {resolveVars(v.token)}
                        </div>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {sheet === 'ai' && (
              <>
                <h3>AI Prompts</h3>
                <div className="card" style={{ overflow: 'hidden' }}>
                  <button className="list-row" onClick={() => aiTransform('friendly')}>
                    <span className="row-icon">😊</span>
                    <span className="grow">
                      Change tone — Friendly
                      <div className="sub">Warmer, casual wording</div>
                    </span>
                  </button>
                  <button className="list-row" onClick={() => aiTransform('professional')}>
                    <span className="row-icon">👔</span>
                    <span className="grow">
                      Change tone — Professional
                      <div className="sub">Formal, business wording</div>
                    </span>
                  </button>
                  <button className="list-row" onClick={() => aiTransform('grammar')}>
                    <span className="row-icon">✓</span>
                    <span className="grow">
                      Fix spelling &amp; grammar
                      <div className="sub">Clean up the draft before sending</div>
                    </span>
                  </button>
                  <button className="list-row" onClick={() => aiTransform('simplify')}>
                    <span className="row-icon">✨</span>
                    <span className="grow">
                      Simplify language
                      <div className="sub">Shorter, easier to read</div>
                    </span>
                  </button>
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 10, lineHeight: 1.5 }}>
                  Demo transforms for now — full AI rewriting and Translate arrive when the app is
                  connected to the PyDent AI backend.
                </p>
              </>
            )}

            {sheet === 'attach' && (
              <>
                <h3>Attach</h3>
                <div className="card" style={{ overflow: 'hidden' }}>
                  <button className="list-row" onClick={() => pickFile('image/*', 'environment')}>
                    <span className="grow">Open Camera</span>
                  </button>
                  <button className="list-row" onClick={() => pickFile('image/*,video/*')}>
                    <span className="grow">Select from Gallery</span>
                  </button>
                  <button className="list-row" onClick={() => pickFile('*/*')}>
                    <span className="grow">Select from Device</span>
                  </button>
                  <button className="list-row" onClick={() => pickFile('application/pdf,image/*')}>
                    <span className="grow">Select from Library</span>
                  </button>
                  <button className="list-row" onClick={closeSheet}>
                    <span className="grow" style={{ color: 'var(--red)' }}>Cancel</span>
                  </button>
                </div>
              </>
            )}

            {sheet === 'templates' && (
              <>
                <h3>WhatsApp templates</h3>
                <p style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 12, lineHeight: 1.5 }}>
                  Templates must be approved by Meta before they can be sent. Approved templates can
                  message customers even outside the 24-hour window.
                </p>
                <div className="card" style={{ overflow: 'hidden' }}>
                  {store.templates.map((t) => (
                    <button
                      key={t.id}
                      className="list-row"
                      disabled={t.status !== 'approved'}
                      style={t.status !== 'approved' ? { opacity: 0.55 } : undefined}
                      onClick={() => {
                        if (t.status !== 'approved') return;
                        store.sendMessage(convo.id, resolveVars(t.body), 'text');
                        closeSheet();
                      }}
                    >
                      <span className="grow">
                        <b>{t.name}</b>{' '}
                        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>({t.language})</span>
                        <div className="sub" dir="auto" style={{ unicodeBidi: 'plaintext' }}>
                          {t.body}
                        </div>
                      </span>
                      <span className={`tpl-status ${t.status}`}>{t.status}</span>
                    </button>
                  ))}
                </div>
                <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => setSheet('newTemplate')}>
                  + New template
                </button>
              </>
            )}

            {sheet === 'newTemplate' && (
              <>
                <h3>New WhatsApp template</h3>
                <label className="field">
                  <span>Template name</span>
                  <input
                    autoFocus
                    placeholder="e.g. followup_offer"
                    value={tplName}
                    onChange={(e) => setTplName(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Message body</span>
                  <textarea
                    rows={4}
                    placeholder="Hi $firstName, …"
                    value={tplBody}
                    onChange={(e) => setTplBody(e.target.value)}
                  />
                </label>
                <button
                  className="btn primary"
                  disabled={!tplName.trim() || !tplBody.trim()}
                  onClick={() => {
                    store.addTemplate(tplName.trim(), 'en', tplBody.trim());
                    setTplName('');
                    setTplBody('');
                    setSheet('templates');
                  }}
                >
                  Submit for Meta approval
                </button>
                <p style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 10, lineHeight: 1.5 }}>
                  The template is saved as <b>pending</b>. Once Meta approves it (usually minutes to
                  hours), it becomes sendable here automatically.
                </p>
              </>
            )}

            {sheet === 'channel' && (
              <>
                <h3>Send via</h3>
                <div className="card" style={{ overflow: 'hidden' }}>
                  <button className="list-row" onClick={closeSheet}>
                    <span className="grow">
                      <b>
                        {contact.channel === 'whatsapp'
                          ? 'WhatsApp Business'
                          : channelName[contact.channel]}
                      </b>
                      <div className="sub">Connected · this contact's channel</div>
                    </span>
                    <span style={{ color: 'var(--blue)' }}>✓</span>
                  </button>
                  <div className="list-row" style={{ opacity: 0.5 }}>
                    <span className="grow">
                      Other channels
                      <div className="sub">
                        Channels connect automatically from the software this workspace comes from
                        (PyDent AI).
                      </div>
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
