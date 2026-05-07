import { AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { mockVms } from '../data/mockVms';
import { fetchVms } from '../lib/apiClient';
import { useAuth } from '../lib/auth';
import { getActiveAlerts, sortAlertsBySeverity } from '../lib/vmUtils';

export function AlertsPage() {
  const location = useLocation();
  const { token } = useAuth();
  const [vms, setVms] = useState(() => (token ? [] : mockVms));
  const returnState = {
    from: {
      pathname: location.pathname,
      search: location.search
    }
  };
  const activeAlerts = useMemo(() => sortAlertsBySeverity(getActiveAlerts(vms)), [vms]);
  const recentEvents = useMemo(
    () => vms
      .flatMap((vm) => vm.events.map((event) => ({ ...event, vmName: vm.name, vmId: vm.id })))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [vms]
  );

  useEffect(() => {
    let cancelled = false;
    fetchVms(token ?? undefined).then((items) => {
      if (!cancelled) {
        setVms(items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Alert center</span>
          <h1>Alerts</h1>
          <p>Active VM alerts and recent operational events from mock telemetry.</p>
        </div>
        <StatusBadge severity={activeAlerts.some((alert) => alert.severity === 'critical') ? 'critical' : 'warning'} label={`${activeAlerts.length} active`} />
      </header>

      <section className="content-grid">
        <div className="panel wide">
          <div className="section-heading">
            <div>
              <h2>Active Alerts</h2>
              <p>Sorted by severity for quick triage.</p>
            </div>
            <AlertTriangle size={18} />
          </div>
          <div className="alert-list">
            {activeAlerts.map((alert) => {
              const vm = vms.find((item) => item.id === alert.vmId);
              return (
                <Link className="alert-item interactive-item" key={alert.id} to={`/vms/${alert.vmId}`} state={returnState}>
                  <StatusBadge severity={alert.severity} />
                  <div>
                    <strong>{vm?.name ?? alert.vmId} / {alert.resource}</strong>
                    <span>{alert.message}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <aside className="panel">
          <div className="section-heading">
            <div>
              <h2>Recent Events</h2>
              <p>Latest activity across the monitored fleet.</p>
            </div>
          </div>
          <div className="event-list compact-events">
            {recentEvents.slice(0, 8).map((event) => (
              <Link className="event-item interactive-item" key={event.id} to={`/vms/${event.vmId}`} state={returnState}>
                <span>{event.vmName} / {event.type}</span>
                <strong>{event.message}</strong>
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
