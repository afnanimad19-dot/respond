import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/AppStore';
import { BottomNav } from '../components/BottomNav';
import {
  BellIcon,
  ChevronIcon,
  FlowIcon,
  LogoutIcon,
  MoonIcon,
  PeopleIcon
} from '../components/icons';

export function Settings() {
  const store = useStore();
  const nav = useNavigate();
  const [busyStatus, setBusyStatus] = useState(false);
  const [haptics, setHaptics] = useState(true);

  const s = store.session!;

  return (
    <>
      <header className="topbar glass">
        <h1>Settings</h1>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
        <div style={{ padding: 16 }}>
          <div className="card list-row" style={{ borderBottom: 0 }}>
            <span
              className="avatar"
              style={{
                background: 'linear-gradient(160deg,#2f9bff,var(--blue-deep))',
                width: 56,
                height: 56
              }}
            >
              {s.name.charAt(0).toUpperCase()}
            </span>
            <span className="grow">
              <b style={{ fontSize: 18 }}>{s.name}</b>
              <div className="sub">{s.email}</div>
              <div className="sub" style={{ color: 'var(--blue)', fontWeight: 700 }}>
                {s.workspace.name} · via {s.workspace.sourceApp}
                {s.demo ? ' · Demo' : ''}
              </div>
            </span>
            <ChevronIcon style={{ color: 'var(--ink-3)' }} />
          </div>
        </div>

        <div className="section-label">General</div>
        <div className="card" style={{ margin: '0 16px', overflow: 'hidden' }}>
          <button className="list-row" onClick={() => setBusyStatus((v) => !v)}>
            <span className="grow">
              Set yourself as <b>{busyStatus ? 'Available' : 'Busy'}</b>
              <div className="sub">
                You are currently {busyStatus ? 'busy — new chats go to teammates' : 'available'}
              </div>
            </span>
            <span className={`switch${!busyStatus ? ' on' : ''}`} />
          </button>
        </div>

        <div className="section-label">Workspace</div>
        <div className="card" style={{ margin: '0 16px', overflow: 'hidden' }}>
          <button className="list-row" onClick={() => nav('/lifecycle')}>
            <FlowIcon style={{ color: 'var(--blue)' }} />
            <span className="grow">
              Lifecycle stages
              <div className="sub">{store.lifecycle.map((x) => x.name).join(' → ')}</div>
            </span>
            <ChevronIcon style={{ color: 'var(--ink-3)' }} />
          </button>
          <button className="list-row" onClick={() => nav('/team')}>
            <PeopleIcon style={{ color: 'var(--blue)' }} />
            <span className="grow">
              Team &amp; roles
              <div className="sub">
                {store.team.filter((m) => !m.pending).length} members
                {store.team.some((m) => m.pending)
                  ? ` · ${store.team.filter((m) => m.pending).length} invited`
                  : ''}
              </div>
            </span>
            <ChevronIcon style={{ color: 'var(--ink-3)' }} />
          </button>
          <button className="list-row">
            <BellIcon style={{ color: 'var(--blue)' }} />
            <span className="grow">
              Update notifications
              <div className="sub">Mentions, assignments and new messages</div>
            </span>
            <ChevronIcon style={{ color: 'var(--ink-3)' }} />
          </button>
        </div>

        <div className="section-label">App</div>
        <div className="card" style={{ margin: '0 16px', overflow: 'hidden' }}>
          <div className="list-row">
            <MoonIcon style={{ color: 'var(--blue)' }} />
            <span className="grow">
              Dark mode
              <div className="sub">Follows your system setting automatically</div>
            </span>
          </div>
          <button className="list-row" onClick={() => setHaptics((v) => !v)}>
            <span style={{ fontSize: 18 }}>📳</span>
            <span className="grow">Haptic feedback</span>
            <span className={`switch${haptics ? ' on' : ''}`} />
          </button>
        </div>

        <div className="section-label">Account</div>
        <div className="card" style={{ margin: '0 16px', overflow: 'hidden' }}>
          <button
            className="list-row"
            style={{ color: 'var(--red)' }}
            onClick={() => {
              store.signOut();
              nav('/', { replace: true });
            }}
          >
            <LogoutIcon />
            <span className="grow" style={{ fontWeight: 700 }}>
              Sign out
            </span>
          </button>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 12, marginTop: 22 }}>
          Responde v0.1 · linked to {s.workspace.sourceApp}
        </p>
      </div>

      <BottomNav />
    </>
  );
}
