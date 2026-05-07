# VM Monitor Dashboard Design

Date: 2026-05-06

## Goal

Build a front-end demo VM monitoring dashboard as a management console. The app should feel like a practical operations tool: dense enough for scanning many virtual machines, clear enough to inspect a single VM, and structured so mock data can later be replaced by real API data.

## Scope

The first version is a front-end-only demo. It uses local mock data and simulated metric refreshes. It does not need authentication, real VM control actions, real telemetry ingestion, or a backend service.

In scope:

- Dashboard overview page.
- VM list with search and status filtering.
- VM detail page.
- Resource charts for CPU, memory, disk, and network.
- Alert and event summaries.
- Mock data layer shaped like future API responses.

Out of scope:

- Real hypervisor, cloud, or agent integration.
- Start, stop, restart, or destructive VM operations.
- User accounts and permissions.
- Persistent alert acknowledgement.

## Product Direction

Use approach B: a management console with a dashboard overview and a dedicated VM detail page.

The dashboard should answer:

- Which VMs need attention?
- How healthy is the fleet right now?
- Which resources are under pressure?
- What happened recently?

The detail page should answer:

- What is this VM's current state?
- Are its resource trends normal?
- Which alerts and events explain the current health?
- What basic configuration identifies this VM?

## Information Architecture

Primary navigation:

- Overview
- Virtual Machines
- Alerts
- Settings

Only Overview and VM Detail need complete behavior in the first version. Alerts can be represented by summaries and a simple list section. Settings can be a non-functional navigation item for realism.

## Dashboard Page

The dashboard page contains:

- Top status bar with environment name, last refresh timestamp, and global health.
- Summary metrics for total VMs, running VMs, warning VMs, critical VMs, and average utilization.
- Resource trend area showing aggregate CPU, memory, disk, and network activity.
- VM table with name, status, IP address, host, region, uptime, CPU, memory, disk, network, and active alerts.
- Filters for status and search text.
- Health summary panel with alert counts and recent events.

Interactions:

- Search matches VM name, IP address, host, or region.
- Status filter narrows the table.
- Clicking a VM row opens the VM detail page.
- Mock metrics update on a timer to create a live-monitoring feel.

## VM Detail Page

The detail page contains:

- Header with VM name, status, IP address, host, region, and back navigation.
- Metric tiles for current CPU, memory, disk, network, uptime, and active alerts.
- Time-series charts for CPU, memory, disk, and network.
- Alert list with severity, message, timestamp, and affected resource.
- Recent event stream.
- Configuration panel with vCPU, RAM, storage, OS, owner, environment, and tags.

Interactions:

- Back navigation returns to the overview.
- The detail page uses the selected VM id from the route.
- Unknown VM ids show a clear not-found state.

## Data Model

Mock VM record:

- id
- name
- status: running, stopped, warning, critical
- ipAddress
- host
- region
- os
- owner
- environment
- vcpu
- memoryGb
- storageGb
- uptime
- tags
- currentMetrics: cpu, memory, disk, networkIn, networkOut
- metricHistory
- alerts
- events

Mock alert record:

- id
- vmId
- severity: info, warning, critical
- resource
- message
- timestamp
- status: active, resolved

Mock event record:

- id
- vmId
- type
- message
- timestamp

## Visual Design

The UI should feel like a calm operations console, not a marketing page or decorative landing page.

Visual choices:

- Light workspace background.
- Strong contrast for text and data.
- Restrained accent colors for status and charts.
- Compact table rows for scanability.
- No nested cards.
- No decorative gradient blobs or oversized hero sections.
- Icons for navigation, filters, search, alerts, and status where useful.

Status colors:

- Running: green.
- Warning: amber.
- Critical: red.
- Stopped: neutral gray.

## Architecture

Use a Vite + React + TypeScript app.

Suggested structure:

- `src/main.tsx`: React entrypoint.
- `src/App.tsx`: app shell and routes.
- `src/data/mockVms.ts`: mock VM, alert, event, and metric data.
- `src/lib/metrics.ts`: metric formatting, status helpers, filter helpers.
- `src/components/`: reusable UI components.
- `src/pages/Dashboard.tsx`: overview page.
- `src/pages/VmDetail.tsx`: detail page.
- `src/styles.css`: global styles and layout.

Routing can use React Router or a small local route state. React Router is preferred because it matches future production structure.

Charts can use Recharts if dependencies are available. If dependency installation is blocked, use simple SVG or CSS-based charts with the same data model.

## Error Handling

- Unknown VM id shows a not-found view.
- Empty search/filter results show an empty state.
- Missing metric values should display `--` instead of breaking the layout.

## Testing

Use focused tests for behavior that matters:

- Filtering returns VMs matching selected status.
- Search matches name, IP, host, and region.
- VM lookup returns the correct VM or not-found result.
- Metric formatting handles normal and missing values.

UI rendering can be smoke-tested if the chosen scaffold includes a test runner. Manual verification should include desktop and mobile viewport checks.

## Acceptance Criteria

- A new project folder named `vm-monitor-dashboard` exists.
- The app runs locally as a front-end demo.
- The dashboard shows fleet summary, trends, filters, VM table, alerts, and events.
- The VM detail page shows selected VM details, charts, alerts, events, and configuration.
- Mock data is centralized and can be swapped for API calls later.
- Search, status filtering, and row navigation work.
- The UI remains readable and non-overlapping on desktop and mobile widths.
