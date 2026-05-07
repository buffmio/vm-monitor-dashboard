import { ArrowLeft, Cpu, HardDrive, MemoryStick, Network, Server } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { LineChart } from '../components/LineChart';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { mockVms } from '../data/mockVms';
import { fetchVm } from '../lib/apiClient';
import { useAuth } from '../lib/auth';
import { findVmById, formatMetric, getActiveAlerts, sortAlertsBySeverity } from '../lib/vmUtils';

export function VmDetail() {
  const { vmId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const [vm, setVm] = useState(() => (token ? undefined : findVmById(mockVms, vmId)));
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const from = (location.state as { from?: { pathname: string; search?: string } } | null)?.from;
  const returnTarget = `${from?.pathname ?? '/vms'}${from?.search ?? ''}`;
  const returnLabel = from?.pathname === '/alerts' ? 'Back to Alerts' : 'Back to VM List';

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchVm(vmId, token ?? undefined).then((item) => {
      if (!cancelled) {
        setVm(item);
        setIsLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setVm(undefined);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token, vmId]);

  if (isLoading) {
    return (
      <div className="not-found">
        <Server size={34} />
        <h1>Loading VM</h1>
        <p>Fetching the latest VM details from the panel API.</p>
      </div>
    );
  }

  if (!vm) {
    return (
      <div className="not-found">
        <Server size={34} />
        <h1>VM not found</h1>
        <p>The selected virtual machine does not exist in the demo data.</p>
        <button className="button primary" type="button" onClick={() => navigate(returnTarget)}>
          <ArrowLeft size={16} />
          {returnLabel}
        </button>
      </div>
    );
  }

  const activeAlerts = sortAlertsBySeverity(getActiveAlerts([vm]));
  const networkTotal = vm.currentMetrics.networkIn + vm.currentMetrics.networkOut;
  const ownerLabel = vm.owner || 'Unassigned';

  return (
    <div className="page-stack">
      <header className="page-header detail-header">
        <div>
          <button className="button ghost" type="button" onClick={() => navigate(returnTarget)}>
            <ArrowLeft size={16} />
            {returnLabel}
          </button>
          <span className="eyebrow">{vm.environment} / {vm.region}</span>
          <h1>{vm.name}</h1>
          <p>{vm.ipAddress} in {vm.region} running {vm.os}</p>
        </div>
        <StatusBadge status={vm.status} />
      </header>

      <section className="metric-grid detail-metrics">
        <MetricCard label="CPU" value={formatMetric(vm.currentMetrics.cpu, '%')} detail={`${vm.vcpu} vCPU allocated`} tone="accent" icon={<Cpu size={18} />} />
        <MetricCard label="Memory" value={formatMetric(vm.currentMetrics.memory, '%')} detail={`${vm.memoryGb} GB RAM`} tone="warning" icon={<MemoryStick size={18} />} />
        <MetricCard label="Disk" value={formatMetric(vm.currentMetrics.disk, '%')} detail={`${vm.storageGb} GB storage`} tone={vm.currentMetrics.disk > 90 ? 'critical' : 'neutral'} icon={<HardDrive size={18} />} />
        <MetricCard label="Network" value={formatMetric(networkTotal, 'MB/s')} detail="In plus out throughput" tone="good" icon={<Network size={18} />} />
        <MetricCard label="Uptime" value={vm.uptime} detail={`Owner: ${ownerLabel}`} tone="neutral" />
        <MetricCard label="Active alerts" value={activeAlerts.length} detail={activeAlerts.length ? 'Review required' : 'No active alerts'} tone={activeAlerts.length ? 'critical' : 'good'} />
      </section>

      <section className="content-grid">
        <div className="panel wide">
          <div className="section-heading">
            <div>
              <h2>Telemetry</h2>
              <p>Latest metric history reported by the VM Agent.</p>
            </div>
          </div>
          <div className="chart-grid">
            <LineChart title="CPU" points={vm.metricHistory} metric="cpu" unit="%" tone="blue" />
            <LineChart title="Memory" points={vm.metricHistory} metric="memory" unit="%" tone="violet" />
            <LineChart title="Disk" points={vm.metricHistory} metric="disk" unit="%" tone="amber" />
            <LineChart title="Network Out" points={vm.metricHistory} metric="networkOut" unit="MB/s" tone="green" />
          </div>
        </div>

        <aside className="panel">
          <div className="section-heading">
            <div>
              <h2>Configuration</h2>
              <p>Provisioning and ownership details</p>
            </div>
          </div>
          <dl className="config-grid">
            <div><dt>vCPU</dt><dd>{vm.vcpu}</dd></div>
            <div><dt>Memory</dt><dd>{vm.memoryGb} GB</dd></div>
            <div><dt>Storage</dt><dd>{vm.storageGb} GB</dd></div>
            <div><dt>OS</dt><dd>{vm.os}</dd></div>
            <div><dt>Owner</dt><dd>{ownerLabel}</dd></div>
            <div><dt>Environment</dt><dd>{vm.environment}</dd></div>
          </dl>
          {vm.tags.length ? (
            <div className="tag-section">
              <span>Tags</span>
              <div className="tag-list">
                {vm.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </div>
          ) : null}
        </aside>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="section-heading">
            <div>
              <h2>Alerts</h2>
              <p>{activeAlerts.length} active alerts on this VM</p>
            </div>
          </div>
          <div className="alert-list">
            {(vm.alerts.length ? vm.alerts : []).map((alert) => (
              <div className="alert-item" key={alert.id}>
                <StatusBadge severity={alert.severity} label={alert.status === 'resolved' ? 'Resolved' : undefined} />
                <div>
                  <strong>{alert.resource}</strong>
                  <span>{alert.message}</span>
                </div>
              </div>
            ))}
            {vm.alerts.length === 0 ? <div className="empty-state">No alerts recorded for this VM.</div> : null}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <h2>Recent Events</h2>
              <p>Operational history from panel telemetry</p>
            </div>
          </div>
          <div className="event-list">
            {vm.events.map((event) => (
              <div className="event-item" key={event.id}>
                <span>{event.type}</span>
                <strong>{event.message}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
