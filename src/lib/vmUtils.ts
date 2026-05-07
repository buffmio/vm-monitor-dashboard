import type { VmAlert, VmStatus, VirtualMachine } from '../types';

export type StatusFilter = VmStatus | 'all';

export interface FleetSummary {
  total: number;
  running: number;
  warning: number;
  critical: number;
  stopped: number;
  averageCpu: number;
  averageMemory: number;
  activeAlerts: number;
}

export function filterVms(
  vms: VirtualMachine[],
  status: StatusFilter,
  searchTerm: string
): VirtualMachine[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return vms.filter((vm) => {
    const matchesStatus = status === 'all' || vm.status === status;
    const searchable = [vm.name, vm.ipAddress, vm.host, vm.region].join(' ').toLowerCase();
    const matchesSearch = normalizedSearch.length === 0 || searchable.includes(normalizedSearch);

    return matchesStatus && matchesSearch;
  });
}

export function findVmById(vms: VirtualMachine[], vmId: string | undefined): VirtualMachine | undefined {
  if (!vmId) {
    return undefined;
  }

  return vms.find((vm) => vm.id === vmId);
}

export function getActiveAlerts(vms: VirtualMachine[]): VmAlert[] {
  return vms.flatMap((vm) => vm.alerts).filter((alert) => alert.status === 'active');
}

export function calculateFleetSummary(vms: VirtualMachine[]): FleetSummary {
  const total = vms.length;
  const activeAlerts = getActiveAlerts(vms).length;
  const averageCpu = total === 0 ? 0 : Math.round(vms.reduce((sum, vm) => sum + vm.currentMetrics.cpu, 0) / total);
  const averageMemory =
    total === 0 ? 0 : Math.round(vms.reduce((sum, vm) => sum + vm.currentMetrics.memory, 0) / total);

  return {
    total,
    running: vms.filter((vm) => vm.status === 'running').length,
    warning: vms.filter((vm) => vm.status === 'warning').length,
    critical: vms.filter((vm) => vm.status === 'critical').length,
    stopped: vms.filter((vm) => vm.status === 'stopped').length,
    averageCpu,
    averageMemory,
    activeAlerts
  };
}

export function formatMetric(value: number | undefined, unit: string): string {
  if (value === undefined || Number.isNaN(value)) {
    return '--';
  }

  return unit === '%' ? `${Math.round(value)}%` : `${Number(value.toFixed(1))} ${unit}`;
}

export function sortAlertsBySeverity(alerts: VmAlert[]): VmAlert[] {
  const weight: Record<VmAlert['severity'], number> = {
    critical: 0,
    warning: 1,
    info: 2
  };

  return [...alerts].sort((a, b) => weight[a.severity] - weight[b.severity]);
}
