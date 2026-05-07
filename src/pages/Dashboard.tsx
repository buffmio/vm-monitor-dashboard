import { Activity, AlertTriangle, Cpu, HardDrive, MemoryStick, Server } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { LineChart } from '../components/LineChart';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { mockVms } from '../data/mockVms';
import { fetchVms } from '../lib/apiClient';
import { useAuth } from '../lib/auth';
import { calculateFleetSummary, getActiveAlerts, sortAlertsBySeverity } from '../lib/vmUtils';

export function Dashboard() {
  const { token } = useAuth();
  const [refreshCount, setRefreshCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [vms, setVms] = useState(() => (token ? [] : mockVms));

  const summary = useMemo(() => calculateFleetSummary(vms), [vms]);
  const activeAlerts = useMemo(() => sortAlertsBySeverity(getActiveAlerts(vms)), [vms]);
  const recentEvents = useMemo(
    () =>
      vms
        .flatMap((vm) => vm.events.map((event) => ({ ...event, vmName: vm.name })))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 5),
    [vms]
  );
  const trendSource = vms.find((vm) => vm.metricHistory.length > 0) ?? vms[0];
  const lastRefreshed = new Date(Date.now() + refreshCount * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  useEffect(() => {
    if (!isRefreshing) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsRefreshing(false);
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [isRefreshing]);

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
  }, [refreshCount, token]);

  function refreshTelemetry() {
    setIsRefreshing(true);
    setRefreshCount((count) => count + 1);
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Production fleet</span>
          <h1>VM Monitoring Overview</h1>
          <p>Fleet health, resource pressure, alerts, and recent VM activity.</p>
        </div>
        <div className="header-actions">
          <StatusBadge severity={summary.critical > 0 ? 'critical' : summary.warning > 0 ? 'warning' : 'info'} label={
            summary.critical > 0 ? 'Attention required' : summary.warning > 0 ? 'Warnings active' : 'Healthy'
          } />
          <button
            className={`button secondary refresh-button ${isRefreshing ? 'refreshing' : ''}`}
            type="button"
            onClick={refreshTelemetry}
          >
            <Activity size={16} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      <section className={`status-strip ${isRefreshing ? 'refresh-pulse' : ''}`} aria-live="polite">
        <div>
          <span>Environment</span>
          <strong>Production and staging</strong>
        </div>
        <div>
          <span>Last refreshed</span>
          <strong>{lastRefreshed}</strong>
        </div>
        <div>
          <span>Data source</span>
          <strong>{token ? 'Panel API' : 'Local demo fallback'}</strong>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard label="Total VMs" value={summary.total} detail="Open full VM inventory" tone="accent" icon={<Server size={18} />} to="/vms" />
        <MetricCard label="Running" value={summary.running} detail={`${summary.stopped} stopped`} tone="good" icon={<Activity size={18} />} to="/vms?status=running" />
        <MetricCard label="Warnings" value={summary.warning} detail={`${summary.activeAlerts} active alerts`} tone="warning" icon={<AlertTriangle size={18} />} to="/vms?status=warning" />
        <MetricCard label="Critical" value={summary.critical} detail="Needs operator review" tone="critical" icon={<AlertTriangle size={18} />} to="/vms?status=critical" />
        <MetricCard label="Avg CPU" value={`${summary.averageCpu}%`} detail="Fleet average" tone="neutral" icon={<Cpu size={18} />} />
        <MetricCard label="Avg Memory" value={`${summary.averageMemory}%`} detail="Fleet average" tone="neutral" icon={<MemoryStick size={18} />} />
      </section>

      <section className="content-grid">
        <div className="panel wide">
          <div className="section-heading">
            <div>
              <h2>Resource Trends</h2>
              <p>{trendSource ? `Representative telemetry from ${trendSource.name}` : 'Approved VMs will appear here after Agent enrollment'}</p>
            </div>
            <HardDrive size={18} />
          </div>
          <div className="chart-grid">
            {trendSource ? (
              <>
                <LineChart title="CPU" points={trendSource.metricHistory} metric="cpu" unit="%" tone="blue" />
                <LineChart title="Memory" points={trendSource.metricHistory} metric="memory" unit="%" tone="violet" />
                <LineChart title="Disk" points={trendSource.metricHistory} metric="disk" unit="%" tone="amber" />
                <LineChart title="Network In" points={trendSource.metricHistory} metric="networkIn" unit="MB/s" tone="green" />
              </>
            ) : (
              <div className="empty-state">No approved VM telemetry yet.</div>
            )}
          </div>
        </div>

        <aside className="panel">
          <div className="section-heading">
            <div>
              <h2>Health Summary</h2>
              <p>Active alerts and latest events</p>
            </div>
          </div>
          <div className="alert-list">
            {activeAlerts.slice(0, 4).map((alert) => (
              <div className="alert-item" key={alert.id}>
                <StatusBadge severity={alert.severity} />
                <div>
                  <strong>{alert.resource}</strong>
                  <span>{alert.message}</span>
                </div>
              </div>
            ))}
            {activeAlerts.length === 0 ? <div className="empty-state">No active alerts.</div> : null}
          </div>
          <div className="event-list">
            {recentEvents.map((event) => (
              <div className="event-item" key={event.id}>
                <span>{event.vmName}</span>
                <strong>{event.message}</strong>
              </div>
            ))}
            {recentEvents.length === 0 ? <div className="empty-state">No recent events.</div> : null}
          </div>
        </aside>
      </section>

    </div>
  );
}
