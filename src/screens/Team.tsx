import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/AppStore';
import { BackIcon, PlusIcon } from '../components/icons';
import { Role } from '../lib/types';

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: 'owner', label: 'Owner', hint: 'Full control of the workspace' },
  { value: 'manager', label: 'Manager', hint: 'Manage team, lifecycle and all chats' },
  { value: 'doctor', label: 'Doctor', hint: 'Talk to patients and leads assigned to them' },
  { value: 'agent', label: 'Agent', hint: 'Reply to conversations and update stages' }
];

export function Team() {
  const store = useStore();
  const nav = useNavigate();
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('agent');
  const [sent, setSent] = useState<string | null>(null);

  const invite = () => {
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return;
    store.inviteMember(e, role);
    setSent(e);
    setEmail('');
    setInviting(false);
  };

  return (
    <>
      <header className="topbar glass">
        <button className="iconbtn" onClick={() => nav(-1)} aria-label="Back">
          <BackIcon />
        </button>
        <h1 style={{ fontSize: 22 }}>Team</h1>
        <button className="iconbtn" onClick={() => setInviting(true)} aria-label="Invite">
          <PlusIcon />
        </button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {sent && (
          <div
            style={{
              background: 'rgba(52,199,89,.12)',
              color: 'var(--green)',
              fontWeight: 600,
              fontSize: 14,
              padding: '10px 14px',
              borderRadius: 14,
              marginBottom: 14
            }}
          >
            ✉️ Invitation sent to {sent}. They'll join your workspace with the same email once
            they accept.
          </div>
        )}

        <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.5, marginBottom: 14 }}>
          Invite doctors and staff by email. They sign in with their own account, land in the
          same workspace, and see the same inbox — with the role you give them.
        </p>

        <div className="card" style={{ overflow: 'hidden' }}>
          {store.team.map((m) => (
            <div key={m.id} className="list-row">
              <span className="avatar sm" style={{ background: m.color }}>
                {m.name.charAt(0)}
              </span>
              <span className="grow">
                <b>{m.name}</b>
                {m.online && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: 'var(--green)',
                      marginLeft: 6
                    }}
                  />
                )}
                <div className="sub">{m.email}</div>
              </span>
              {m.pending ? (
                <span className="role-badge pending">invited</span>
              ) : (
                <select
                  value={m.role}
                  onChange={(e) => store.setMemberRole(m.id, e.target.value as Role)}
                  disabled={m.id === store.session?.userId}
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 999,
                    padding: '4px 8px',
                    fontSize: 12,
                    fontWeight: 700,
                    background: 'var(--blue-soft)',
                    color: 'var(--blue)'
                  }}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              )}
              {m.id !== store.session?.userId && (
                <button
                  onClick={() => store.removeMember(m.id)}
                  style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700 }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => setInviting(true)}>
          <PlusIcon width={18} height={18} /> Invite by email
        </button>
      </div>

      {inviting && (
        <div className="sheet-backdrop" onClick={() => setInviting(false)}>
          <div className="sheet glass" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />
            <h3>Invite a teammate</h3>
            <label className="field">
              <span>Email address</span>
              <input
                autoFocus
                type="email"
                inputMode="email"
                placeholder="doctor@yourclinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <div className="field">
              <span>Role</span>
              <div className="card" style={{ overflow: 'hidden' }}>
                {ROLES.map((r) => (
                  <button key={r.value} className="list-row" onClick={() => setRole(r.value)}>
                    <span className="grow">
                      <b>{r.label}</b>
                      <div className="sub">{r.hint}</div>
                    </span>
                    {role === r.value && <span style={{ color: 'var(--blue)' }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="btn primary"
              onClick={invite}
              disabled={!/^\S+@\S+\.\S+$/.test(email.trim())}
            >
              Send invitation
            </button>
          </div>
        </div>
      )}
    </>
  );
}
