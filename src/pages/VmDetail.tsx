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
  const returnLabel = from?.pathname === '/alerts' ? '返回告警' : '返回 VM 列表';

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
        <h1>正在加载 VM</h1>
        <p>正在从面板 API 获取最新 VM 详情。</p>
      </div>
    );
  }

  if (!vm) {
    return (
      <div className="not-found">
        <Server size={34} />
        <h1>未找到 VM</h1>
        <p>选中的虚拟机不存在或尚未进入监控清单。</p>
        <button className="button primary" type="button" onClick={() => navigate(returnTarget)}>
          <ArrowLeft size={16} />
          {returnLabel}
        </button>
      </div>
    );
  }

  const activeAlerts = sortAlertsBySeverity(getActiveAlerts([vm]));
  const networkTotal = vm.currentMetrics.networkIn + vm.currentMetrics.networkOut;
  const ownerLabel = vm.owner || '未分配';

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
          <p>{vm.ipAddress} 位于 {vm.region}，运行 {vm.os}</p>
        </div>
        <StatusBadge status={vm.status} />
      </header>

      <section className="metric-grid detail-metrics">
        <MetricCard label="CPU" value={formatMetric(vm.currentMetrics.cpu, '%')} detail={`${vm.vcpu} vCPU 已分配`} tone="accent" icon={<Cpu size={18} />} />
        <MetricCard label="内存" value={formatMetric(vm.currentMetrics.memory, '%')} detail={`${vm.memoryGb} GB RAM`} tone="warning" icon={<MemoryStick size={18} />} />
        <MetricCard label="磁盘" value={formatMetric(vm.currentMetrics.disk, '%')} detail={`${vm.storageGb} GB 存储`} tone={vm.currentMetrics.disk > 90 ? 'critical' : 'neutral'} icon={<HardDrive size={18} />} />
        <MetricCard label="网络" value={formatMetric(networkTotal, 'MB/s')} detail="入站加出站吞吐" tone="good" icon={<Network size={18} />} />
        <MetricCard label="运行时长" value={vm.uptime} detail={`负责人：${ownerLabel}`} tone="neutral" />
        <MetricCard label="活跃告警" value={activeAlerts.length} detail={activeAlerts.length ? '需要处理' : '暂无活跃告警'} tone={activeAlerts.length ? 'critical' : 'good'} />
      </section>

      <section className="content-grid">
        <div className="panel wide">
          <div className="section-heading">
            <div>
              <h2>遥测</h2>
              <p>VM Agent 上报的最新指标历史。</p>
            </div>
          </div>
          <div className="chart-grid">
            <LineChart title="CPU" points={vm.metricHistory} metric="cpu" unit="%" tone="blue" />
            <LineChart title="内存" points={vm.metricHistory} metric="memory" unit="%" tone="violet" />
            <LineChart title="磁盘" points={vm.metricHistory} metric="disk" unit="%" tone="amber" />
            <LineChart title="网络出站" points={vm.metricHistory} metric="networkOut" unit="MB/s" tone="green" />
          </div>
        </div>

        <aside className="panel">
          <div className="section-heading">
            <div>
              <h2>配置</h2>
              <p>资源配置和归属信息</p>
            </div>
          </div>
          <dl className="config-grid">
            <div><dt>vCPU</dt><dd>{vm.vcpu}</dd></div>
            <div><dt>内存</dt><dd>{vm.memoryGb} GB</dd></div>
            <div><dt>存储</dt><dd>{vm.storageGb} GB</dd></div>
            <div><dt>OS</dt><dd>{vm.os}</dd></div>
            <div><dt>负责人</dt><dd>{ownerLabel}</dd></div>
            <div><dt>环境</dt><dd>{vm.environment}</dd></div>
          </dl>
          {vm.tags.length ? (
            <div className="tag-section">
              <span>标签</span>
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
              <h2>告警</h2>
              <p>此 VM 有 {activeAlerts.length} 条活跃告警</p>
            </div>
          </div>
          <div className="alert-list">
            {(vm.alerts.length ? vm.alerts : []).map((alert) => (
              <div className="alert-item" key={alert.id}>
                <StatusBadge severity={alert.severity} label={alert.status === 'resolved' ? '已恢复' : undefined} />
                <div>
                  <strong>{alert.resource}</strong>
                  <span>{alert.message}</span>
                </div>
              </div>
            ))}
            {vm.alerts.length === 0 ? <div className="empty-state">此 VM 暂无告警记录。</div> : null}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <h2>近期事件</h2>
              <p>来自面板遥测的运维历史</p>
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
