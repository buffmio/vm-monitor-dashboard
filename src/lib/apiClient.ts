import { mockVms } from '../data/mockVms';
import type { VirtualMachine, VmAlert } from '../types';

const API_BASE = '/api';

export interface ApiUser {
  id: string;
  username: string;
  authType: 'local' | 'ldap';
  groups?: string[];
}

export interface LoginResult {
  token: string;
  user: ApiUser;
}

export interface LdapSettings {
  enabled: boolean;
  url: string;
  bindDn: string;
  userBaseDn: string;
  userFilter: string;
  groupBaseDn: string;
  groupMemberAttribute: string;
  startTls: boolean;
  insecureSkipVerify: boolean;
}

export interface AdGroup {
  id?: string;
  name: string;
  distinguishedName: string;
  enabled: boolean;
}

export interface AgentKey {
  id: string;
  name: string;
  prefix: string;
  enabled: boolean;
  createdAt: string;
  lastUsedAt?: string;
  key?: string;
}

export interface VmRegistration {
  id: string;
  externalId: string;
  name: string;
  ipAddress: string;
  host: string;
  location: string;
  os: string;
  environment: string;
  vcpu: number;
  memoryGb: number;
  storageGb: number;
  uptimeSeconds: number;
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  networkInMbps: number;
  networkOutMbps: number;
  tags: string[];
  requestedAt: string;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  return apiFetch<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function fetchVms(token?: string): Promise<VirtualMachine[]> {
  try {
    const vms = await apiFetch<Partial<VirtualMachine>[]>('/vms', {}, token);
    return vms.map(normalizeVm);
  } catch {
    return mockVms;
  }
}

export async function fetchVm(vmId: string | undefined, token?: string): Promise<VirtualMachine | undefined> {
  const vms = await fetchVms(token);
  return vms.find((vm) => vm.id === vmId);
}

export async function deleteVm(vmId: string, token?: string): Promise<void> {
  await apiFetch<{ status: string }>(`/vms/${encodeURIComponent(vmId)}`, { method: 'DELETE' }, token);
}

export async function fetchVmRegistrations(token?: string): Promise<VmRegistration[]> {
  try {
    return await apiFetch<VmRegistration[]>('/vm-registrations', {}, token);
  } catch {
    return [];
  }
}

export async function approveVmRegistration(registrationId: string, token?: string): Promise<void> {
  await apiFetch<{ status: string }>(`/vm-registrations/${encodeURIComponent(registrationId)}/approve`, { method: 'POST' }, token);
}

export async function rejectVmRegistration(registrationId: string, token?: string): Promise<void> {
  await apiFetch<{ status: string }>(`/vm-registrations/${encodeURIComponent(registrationId)}/reject`, { method: 'POST' }, token);
}

export async function fetchAlerts(token?: string): Promise<VmAlert[]> {
  try {
    return await apiFetch<VmAlert[]>('/alerts', {}, token);
  } catch {
    return mockVms.flatMap((vm) => vm.alerts);
  }
}

export async function fetchLdapSettings(token?: string): Promise<LdapSettings> {
  try {
    return await apiFetch<LdapSettings>('/settings/ldap', {}, token);
  } catch {
    return {
      enabled: false,
      url: 'ldaps://ad.example.com:636',
      bindDn: 'CN=vm-monitor,OU=Service Accounts,DC=example,DC=com',
      userBaseDn: 'OU=Users,DC=example,DC=com',
      userFilter: '(sAMAccountName={username})',
      groupBaseDn: 'OU=Groups,DC=example,DC=com',
      groupMemberAttribute: 'member',
      startTls: false,
      insecureSkipVerify: false
    };
  }
}

export async function saveLdapSettings(settings: LdapSettings, token?: string): Promise<LdapSettings> {
  return apiFetch<LdapSettings>('/settings/ldap', { method: 'PUT', body: JSON.stringify(settings) }, token);
}

export async function fetchAdGroups(token?: string): Promise<AdGroup[]> {
  try {
    return await apiFetch<AdGroup[]>('/settings/ad-groups', {}, token);
  } catch {
    return [
      {
        id: 'demo-ops-group',
        name: 'VM Monitor Operators',
        distinguishedName: 'CN=VM Monitor Operators,OU=Groups,DC=example,DC=com',
        enabled: true
      }
    ];
  }
}

export async function createAdGroup(group: AdGroup, token?: string): Promise<AdGroup> {
  return apiFetch<AdGroup>('/settings/ad-groups', { method: 'POST', body: JSON.stringify(group) }, token);
}

export async function fetchAgentKeys(token?: string): Promise<AgentKey[]> {
  try {
    return await apiFetch<AgentKey[]>('/settings/agent-keys', {}, token);
  } catch {
    return [
      {
        id: 'demo-key',
        name: 'Lab VM enrollment',
        prefix: 'vma_demo123',
        enabled: true,
        createdAt: '2026-05-07T09:00:00+08:00'
      }
    ];
  }
}

export async function createAgentKey(name: string, token?: string): Promise<AgentKey> {
  return apiFetch<AgentKey>('/settings/agent-keys', { method: 'POST', body: JSON.stringify({ name }) }, token);
}

async function apiFetch<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function normalizeVm(vm: Partial<VirtualMachine>): VirtualMachine {
  const fallback = emptyVm(vm.id ?? 'unknown-vm');
  return {
    ...fallback,
    ...vm,
    currentMetrics: vm.currentMetrics ?? fallback.currentMetrics,
    metricHistory: vm.metricHistory ?? fallback.metricHistory,
    alerts: vm.alerts ?? fallback.alerts,
    events: vm.events ?? fallback.events,
    tags: vm.tags ?? fallback.tags
  };
}

function emptyVm(id: string): VirtualMachine {
  return {
    id,
    name: id,
    status: 'running',
    ipAddress: '',
    host: '',
    region: '',
    os: '',
    owner: '',
    environment: '',
    vcpu: 0,
    memoryGb: 0,
    storageGb: 0,
    uptime: '0d',
    tags: [],
    currentMetrics: { cpu: 0, memory: 0, disk: 0, networkIn: 0, networkOut: 0 },
    metricHistory: [],
    alerts: [],
    events: []
  };
}
