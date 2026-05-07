import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { VmTable } from '../components/VmTable';
import { mockVms } from '../data/mockVms';
import { approveVmRegistration, deleteVm, fetchVmRegistrations, fetchVms, rejectVmRegistration, type VmRegistration } from '../lib/apiClient';
import { useAuth } from '../lib/auth';
import type { StatusFilter } from '../lib/vmUtils';
import { calculateFleetSummary, filterVms } from '../lib/vmUtils';

const filters: StatusFilter[] = ['all', 'running', 'warning', 'critical', 'stopped'];
const filterLabels: Record<StatusFilter, string> = {
  all: '全部',
  running: '运行中',
  warning: '警告',
  critical: '严重',
  stopped: '已停止'
};

function normalizeStatusFilter(value: string | null): StatusFilter {
  return filters.includes(value as StatusFilter) ? (value as StatusFilter) : 'all';
}

export function VmListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [vms, setVms] = useState(() => (token ? [] : mockVms));
  const [registrations, setRegistrations] = useState<VmRegistration[]>([]);
  const statusFilter = normalizeStatusFilter(searchParams.get('status'));
  const visibleVms = useMemo(() => filterVms(vms, statusFilter, searchTerm), [searchTerm, statusFilter, vms]);
  const summary = useMemo(() => calculateFleetSummary(vms), [vms]);

  useEffect(() => {
    let cancelled = false;
    fetchVms(token ?? undefined).then((items) => {
      if (!cancelled) {
        setVms(items);
      }
    });
    fetchVmRegistrations(token ?? undefined).then((items) => {
      if (!cancelled) {
        setRegistrations(items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function refreshInventory() {
    const [vmItems, registrationItems] = await Promise.all([
      fetchVms(token ?? undefined),
      fetchVmRegistrations(token ?? undefined)
    ]);
    setVms(vmItems);
    setRegistrations(registrationItems);
  }

  async function approveRegistration(registrationId: string) {
    await approveVmRegistration(registrationId, token ?? undefined);
    await refreshInventory();
  }

  async function rejectRegistration(registrationId: string) {
    await rejectVmRegistration(registrationId, token ?? undefined);
    await refreshInventory();
  }

  async function removeVm(vmId: string) {
    await deleteVm(vmId, token ?? undefined);
    await refreshInventory();
  }

  function selectStatus(filter: StatusFilter) {
    if (filter === 'all') {
      setSearchParams({});
      return;
    }

    setSearchParams({ status: filter });
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">VM 清单</span>
          <h1>虚拟机</h1>
          <p>搜索、筛选并打开单台 VM 的监控详情。</p>
        </div>
        <StatusBadge severity={summary.critical > 0 ? 'critical' : summary.warning > 0 ? 'warning' : 'info'} label={`${visibleVms.length} 台可见`} />
      </header>

      <section className="metric-grid">
        <div className="compact-stat">
          <span>总数</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="compact-stat">
          <span>运行中</span>
          <strong>{summary.running}</strong>
        </div>
        <div className="compact-stat">
          <span>警告</span>
          <strong>{summary.warning}</strong>
        </div>
        <div className="compact-stat">
          <span>严重</span>
          <strong>{summary.critical}</strong>
        </div>
      </section>

      <section className="panel" id="virtual-machines">
        <div className="table-toolbar">
          <div>
            <h2>VM 清单</h2>
            <p>{visibleVms.length} 台机器符合当前视图。</p>
          </div>
          <label className="search-box">
            <Search size={16} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索名称、IP 或位置"
            />
          </label>
        </div>
        <div className="segmented-control" aria-label="状态筛选">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={statusFilter === filter ? 'selected' : ''}
              onClick={() => selectStatus(filter)}
            >
              {filterLabels[filter]}
            </button>
          ))}
        </div>
        <VmTable
          vms={visibleVms}
          onDeleteVm={(vm) => removeVm(vm.id)}
          onOpenVm={(vm) =>
            navigate(`/vms/${vm.id}`, {
              state: {
                from: {
                  pathname: location.pathname,
                  search: location.search
                }
              }
            })
          }
        />
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>待审批 VM</h2>
            <p>{registrations.length} 条 Agent 注册等待审批。</p>
          </div>
        </div>
        <div className="settings-list">
          {registrations.map((registration) => (
            <div className="settings-row approval-row" key={registration.id}>
              <div>
                <strong>{registration.name}</strong>
                <span>
                  {registration.ipAddress || '无 IP'} / {registration.location || '无位置'} /
                  {' '}{registration.vcpu} vCPU / {registration.memoryGb} GB RAM / {registration.storageGb} GB disk
                </span>
              </div>
              <div className="row-actions">
                <button className="button secondary" type="button" onClick={() => approveRegistration(registration.id)}>批准</button>
                <button className="button danger" type="button" onClick={() => rejectRegistration(registration.id)}>拒绝</button>
              </div>
            </div>
          ))}
          {registrations.length === 0 ? <div className="empty-state">暂无待审批 VM 注册。</div> : null}
        </div>
      </section>
    </div>
  );
}
