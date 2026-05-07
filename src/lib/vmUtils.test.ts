import { describe, expect, it } from 'vitest';
import type { VirtualMachine } from '../types';
import {
  calculateFleetSummary,
  filterVms,
  findVmById,
  formatMetric,
  getActiveAlerts
} from './vmUtils';

const vmFixture: VirtualMachine[] = [
  {
    id: 'vm-1',
    name: 'api-prod-01',
    status: 'running',
    ipAddress: '10.0.1.12',
    host: 'hv-core-01',
    region: 'Core DC A',
    os: 'Ubuntu 24.04 LTS',
    owner: 'Platform',
    environment: 'Production',
    vcpu: 8,
    memoryGb: 32,
    storageGb: 500,
    uptime: '42d 7h',
    tags: ['api', 'production'],
    currentMetrics: { cpu: 42, memory: 68, disk: 54, networkIn: 180, networkOut: 94 },
    metricHistory: [],
    alerts: [
      {
        id: 'alert-1',
        vmId: 'vm-1',
        severity: 'warning',
        resource: 'memory',
        message: 'Memory usage above 65%',
        timestamp: '2026-05-06T09:15:00+08:00',
        status: 'active'
      }
    ],
    events: []
  },
  {
    id: 'vm-2',
    name: 'batch-dev-02',
    status: 'stopped',
    ipAddress: '10.0.5.24',
    host: 'hv-lab-03',
    region: 'Developer Lab',
    os: 'Debian 12',
    owner: 'Data',
    environment: 'Development',
    vcpu: 4,
    memoryGb: 16,
    storageGb: 200,
    uptime: '0d',
    tags: ['batch', 'development'],
    currentMetrics: { cpu: 0, memory: 0, disk: 31, networkIn: 0, networkOut: 0 },
    metricHistory: [],
    alerts: [
      {
        id: 'alert-2',
        vmId: 'vm-2',
        severity: 'info',
        resource: 'power',
        message: 'VM is stopped',
        timestamp: '2026-05-06T08:30:00+08:00',
        status: 'resolved'
      }
    ],
    events: []
  }
];

describe('vmUtils', () => {
  it('filters by status and searches name, IP, host, and user-defined location', () => {
    expect(filterVms(vmFixture, 'running', '').map((vm) => vm.id)).toEqual(['vm-1']);
    expect(filterVms(vmFixture, 'all', '10.0.5').map((vm) => vm.id)).toEqual(['vm-2']);
    expect(filterVms(vmFixture, 'all', 'hv-core').map((vm) => vm.id)).toEqual(['vm-1']);
    expect(filterVms(vmFixture, 'all', 'developer lab').map((vm) => vm.id)).toEqual(['vm-2']);
  });

  it('finds a VM by id and returns undefined for unknown ids', () => {
    expect(findVmById(vmFixture, 'vm-1')?.name).toBe('api-prod-01');
    expect(findVmById(vmFixture, 'missing')).toBeUndefined();
  });

  it('returns only active alerts', () => {
    expect(getActiveAlerts(vmFixture).map((alert) => alert.id)).toEqual(['alert-1']);
  });

  it('calculates fleet summary counts and average utilization', () => {
    expect(calculateFleetSummary(vmFixture)).toEqual({
      total: 2,
      running: 1,
      warning: 0,
      critical: 0,
      stopped: 1,
      averageCpu: 21,
      averageMemory: 34,
      activeAlerts: 1
    });
  });

  it('formats known metrics and missing values', () => {
    expect(formatMetric(42, '%')).toBe('42%');
    expect(formatMetric(12.4, 'MB/s')).toBe('12.4 MB/s');
    expect(formatMetric(undefined, '%')).toBe('--');
  });
});
