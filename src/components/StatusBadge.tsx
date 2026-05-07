import type { AlertSeverity, VmStatus } from '../types';

interface StatusBadgeProps {
  status?: VmStatus;
  severity?: AlertSeverity;
  label?: string;
}

const statusLabels: Record<VmStatus, string> = {
  running: 'Running',
  stopped: 'Stopped',
  warning: 'Warning',
  critical: 'Critical'
};

const severityLabels: Record<AlertSeverity, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical'
};

export function StatusBadge({ status, severity, label }: StatusBadgeProps) {
  const tone = status ?? severity ?? 'info';
  const text = label ?? (status ? statusLabels[status] : severity ? severityLabels[severity] : 'Info');

  return <span className={`badge badge-${tone}`}>{text}</span>;
}
