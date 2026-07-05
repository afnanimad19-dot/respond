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
        padding: '44px 26px calc(30px + var(--safe-bottom))'
      }}
    >
      <div style={{ marginBottom: 30 }}>
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 18,
            background: 'var(--blue)',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontSize: 27,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            boxShadow: '0 10px 26px rgba(31,107,255,.32)',
            marginBottom: 20
          }}
        >
          R
        </div>
        <h1 style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-0.03em' }}>
          Welcome to Responde
        </h1>
        <p style={{ color: 'var(--ink-2)', marginTop: 7, fontSize: 14, lineHeight: 1.55 }}>
          Sign in with the account you already use in <b>PyDent AI</b> or any other LHDM
          software. Your workspace, channels and customers come with you.
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
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--blue)',
                fontWeight: 600,
                fontSize: 12.5
              }}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        <label className="field">
          <span>Workspace (optional)</span>
          <input
            placeholder="e.g. Bright Smile Dental"
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
          />
        </label>

        <button className="btn primary" type="submit" disabled={busy} style={{ marginTop: 4 }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <button
        className="btn"
        style={{ color: 'var(--blue)', fontWeight: 600, marginTop: 4, fontSize: 14 }}
        type="button"
      >
        Reset password
      </button>

      <p
        style={{
          textAlign: 'center',
          color: 'var(--ink-3)',
          fontSize: 12,
          marginTop: 24,
          lineHeight: 1.55
        }}
      >
        {supabaseConfigured
          ? 'Connected to your clinic workspace.'
          : 'Demo mode — no backend connected yet, so any email and password opens the sample workspace.'}
        <br />
        To sign up, create an account in your clinic software first.
      </p>
    </div>
  );
}
