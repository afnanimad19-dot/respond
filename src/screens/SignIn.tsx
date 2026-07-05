import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/AppStore';

export function SignIn() {
  const { signIn, supabaseConfigured } = useStore();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await signIn(email, password, workspace);
    setBusy(false);
    if (err) {
      setError(err);
    } else {
      nav('/inbox', { replace: true });
    }
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '40px 26px calc(30px + var(--safe-bottom))'
      }}
    >
      <div style={{ marginBottom: 34 }}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 24,
            background: 'linear-gradient(160deg,#2f9bff,var(--blue) 55%,var(--blue-deep) 140%)',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontSize: 38,
            fontWeight: 800,
            boxShadow: '0 14px 34px rgba(10,132,255,.4)',
            marginBottom: 22
          }}
        >
          R
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.5px' }}>
          Welcome to Responde 👋
        </h1>
        <p style={{ color: 'var(--ink-2)', marginTop: 8, fontSize: 15.5, lineHeight: 1.45 }}>
          Sign in with the same account you use in <b>PyDent</b> or any other LHDM clinic
          software. Your workspace, channels and contacts come with you.
        </p>
      </div>

      {error && <div className="error-note">{error}</div>}

      <form onSubmit={submit}>
        <label className="field">
          <span>Email address</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@yourclinic.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingRight: 64 }}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--blue)',
                fontWeight: 700,
                fontSize: 13
              }}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        <label className="field">
          <span>Workspace name or ID (optional)</span>
          <input
            placeholder="e.g. Bright Smile Dental"
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
          />
        </label>

        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <button
        className="btn"
        style={{ color: 'var(--blue)', fontWeight: 600, marginTop: 6 }}
        type="button"
      >
        Reset Password
      </button>

      <p
        style={{
          textAlign: 'center',
          color: 'var(--ink-3)',
          fontSize: 13,
          marginTop: 26,
          lineHeight: 1.5
        }}
      >
        {supabaseConfigured
          ? 'Connected to your clinic workspace.'
          : 'Demo mode — no backend connected yet, so any email and password opens the sample PyDent workspace.'}
        <br />
        To sign up, create an account in your clinic software first.
      </p>
    </div>
  );
}
