import type { VirtualMachine } from '../types';
import { formatMetric, getActiveAlerts } from '../lib/vmUtils';
import { StatusBadge } from './StatusBadge';

interface VmTableProps {
  vms: VirtualMachine[];
  onOpenVm: (vm: VirtualMachine) => void;
  onDeleteVm?: (vm: VirtualMachine) => void;
}

export function VmTable({ vms, onOpenVm, onDeleteVm }: VmTableProps) {
  return (
    <div className="table-wrap">
      <table className="vm-table">
        <thead>
          <tr>
            <th>VM</th>
            <th>Status</th>
            <th>IP</th>
            <th>Location</th>
            <th>Uptime</th>
            <th>CPU</th>
            <th>Memory</th>
            <th>Disk</th>
            <th>Network</th>
            <th>Alerts</th>
            {onDeleteVm ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {vms.length === 0 ? (
            <tr>
              <td colSpan={onDeleteVm ? 11 : 10}>
                <div className="empty-state">No virtual machines match the current filters.</div>
              </td>
            </tr>
          ) : (
            vms.map((vm) => {
              const activeAlerts = getActiveAlerts([vm]);
              const networkTotal = vm.currentMetrics.networkIn + vm.currentMetrics.networkOut;
              return (
                <tr key={vm.id} tabIndex={0} onClick={() => onOpenVm(vm)} onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    onOpenVm(vm);
                  }
                }}>
                  <td>
                    <strong>{vm.name}</strong>
                    <span>{vm.os}</span>
                  </td>
                  <td><StatusBadge status={vm.status} /></td>
                  <td>{vm.ipAddress}</td>
                  <td>{vm.region}</td>
                  <td>{vm.uptime}</td>
                  <td>{formatMetric(vm.currentMetrics.cpu, '%')}</td>
                  <td>{formatMetric(vm.currentMetrics.memory, '%')}</td>
                  <td>{formatMetric(vm.currentMetrics.disk, '%')}</td>
                  <td>{formatMetric(networkTotal, 'MB/s')}</td>
                  <td>{activeAlerts.length}</td>
                  {onDeleteVm ? (
                    <td>
                      <button
                        className="button danger table-action"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteVm(vm);
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
