# VM Monitor Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a front-end-only VM monitoring management console with an overview dashboard, searchable/filterable VM table, VM detail page, mock telemetry, alerts, and responsive styling.

**Architecture:** Use Vite, React, TypeScript, and React Router. Keep mock data and pure data helpers separate from UI components so behavior can be tested without a browser. Use lightweight custom chart components to avoid depending on network installation for a chart library.

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library, React Router, Lucide React, CSS.

---

## File Map

- `package.json`: npm scripts and dependencies.
- `index.html`: Vite HTML entry.
- `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`: TypeScript and Vite config.
- `src/main.tsx`: React root mount.
- `src/App.tsx`: router and app shell.
- `src/types.ts`: shared VM, alert, event, and metric types.
- `src/data/mockVms.ts`: centralized mock VM data.
- `src/lib/vmUtils.ts`: pure helpers for search, filter, lookup, summary, and metric formatting.
- `src/lib/vmUtils.test.ts`: behavior tests for helpers.
- `src/components/AppShell.tsx`: sidebar and page frame.
- `src/components/StatusBadge.tsx`: consistent status/severity pills.
- `src/components/MetricCard.tsx`: compact metric card.
- `src/components/LineChart.tsx`: dependency-free SVG sparkline chart.
- `src/components/VmTable.tsx`: VM table and empty state.
- `src/pages/Dashboard.tsx`: overview page with filters, metrics, charts, alerts, and events.
- `src/pages/VmDetail.tsx`: selected VM detail page and not-found state.
- `src/styles.css`: global styles and responsive layout.

## Task 1: Scaffold Project and Test Harness

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/setupTests.ts`

- [ ] **Step 1: Create package metadata and scripts**

Create `package.json`:

```json
{
  "name": "vm-monitor-dashboard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.3",
    "vite": "^6.0.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create Vite entry files**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VM Monitor Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create Vite test config**

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts'
  }
});
```

Create `src/setupTests.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

## Task 2: Data Types and Helper Tests

**Files:**
- Create: `src/types.ts`
- Create: `src/lib/vmUtils.test.ts`

- [ ] **Step 1: Define shared types**

Create `src/types.ts`:

```ts
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
```

- [ ] **Step 2: Write failing helper tests**

Create `src/lib/vmUtils.test.ts`:

```ts
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
    region: 'us-east-1',
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
    region: 'eu-west-1',
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
  it('filters by status and searches name, IP, host, and region', () => {
    expect(filterVms(vmFixture, 'running', '').map((vm) => vm.id)).toEqual(['vm-1']);
    expect(filterVms(vmFixture, 'all', '10.0.5').map((vm) => vm.id)).toEqual(['vm-2']);
    expect(filterVms(vmFixture, 'all', 'hv-core').map((vm) => vm.id)).toEqual(['vm-1']);
    expect(filterVms(vmFixture, 'all', 'eu-west').map((vm) => vm.id)).toEqual(['vm-2']);
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/lib/vmUtils.test.ts`

Expected: FAIL because `src/lib/vmUtils.ts` does not exist.

## Task 3: Mock Data and Helper Implementation

**Files:**
- Create: `src/lib/vmUtils.ts`
- Create: `src/data/mockVms.ts`

- [ ] **Step 1: Implement helper functions**

Create `src/lib/vmUtils.ts`:

```ts
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
```

- [ ] **Step 2: Create centralized mock data**

Create `src/data/mockVms.ts` with six VMs covering running, stopped, warning, and critical states. Use `MetricPoint[]` histories with eight points per VM. Include at least one active critical alert, two active warning alerts, one resolved alert, and recent events for each VM.

- [ ] **Step 3: Run helper tests to verify green**

Run: `npm test -- src/lib/vmUtils.test.ts`

Expected: PASS for all five tests.

## Task 4: App Entry, Routing, and Shell

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/components/AppShell.tsx`
- Create: `src/styles.css`

- [ ] **Step 1: Create React entrypoint**

Create `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 2: Create app routes**

Create `src/App.tsx`:

```tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Dashboard } from './pages/Dashboard';
import { VmDetail } from './pages/VmDetail';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/vms/:vmId" element={<VmDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
```

- [ ] **Step 3: Create app shell**

Create `src/components/AppShell.tsx` with a sidebar containing Overview, Virtual Machines, Alerts, and Settings navigation labels. Use Lucide icons and `NavLink` for Overview. Use non-click primary labels for Alerts and Settings if they do not route yet.

