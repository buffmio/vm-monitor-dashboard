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
          <span className="eyebrow">生产资源池</span>
          <h1>VM 监控总览</h1>
          <p>查看整体健康、资源压力、告警和近期 VM 活动。</p>
        </div>
        <div className="header-actions">
          <StatusBadge severity={summary.critical > 0 ? 'critical' : summary.warning > 0 ? 'warning' : 'info'} label={
            summary.critical > 0 ? '需要关注' : summary.warning > 0 ? '存在告警' : '健康'
          } />
          <button
            className={`button secondary refresh-button ${isRefreshing ? 'refreshing' : ''}`}
            type="button"
            onClick={refreshTelemetry}
          >
            <Activity size={16} />
            {isRefreshing ? '刷新中...' : '刷新'}
          </button>
        </div>
      </header>

      <section className={`status-strip ${isRefreshing ? 'refresh-pulse' : ''}`} aria-live="polite">
        <div>
          <span>环境</span>
          <strong>生产与预发布</strong>
        </div>
        <div>
          <span>最后刷新</span>
          <strong>{lastRefreshed}</strong>
        </div>
        <div>
          <span>数据源</span>
          <strong>{token ? '面板 API' : '本地演示数据'}</strong>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard label="VM 总数" value={summary.total} detail="打开完整 VM 清单" tone="accent" icon={<Server size={18} />} to="/vms" />
        <MetricCard label="运行中" value={summary.running} detail={`${summary.stopped} 台已停止`} tone="good" icon={<Activity size={18} />} to="/vms?status=running" />
        <MetricCard label="警告" value={summary.warning} detail={`${summary.activeAlerts} 条活跃告警`} tone="warning" icon={<AlertTriangle size={18} />} to="/vms?status=warning" />
        <MetricCard label="严重" value={summary.critical} detail="需要运维确认" tone="critical" icon={<AlertTriangle size={18} />} to="/vms?status=critical" />
        <MetricCard label="平均 CPU" value={`${summary.averageCpu}%`} detail="资源池平均值" tone="neutral" icon={<Cpu size={18} />} />
        <MetricCard label="平均内存" value={`${summary.averageMemory}%`} detail="资源池平均值" tone="neutral" icon={<MemoryStick size={18} />} />
      </section>

      <section className="content-grid">
        <div className="panel wide">
          <div className="section-heading">
            <div>
              <h2>资源趋势</h2>
              <p>{trendSource ? `来自 ${trendSource.name} 的代表性遥测数据` : 'Agent 注册并审批后，VM 遥测会显示在这里'}</p>
            </div>
            <HardDrive size={18} />
          </div>
          <div className="chart-grid">
            {trendSource ? (
              <>
                <LineChart title="CPU" points={trendSource.metricHistory} metric="cpu" unit="%" tone="blue" />
                <LineChart title="内存" points={trendSource.metricHistory} metric="memory" unit="%" tone="violet" />
                <LineChart title="磁盘" points={trendSource.metricHistory} metric="disk" unit="%" tone="amber" />
                <LineChart title="网络入站" points={trendSource.metricHistory} metric="networkIn" unit="MB/s" tone="green" />
              </>
            ) : (
              <div className="empty-state">暂无已审批 VM 遥测数据。</div>
            )}
          </div>
        </div>

        <aside className="panel">
          <div className="section-heading">
            <div>
              <h2>健康摘要</h2>
              <p>活跃告警和最新事件</p>
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
            {activeAlerts.length === 0 ? <div className="empty-state">暂无活跃告警。</div> : null}
          </div>
          <div className="event-list">
            {recentEvents.map((event) => (
              <div className="event-item" key={event.id}>
                <span>{event.vmName}</span>
                <strong>{event.message}</strong>
              </div>
            ))}
            {recentEvents.length === 0 ? <div className="empty-state">暂无近期事件。</div> : null}
          </div>
        </aside>
      </section>

    </div>
  );
}
