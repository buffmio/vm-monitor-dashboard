import { AlertTriangle, Gauge, LogOut, Monitor, Settings, ServerCog } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import type { ApiUser } from '../lib/apiClient';

interface AppShellProps {
  children: ReactNode;
  user?: ApiUser | null;
  onLogout?: () => void;
}

export function AppShell({ children, user, onLogout }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="brand">
          <div className="brand-mark">
            <ServerCog size={20} />
          </div>
          <div>
            <strong>VM Monitor</strong>
            <span>运维控制台</span>
          </div>
        </div>

        <nav className="nav-list">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Gauge size={18} />
            <span>总览</span>
          </NavLink>
          <NavLink to="/vms" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Monitor size={18} />
            <span>虚拟机</span>
          </NavLink>
          <NavLink to="/alerts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <AlertTriangle size={18} />
            <span>告警</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={18} />
            <span>设置</span>
          </NavLink>
        </nav>
        {user ? (
          <div className="sidebar-account">
            <span>{user.authType === 'ldap' ? 'AD 账号' : '本地管理员'}</span>
            <strong>{user.username}</strong>
            <button className="button secondary account-logout" type="button" onClick={onLogout}>
              <LogOut size={16} />
              退出
            </button>
          </div>
        ) : null}
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
