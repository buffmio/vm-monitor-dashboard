import type { AlertSeverity, VmStatus } from '../types';

interface StatusBadgeProps {
  status?: VmStatus;
  severity?: AlertSeverity;
  label?: string;
}

const statusLabels: Record<VmStatus, string> = {
  running: '运行中',
  stopped: '已停止',
  warning: '警告',
  critical: '严重'
};

const severityLabels: Record<AlertSeverity, string> = {
  info: '正常',
  warning: '警告',
  critical: '严重'
};

export function StatusBadge({ status, severity, label }: StatusBadgeProps) {
  const tone = status ?? severity ?? 'info';
  const text = label ?? (status ? statusLabels[status] : severity ? severityLabels[severity] : '正常');

  return <span className={`badge badge-${tone}`}>{text}</span>;
}
