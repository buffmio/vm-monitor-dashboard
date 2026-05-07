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
          <span className="eyebrow">VM inventory</span>
          <h1>Virtual Machines</h1>
          <p>Search, filter, and open individual VM monitoring details.</p>
        </div>
        <StatusBadge severity={summary.critical > 0 ? 'critical' : summary.warning > 0 ? 'warning' : 'info'} label={`${visibleVms.length} visible`} />
      </header>

      <section className="metric-grid">
        <div className="compact-stat">
          <span>Total</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="compact-stat">
          <span>Running</span>
          <strong>{summary.running}</strong>
        </div>
        <div className="compact-stat">
          <span>Warning</span>
          <strong>{summary.warning}</strong>
        </div>
        <div className="compact-stat">
          <span>Critical</span>
          <strong>{summary.critical}</strong>
        </div>
      </section>

      <section className="panel" id="virtual-machines">
        <div className="table-toolbar">
          <div>
            <h2>VM Inventory</h2>
            <p>{visibleVms.length} machines match the current view.</p>
          </div>
          <label className="search-box">
            <Search size={16} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search name, IP, or location"
            />
          </label>
        </div>
        <div className="segmented-control" aria-label="Status filter">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={statusFilter === filter ? 'selected' : ''}
              onClick={() => selectStatus(filter)}
            >
              {filter}
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
            <h2>Pending VM Approvals</h2>
            <p>{registrations.length} Agent registrations waiting for approval.</p>
          </div>
        </div>
        <div className="settings-list">
          {registrations.map((registration) => (
            <div className="settings-row approval-row" key={registration.id}>
              <div>
                <strong>{registration.name}</strong>
                <span>
                  {registration.ipAddress || 'No IP'} / {registration.location || 'No location'} /
                  {' '}{registration.vcpu} vCPU / {registration.memoryGb} GB RAM / {registration.storageGb} GB disk
                </span>
              </div>
              <div className="row-actions">
                <button className="button secondary" type="button" onClick={() => approveRegistration(registration.id)}>Approve</button>
                <button className="button danger" type="button" onClick={() => rejectRegistration(registration.id)}>Reject</button>
              </div>
            </div>
          ))}
          {registrations.length === 0 ? <div className="empty-state">No pending VM registrations.</div> : null}
        </div>
      </section>
    </div>
  );
}
