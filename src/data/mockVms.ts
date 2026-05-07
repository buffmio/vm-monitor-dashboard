import type { MetricPoint, VirtualMachine } from '../types';

function history(baseCpu: number, baseMemory: number, baseDisk: number, baseNetwork: number): MetricPoint[] {
  return ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'].map((time, index) => ({
    time,
    cpu: Math.max(0, Math.min(100, baseCpu + [0, 6, -3, 8, 5, -2, 9, 4][index])),
    memory: Math.max(0, Math.min(100, baseMemory + [1, 2, 4, -1, 5, 3, 6, 2][index])),
    disk: Math.max(0, Math.min(100, baseDisk + [0, 1, 1, 2, 2, 3, 3, 4][index])),
    networkIn: Math.max(0, baseNetwork + [12, 24, -8, 30, 18, -4, 34, 10][index]),
    networkOut: Math.max(0, baseNetwork * 0.55 + [8, 12, -5, 15, 9, 2, 18, 7][index])
  }));
}

export const mockVms: VirtualMachine[] = [
  {
    id: 'vm-api-prod-01',
    name: 'api-prod-01',
    status: 'running',
    ipAddress: '10.24.1.12',
    host: 'hv-core-01',
    region: '核心机房 A',
    os: 'Ubuntu 24.04 LTS',
    owner: '平台团队',
    environment: '生产',
    vcpu: 8,
    memoryGb: 32,
    storageGb: 500,
    uptime: '42d 7h',
    tags: ['api', 'edge', 'production'],
    currentMetrics: { cpu: 46, memory: 70, disk: 58, networkIn: 226, networkOut: 126 },
    metricHistory: history(42, 68, 54, 180),
    alerts: [
      {
        id: 'alert-api-memory',
        vmId: 'vm-api-prod-01',
        severity: 'warning',
        resource: '内存',
        message: '内存压力已连续 20 分钟高于 68%。',
        timestamp: '2026-05-06T14:42:00+08:00',
        status: 'active'
      }
    ],
    events: [
      {
        id: 'event-api-scale',
        vmId: 'vm-api-prod-01',
        type: '自动扩缩容',
        message: '流量均衡器将 12% 的请求切换到此 VM。',
        timestamp: '2026-05-06T14:20:00+08:00'
      },
      {
        id: 'event-api-patch',
        vmId: 'vm-api-prod-01',
        type: '补丁',
        message: '安全补丁基线校验完成。',
        timestamp: '2026-05-06T11:05:00+08:00'
      }
    ]
  },
  {
    id: 'vm-db-prod-02',
    name: 'db-prod-02',
    status: 'critical',
    ipAddress: '10.24.2.18',
    host: 'hv-storage-02',
    region: '存储机房 2',
    os: 'Rocky Linux 9',
    owner: '数据库团队',
    environment: '生产',
    vcpu: 16,
    memoryGb: 96,
    storageGb: 2048,
    uptime: '96d 3h',
    tags: ['postgres', 'primary', 'production'],
    currentMetrics: { cpu: 88, memory: 91, disk: 94, networkIn: 312, networkOut: 244 },
    metricHistory: history(78, 84, 90, 260),
    alerts: [
      {
        id: 'alert-db-disk',
        vmId: 'vm-db-prod-02',
        severity: 'critical',
        resource: '磁盘',
        message: '数据库卷容量使用率已超过 94%。',
        timestamp: '2026-05-06T15:01:00+08:00',
        status: 'active'
      },
      {
        id: 'alert-db-cpu',
        vmId: 'vm-db-prod-02',
        severity: 'warning',
        resource: 'CPU',
        message: '备份窗口期间 CPU 饱和度持续上升。',
        timestamp: '2026-05-06T14:36:00+08:00',
        status: 'active'
      }
    ],
    events: [
      {
        id: 'event-db-backup',
        vmId: 'vm-db-prod-02',
        type: '备份',
        message: '增量备份已开始。',
        timestamp: '2026-05-06T14:30:00+08:00'
      },
      {
        id: 'event-db-replica',
        vmId: 'vm-db-prod-02',
        type: '复制',
        message: '副本延迟增加到 11 秒。',
        timestamp: '2026-05-06T14:12:00+08:00'
      }
    ]
  },
  {
    id: 'vm-cache-prod-03',
    name: 'cache-prod-03',
    status: 'warning',
    ipAddress: '10.24.3.33',
    host: 'hv-memory-01',
    region: '内存机柜区',
    os: 'Debian 12',
    owner: '平台团队',
    environment: '生产',
    vcpu: 8,
    memoryGb: 64,
    storageGb: 256,
    uptime: '18d 12h',
    tags: ['redis', 'cache', 'production'],
    currentMetrics: { cpu: 52, memory: 83, disk: 39, networkIn: 288, networkOut: 241 },
    metricHistory: history(48, 78, 35, 240),
    alerts: [
      {
        id: 'alert-cache-memory',
        vmId: 'vm-cache-prod-03',
        severity: 'warning',
        resource: '内存',
        message: 'Redis 内存碎片率超过警告阈值。',
        timestamp: '2026-05-06T13:58:00+08:00',
        status: 'active'
      }
    ],
    events: [
      {
        id: 'event-cache-flush',
        vmId: 'vm-cache-prod-03',
        type: '维护',
        message: '计划内 keyspace 清理已完成。',
        timestamp: '2026-05-06T12:00:00+08:00'
      }
    ]
  },
  {
    id: 'vm-worker-stage-01',
    name: 'worker-stage-01',
    status: 'running',
    ipAddress: '10.44.8.19',
    host: 'hv-stage-02',
    region: '预发布实验室',
    os: 'Ubuntu 22.04 LTS',
    owner: '数据团队',
    environment: '预发布',
    vcpu: 6,
    memoryGb: 24,
    storageGb: 400,
    uptime: '7d 4h',
    tags: ['worker', 'queue', 'staging'],
    currentMetrics: { cpu: 34, memory: 48, disk: 44, networkIn: 96, networkOut: 78 },
    metricHistory: history(30, 45, 40, 80),
    alerts: [
      {
        id: 'alert-worker-resolved',
        vmId: 'vm-worker-stage-01',
        severity: 'info',
        resource: '队列',
        message: 'Worker 重启后队列延迟已恢复。',
        timestamp: '2026-05-06T10:22:00+08:00',
        status: 'resolved'
      }
    ],
    events: [
      {
        id: 'event-worker-deploy',
        vmId: 'vm-worker-stage-01',
        type: '部署',
        message: 'Build 2026.05.06.2 已部署到预发布环境。',
        timestamp: '2026-05-06T13:10:00+08:00'
      }
    ]
  },
  {
    id: 'vm-ci-dev-04',
    name: 'ci-dev-04',
    status: 'stopped',
    ipAddress: '10.72.4.41',
    host: 'hv-lab-03',
    region: '开发实验室',
    os: 'Windows Server 2022',
    owner: '开发体验团队',
    environment: '开发',
    vcpu: 4,
    memoryGb: 16,
    storageGb: 250,
    uptime: '0d',
    tags: ['ci', 'windows', 'development'],
    currentMetrics: { cpu: 0, memory: 0, disk: 28, networkIn: 0, networkOut: 0 },
    metricHistory: history(0, 0, 24, 0),
    alerts: [],
    events: [
      {
        id: 'event-ci-stop',
        vmId: 'vm-ci-dev-04',
        type: '电源',
        message: 'VM 因空闲超时已停止。',
        timestamp: '2026-05-06T09:45:00+08:00'
      }
    ]
  },
  {
    id: 'vm-analytics-prod-05',
    name: 'analytics-prod-05',
    status: 'running',
    ipAddress: '10.24.7.55',
    host: 'hv-gpu-01',
    region: 'GPU 机房',
    os: 'Ubuntu 24.04 LTS',
    owner: '分析团队',
    environment: '生产',
    vcpu: 12,
    memoryGb: 64,
    storageGb: 1024,
    uptime: '28d 2h',
    tags: ['analytics', 'spark', 'production'],
    currentMetrics: { cpu: 63, memory: 59, disk: 67, networkIn: 174, networkOut: 152 },
    metricHistory: history(58, 56, 63, 140),
    alerts: [],
    events: [
      {
        id: 'event-analytics-job',
        vmId: 'vm-analytics-prod-05',
        type: '任务',
        message: '夜间聚合任务 31 分钟完成。',
        timestamp: '2026-05-06T08:31:00+08:00'
      }
    ]
  }
];
