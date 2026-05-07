import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { RouteScrollManager } from './components/RouteScrollManager';
import { AuthProvider, useAuth } from './lib/auth';
import { AlertsPage } from './pages/AlertsPage';
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { VmDetail } from './pages/VmDetail';
import { VmListPage } from './pages/VmListPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedConsole />} />
      </Routes>
    </AuthProvider>
  );
}

function ProtectedConsole() {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: { pathname: location.pathname, search: location.search } }} />;
  }

  return (
    <AppShell user={auth.user} onLogout={auth.logout}>
      <RouteScrollManager />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/vms" element={<VmListPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/vms/:vmId" element={<VmDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