- [ ] **Step 4: Add base CSS**

Create `src/styles.css` with global reset, font settings, light workspace background, sidebar layout, responsive behavior below 900px, focus states, and common utility classes.

## Task 5: Reusable Monitoring Components

**Files:**
- Create: `src/components/StatusBadge.tsx`
- Create: `src/components/MetricCard.tsx`
- Create: `src/components/LineChart.tsx`
- Create: `src/components/VmTable.tsx`

- [ ] **Step 1: Create status badge component**

Create `StatusBadge` that accepts `status?: VmStatus`, `severity?: AlertSeverity`, and `label?: string`. Render a compact pill with semantic class names such as `badge badge-running` and `badge badge-critical`.

- [ ] **Step 2: Create metric card component**

Create `MetricCard` props: `label`, `value`, `detail`, `tone`, and optional `icon`. Render compact cards with stable dimensions and no nested cards.

- [ ] **Step 3: Create SVG line chart**

Create `LineChart` props: `title`, `points`, `metric`, `unit`, and `tone`. Generate an SVG polyline from the provided metric key and show min/max labels. If no points exist, render an empty state.

- [ ] **Step 4: Create VM table**

Create `VmTable` props: `vms` and `onOpenVm`. Render columns for VM, status, IP, host, region, uptime, CPU, memory, disk, network, and active alerts. If `vms.length === 0`, render an empty state row.

## Task 6: Dashboard Page

**Files:**
- Create: `src/pages/Dashboard.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Build dashboard state and derived data**

Use `useMemo` and `useState` for `searchTerm` and `statusFilter`. Use `filterVms`, `calculateFleetSummary`, and `getActiveAlerts` with `mockVms`.

- [ ] **Step 2: Render top status and summary metrics**

Show environment name, last refreshed time, global health, total VMs, running, warning, critical, average CPU, average memory, and active alerts.

- [ ] **Step 3: Render aggregate trend charts**

Use the first production VM or aggregate-like mock history to render CPU, memory, disk, and network charts.

- [ ] **Step 4: Render filters and VM table**

Add a search input and segmented status filter for all, running, warning, critical, and stopped. Use `useNavigate` to open `/vms/${vm.id}` from row clicks.

- [ ] **Step 5: Render health summary**

Show active alerts sorted critical first, plus recent events from the mock VM set.

## Task 7: VM Detail Page

**Files:**
- Create: `src/pages/VmDetail.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Resolve VM from route**

Use `useParams`, `useNavigate`, and `findVmById(mockVms, vmId)`.

- [ ] **Step 2: Render not-found state**

If no VM is found, show a clear message and a button back to Overview.

- [ ] **Step 3: Render VM detail header and metrics**

Show VM name, status, IP, host, region, owner, environment, uptime, CPU, memory, disk, network, and active alert count.

- [ ] **Step 4: Render charts, alerts, events, and configuration**

Use four `LineChart` components for CPU, memory, disk, and network. Show alerts, recent events, and a configuration grid containing vCPU, RAM, storage, OS, owner, environment, and tags.

## Task 8: Verification and Local Run

**Files:**
- Modify as needed based on verification findings.

- [ ] **Step 1: Run tests**

Run: `npm test`

Expected: all helper tests pass.

- [ ] **Step 2: Build app**

Run: `npm run build`

Expected: TypeScript and Vite build succeed.

- [ ] **Step 3: Run local dev server**

Run: `npm run dev`

Expected: Vite serves the app and prints a local URL.

- [ ] **Step 4: Manual viewport check**

Open the local URL and verify:

- Dashboard is readable on desktop.
- Search and status filters update the VM table.
- Clicking a VM row opens the detail page.
- Detail page back navigation works.
- Mobile width does not produce overlapping text or broken table layout.

## Self-Review

Spec coverage:

- Dashboard overview: covered by Tasks 4, 5, and 6.
- VM list search/filter: covered by Tasks 2, 3, 5, and 6.
- VM detail page: covered by Tasks 4, 5, and 7.
- Mock data layer: covered by Tasks 2 and 3.
- Alerts and events: covered by Tasks 3, 6, and 7.
- Responsive visual design: covered by Tasks 4, 6, 7, and 8.
- Tests: covered by Tasks 2, 3, and 8.

Red-flag scan: no deferred work markers remain. Task 3 requires concrete mock coverage criteria rather than leaving data unspecified.

Type consistency: helper names, route params, status values, alert severities, and metric property names match `src/types.ts`.
