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
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <div className="brand-mark">
            <ServerCog size={20} />
          </div>
          <div>
            <strong>VM Monitor</strong>
            <span>Operations Console</span>
          </div>
        </div>

        <nav className="nav-list">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Gauge size={18} />
            <span>Overview</span>
          </NavLink>
          <NavLink to="/vms" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Monitor size={18} />
            <span>Virtual Machines</span>
          </NavLink>
          <NavLink to="/alerts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <AlertTriangle size={18} />
            <span>Alerts</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>
        </nav>
        {user ? (
          <div className="sidebar-account">
            <span>{user.authType === 'ldap' ? 'AD account' : 'Local admin'}</span>
            <strong>{user.username}</strong>
            <button className="button secondary account-logout" type="button" onClick={onLogout}>
              <LogOut size={16} />
              Log out
            </button>
          </div>
        ) : null}
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
