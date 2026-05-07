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
      setError('登录失败，请检查本地管理员密码或 AD 账号权限。');
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
            <span>运维控制台</span>
          </div>
        </div>
        <div>
          <span className="eyebrow">身份验证</span>
          <h1>登录</h1>
        </div>
        <label className="form-field">
          <span>用户名</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
        </label>
        <label className="form-field">
          <span>密码</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
        <button className="button primary" type="submit">
          <LockKeyhole size={16} />
          登录
        </button>
      </form>
    </main>
  );
}
