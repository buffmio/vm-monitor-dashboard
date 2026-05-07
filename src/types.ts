export type VmStatus = 'running' | 'stopped' | 'warning' | 'critical';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'active' | 'resolved';

export interface MetricPoint {
  time: string;
  cpu: number;
  memory: number;
  disk: number;
  networkIn: number;
  networkOut: number;
}

export interface VmMetrics {
  cpu: number;
  memory: number;
  disk: number;
  networkIn: number;
  networkOut: number;
}

export interface VmAlert {
  id: string;
  vmId: string;
  severity: AlertSeverity;
  resource: string;
  message: string;
  timestamp: string;
  status: AlertStatus;
}

export interface VmEvent {
  id: string;
  vmId: string;
  type: string;
  message: string;
  timestamp: string;
}

export interface VirtualMachine {
  id: string;
  name: string;
  status: VmStatus;
  ipAddress: string;
  host: string;
  region: string;
  os: string;
  owner: string;
  environment: string;
  vcpu: number;
  memoryGb: number;
  storageGb: number;
  uptime: string;
  tags: string[];
  currentMetrics: VmMetrics;
  metricHistory: MetricPoint[];
  alerts: VmAlert[];
  events: VmEvent[];
}
