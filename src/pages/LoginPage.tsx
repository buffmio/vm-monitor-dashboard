import { LockKeyhole, ServerCog } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const from = (location.state as { from?: { pathname: string; search?: string } } | null)?.from;
  const returnTarget = `${from?.pathname ?? '/'}${from?.search ?? ''}`;

  if (auth.isAuthenticated) {
    return <Navigate to={returnTarget} replace />;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await auth.login(username, password);
      navigate(returnTarget, { replace: true });
    } catch {
      setError('Login failed. Check the local admin password or AD account access.');
    }
  }

  return (
    <main className="login-page">
      <form className="login-panel" onSubmit={submit}>
        <div className="brand login-brand">
          <div className="brand-mark">
            <ServerCog size={20} />
          </div>
          <div>
            <strong>VM Monitor</strong>
            <span>Operations Console</span>
          </div>
        </div>
        <div>
          <span className="eyebrow">Authentication</span>
          <h1>Sign in</h1>
        </div>
        <label className="form-field">
          <span>Username</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
        </label>
        <label className="form-field">
          <span>Password</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
        <button className="button primary" type="submit">
          <LockKeyhole size={16} />
          Sign in
        </button>
      </form>
    </main>
  );
}
