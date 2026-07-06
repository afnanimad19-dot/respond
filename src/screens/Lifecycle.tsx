import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/AppStore';
import { BackIcon, DownIcon, PlusIcon, TrashIcon, UpIcon } from '../components/icons';

const COLORS = ['#0A84FF', '#30B0C7', '#FF9F0A', '#34C759', '#FF6482', '#FF453A', '#8E8E93', '#005FCC'];

export function Lifecycle() {
  const store = useStore();
  const nav = useNavigate();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const openAdd = () => {
    setName('');
    setDescription('');
    setEmoji('');
    setColor(COLORS[store.lifecycle.length % COLORS.length]);
    setAdding(true);
    setEditing(null);
  };

  const openEdit = (id: string) => {
    const s = store.lifecycle.find((x) => x.id === id);
    if (!s) return;
    setName(s.name);
    setDescription(s.description ?? '');
    setEmoji(s.emoji ?? '');
    setColor(s.color);
    setEditing(id);
    setAdding(false);
  };

  const save = () => {
    if (!name.trim()) return;
    if (adding) {
      store.addStage(name.trim(), color, description.trim() || undefined, emoji.trim() || undefined);
    } else if (editing) {
      store.updateStage(editing, {
        name: name.trim(),
        color,
        description: description.trim() || undefined,
        emoji: emoji.trim() || undefined
      });
    }
    setAdding(false);
    setEditing(null);
  };

  const countFor = (stageId: string) =>
    store.contacts.filter((c) => c.lifecycleStageId === stageId).length;

  const formOpen = adding || editing !== null;

  return (
    <>
      <header className="topbar glass">
        <button className="iconbtn" onClick={() => nav(-1)} aria-label="Back">
          <BackIcon />
        </button>
        <h1 style={{ fontSize: 22 }}>Lifecycle</h1>
        <button className="iconbtn" onClick={openAdd} aria-label="Add stage">
          <PlusIcon />
        </button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.5, marginBottom: 14 }}>
          Stages let your team see exactly where every lead is — who is new, who is interested,
          and who is ready to buy. Move contacts between stages from any chat.
        </p>

        <div className="card" style={{ overflow: 'hidden' }}>
          {store.lifecycle.map((s, i) => (
            <div key={s.id} className="list-row">
              {s.emoji ? (
                <span style={{ fontSize: 17, width: 20, textAlign: 'center', flexShrink: 0 }}>
                  {s.emoji}
                </span>
              ) : (
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: s.color,
                    flexShrink: 0
                  }}
                />
              )}
              <button className="grow" style={{ textAlign: 'left' }} onClick={() => openEdit(s.id)}>
                <b>{s.name}</b>
                <div className="sub">
                  {countFor(s.id)} contact{countFor(s.id) === 1 ? '' : 's'}
                  {s.description ? ` · ${s.description}` : ''}
                </div>
              </button>
              <button
                onClick={() => store.moveStage(s.id, -1)}
                disabled={i === 0}
                style={{ opacity: i === 0 ? 0.25 : 1, color: 'var(--ink-2)' }}
                aria-label="Move up"
              >
                <UpIcon width={18} height={18} />
              </button>
              <button
                onClick={() => store.moveStage(s.id, 1)}
                disabled={i === store.lifecycle.length - 1}
                style={{ opacity: i === store.lifecycle.length - 1 ? 0.25 : 1, color: 'var(--ink-2)' }}
                aria-label="Move down"
              >
                <DownIcon width={18} height={18} />
              </button>
              <button
                onClick={() => store.removeStage(s.id)}
                style={{ color: 'var(--red)' }}
                aria-label="Delete stage"
              >
                <TrashIcon width={18} height={18} />
              </button>
            </div>
          ))}
        </div>

        <button className="btn ghost" style={{ marginTop: 14 }} onClick={openAdd}>
          <PlusIcon width={18} height={18} /> New stage
        </button>
      </div>

      {formOpen && (
        <div className="sheet-backdrop" onClick={() => { setAdding(false); setEditing(null); }}>
          <div className="sheet glass" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />
            <h3>{adding ? 'New lifecycle stage' : 'Edit stage'}</h3>
            <label className="field">
              <span>Name</span>
              <input
                autoFocus
                placeholder="e.g. Interested"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Emoji (optional)</span>
              <input
                placeholder="e.g. 🔥"
                value={emoji}
                maxLength={4}
                onChange={(e) => setEmoji(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Description (optional)</span>
              <input
                placeholder="What does this stage mean?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <div className="field">
              <span>Color</span>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: c,
                      border: color === c ? '3px solid var(--ink)' : '3px solid transparent'
                    }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <button className="btn primary" onClick={save} disabled={!name.trim()}>
              {adding ? 'Add stage' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
