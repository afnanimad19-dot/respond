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
  const [available, setAvailable] = useState(true);
  const [haptics, setHaptics] = useState(true);

  const s = store.session!;

  return (
    <>
      <header className="topbar glass" style={{ justifyContent: 'center' }}>
        <h1 style={{ textAlign: 'center', flex: 1 }}>Profile</h1>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
        <div className="profile-head">
          <div className="big-avatar">{s.name.charAt(0).toUpperCase()}</div>
          <div className="pname">{s.name}</div>
          <div className="pmail">{s.email}</div>
          <div className="pworkspace">
            {s.workspace.name} · via {s.workspace.sourceApp}
            {s.demo ? ' · demo' : ''}
          </div>
        </div>

        <div className="section-label">General</div>
        <div className="card" style={{ margin: '0 18px', overflow: 'hidden' }}>
          <button className="list-row" onClick={() => setAvailable((v) => !v)}>
            <span className="row-icon">🟢</span>
            <span className="grow">
              Availability
              <div className="sub">
                {available
                  ? 'You are available — new chats can be assigned to you'
                  : 'You are busy — new chats go to teammates'}
              </div>
            </span>
            <span className={`switch${available ? ' on' : ''}`} />
          </button>
        </div>

        <div className="section-label">Workspace</div>
        <div className="card" style={{ margin: '0 18px', overflow: 'hidden' }}>
          <button className="list-row" onClick={() => nav('/lifecycle')}>
            <span className="row-icon">
              <FlowIcon />
            </span>
            <span className="grow">
              Lifecycle stages
              <div className="sub">{store.lifecycle.map((x) => x.name).join(' → ')}</div>
            </span>
            <ChevronIcon style={{ color: 'var(--ink-3)', width: 18 }} />
          </button>
          <button className="list-row" onClick={() => nav('/team')}>
            <span className="row-icon">
              <PeopleIcon />
            </span>
            <span className="grow">
              Team &amp; roles
              <div className="sub">
                {store.team.filter((m) => !m.pending).length} members
                {store.team.some((m) => m.pending)
                  ? ` · ${store.team.filter((m) => m.pending).length} invited`
                  : ''}
              </div>
            </span>
            <ChevronIcon style={{ color: 'var(--ink-3)', width: 18 }} />
          </button>
          <button className="list-row">
            <span className="row-icon">
              <BellIcon />
            </span>
            <span className="grow">
              Notifications
              <div className="sub">Mentions, assignments and new messages</div>
            </span>
            <ChevronIcon style={{ color: 'var(--ink-3)', width: 18 }} />
          </button>
        </div>

        <div className="section-label">App</div>
        <div className="card" style={{ margin: '0 18px', overflow: 'hidden' }}>
          <div className="list-row">
            <span className="row-icon">
              <MoonIcon />
            </span>
            <span className="grow">
              Dark mode
              <div className="sub">Follows your system setting automatically</div>
            </span>
          </div>
          <button className="list-row" onClick={() => setHaptics((v) => !v)}>
            <span className="row-icon">📳</span>
            <span className="grow">Haptic feedback</span>
            <span className={`switch${haptics ? ' on' : ''}`} />
          </button>
        </div>

        <div className="section-label">Account</div>
        <div className="card" style={{ margin: '0 18px', overflow: 'hidden' }}>
          <button
            className="list-row"
            style={{ color: 'var(--red)' }}
            onClick={() => {
              store.signOut();
              nav('/', { replace: true });
            }}
          >
            <span className="row-icon" style={{ background: 'rgba(240,68,56,.09)', color: 'var(--red)' }}>
              <LogoutIcon />
            </span>
            <span className="grow" style={{ fontWeight: 600 }}>
              Log out
            </span>
            <ChevronIcon style={{ color: 'var(--ink-3)', width: 18 }} />
          </button>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 11.5, marginTop: 22 }}>
          Responde v0.1 · linked to {s.workspace.sourceApp}
        </p>
      </div>

      <BottomNav />
    </>
  );
}
