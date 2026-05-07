# VM Monitor Current Architecture

Date: 2026-05-07

This document reflects the current implemented behavior of the VM Monitor dashboard, API server, PostgreSQL schema, and VM Agent.

## Project Layout

- `src/`: React frontend.
- `server/`: Go API server and CLI.
- `agent/`: Go VM Agent.
- `db/migrations/`: PostgreSQL schema migrations.
- `docs/superpowers/specs/`: design and architecture docs.
- `docs/superpowers/plans/`: implementation plans.

## Runtime Components

### Frontend

The frontend is a Vite React app with protected routes.

Implemented pages:

- `LoginPage`: local admin or AD user login.
- `Dashboard`: fleet summary and telemetry overview.
- `VmListPage`: approved VM list, filters, deletion, and pending VM approvals.
- `VmDetail`: VM metrics, telemetry charts, configuration, alerts, and events.
- `AlertsPage`: active alert center.
- `SettingsPage`: LDAP config, allowed AD groups, Agent Key management, and local admin bootstrap command reference.

The frontend uses `/api` as the API base path. Vite development proxy forwards `/api` to `http://127.0.0.1:8080`.

### API Server

The Go server provides:

- CLI commands:
  - `serve`
  - `migrate`
  - `create-admin --username admin`
  - `create-admin --username admin --password secret`
- Local admin authentication.
- LDAP/LDAPS authentication against AD.
- Session bearer tokens.
- Agent Key creation and validation.
- VM registration approval workflow.
- VM list, deletion, settings, and Agent ingestion APIs.

### VM Agent

The Go Agent runs inside each monitored VM.

Required environment:

```bash
MONITOR_SERVER_URL=http://panel-host:8080
MONITOR_AGENT_KEY=<panel-generated-agent-key>
```

Optional environment:

```bash
MONITOR_LOCATION="Shanghai DC A / Rack 03"
MONITOR_INTERVAL_SECONDS=30
```

Agent responsibilities:

- Detect hostname with `os.Hostname()`.
- Detect primary IP from non-loopback interfaces.
- Detect OS with Go runtime.
- Detect virtualized environment where possible, for example `WSL2`, `VMware`, `KVM`, `Hyper-V`, or `Physical or unknown`.
- Collect vCPU count.
- Collect total memory capacity and memory utilization.
- Collect root disk capacity and disk utilization.
- Collect CPU utilization from `/proc/stat`.
- Collect network in/out throughput from `/proc/net/dev`.
- Collect uptime from `/proc/uptime`.
- POST heartbeat data to `/api/agent/heartbeat` with `Authorization: Bearer <agent_key>`.

## Authentication And Access

### Local Admin

Local admins are created only through CLI. There is no first-run web setup page.

Example:

```bash
cd server
go run ./cmd/server create-admin --username admin
```

Passwords are stored as bcrypt hashes in `local_users`.

### AD Login

AD login uses LDAP/LDAPS.

Settings are stored in `ldap_config` and managed from the Settings page:

- LDAP URL
- Bind DN
- Bind password
- User Base DN
- User Filter
- Group Base DN
- Group Member Attribute
- StartTLS flag
- Insecure skip verify flag

Allowed AD groups are stored in `ad_groups`. Groups are added manually from Settings. No AD group DN is hard-coded.

AD login flow:

1. Bind with service account.
2. Search user DN using `User Filter`.
3. Bind as the user with the submitted password.
4. Search group membership using the configured group member attribute.
5. Allow login only if the user belongs to at least one enabled AD group in `ad_groups`.
6. Issue a signed bearer token.

### Sessions

The frontend stores a signed bearer token in local storage. Protected panel APIs require:

```http
Authorization: Bearer <session_token>
```

Agent ingestion APIs do not accept user session tokens.

## Agent Keys

Agent Keys are generated in Settings.

Rules:

- Plaintext key is shown only once on creation.
- Server stores only SHA-256 hash.
- Agent sends the key as a bearer token.
- Enabled keys can ingest Agent heartbeats.

Example:

```bash
export MONITOR_AGENT_KEY="vma_..."
```

## VM Enrollment And Approval

Agent heartbeat does not immediately create an approved VM.

Flow:

1. Admin generates an Agent Key.
2. Agent starts with `MONITOR_AGENT_KEY`.
3. First heartbeat creates or updates a `vm_registrations` row with status `pending`.
4. VM appears under `Virtual Machines -> Pending VM Approvals`.
5. A logged-in panel user approves or rejects the registration.
6. On approval, a row is created or updated in `vms`.
7. The approving user's username is written to `vms.owner`.
8. Approved VMs appear in the VM list and dashboard.

Owner rule:

- `Owner` means the panel user who approved the VM into monitoring.
- If an AD user approves, Owner is that AD username.
- If local admin approves, Owner is `admin`.
- Agent cannot set Owner.

Deletion rule:

- Deleting a VM removes it from `vms`.
- If the same Agent reports again later, it returns to pending approval.
- Server protects existing non-zero capacity fields from being overwritten by old Agents that report zero capacity.

## Host, Name, Location, And Environment

### VM Name

For Agent-created VMs, VM name is currently the detected hostname.

### Host

The backend still stores `host`, also detected from `os.Hostname()`, but the main UI does not show a separate Host column because it duplicates VM name for current Agent-created VMs.

The field is retained for future cases where VM display name may be customized separately from host identity.

### Location

Location is not auto-detected.

It is supplied by the Agent environment variable:

```bash
MONITOR_LOCATION="Shanghai DC A / Rack 03"
```

Location should represent physical or operational placement such as data center, room, rack, site, or business area.

### Environment

Environment is auto-detected by Agent as virtualization/platform environment, for example:

- `WSL2`
- `VMware`
- `VirtualBox`
- `KVM`
- `QEMU`
- `Xen`
- `Hyper-V`
- `AWS EC2`
- `Google Compute Engine`
- `Azure VM`
- `Virtualized`
- `Physical or unknown`

## Metrics

### Current Metrics

Current metrics are derived from the latest `vm_metrics` row:

- CPU percent
- Memory percent
- Disk percent
- Network in MB/s
- Network out MB/s

### Network Display Rule

VM list and VM detail use the same network headline:

```text
networkIn + networkOut
```

This avoids list/detail mismatch where one page showed only inbound traffic and another showed total throughput.

### Metric History

The API returns the latest 8 metric points per VM in `metricHistory`.

VM detail renders charts for:

- CPU
- Memory
- Disk
- Network Out

Chart behavior:

- Hovering a point shows that point's time and value in a fixed readout line.
- The chart highlights the hovered point and shows a vertical guide line.
- Tooltip data does not overlay the line itself.
- Keyboard focus on a point exposes the same value through ARIA labels.

## Current API Surface

### Auth

- `POST /api/auth/login`

### VM

- `GET /api/vms`
- `DELETE /api/vms/{vmId}`

### VM Registration

- `GET /api/vm-registrations`
- `POST /api/vm-registrations/{registrationId}/approve`
- `POST /api/vm-registrations/{registrationId}/reject`

### Alerts

- `GET /api/alerts`

### Settings

- `GET /api/settings/ldap`
- `PUT /api/settings/ldap`
- `GET /api/settings/ad-groups`
- `POST /api/settings/ad-groups`
- `GET /api/settings/agent-keys`
- `POST /api/settings/agent-keys`

### Agent

- `POST /api/agent/heartbeat`

## Database Migrations

Current migrations:

- `001_initial.sql`
  - `local_users`
  - `ldap_config`
  - `ad_groups`
  - `agent_keys`
  - `vms`
  - `vm_metrics`
  - `alerts`
- `002_vm_registrations.sql`
  - `vm_registrations`
  - pending/approved/rejected registration state
- `003_registration_capacity.sql`
  - vCPU, memory GB, storage GB fields on registrations
- `004_registration_environment.sql`
  - environment field on registrations

Important table notes:

- `vms.owner`: approving panel username.
- `vms.location`: user-supplied location from Agent env.
- `vms.environment`: Agent-detected virtualization/platform environment.
- `agent_keys.key_hash`: SHA-256 hash only.

## Local Development Runtime

The initialized local development setup used:

- PostgreSQL: `127.0.0.1:55432`
- API: `http://127.0.0.1:8080`
- Frontend: `http://localhost:5174`
- Database: `vm_monitor`
- Database user: `vm_monitor`

Admin created during local initialization:

```text
username: admin
```

Agent test key created during local initialization:

```text
vma_<local-test-key>
```

## Verification Commands

Frontend:

```bash
npm test
npm run build
```

Server:

```bash
cd server
go test ./...
go build ./cmd/server
```

Agent:

```bash
cd agent
go test ./...
go build ./cmd/vm-agent
```

Runtime Agent smoke test:

```bash
cd agent
export MONITOR_SERVER_URL="http://127.0.0.1:8080"
export MONITOR_AGENT_KEY="vma_..."
export MONITOR_LOCATION="Local Lab"
go run ./cmd/vm-agent
```

Expected behavior:

- New VM appears in Pending VM Approvals if not approved.
- Approved VM receives current metrics and metric history.
- Network values move when there is real network traffic during Agent sampling.

## Known Follow-Ups

- Add edit/disable/delete APIs for AD groups and Agent Keys.
- Add real alert generation rules.
- Add retention policy for `vm_metrics`.
- Add packaged Agent binary release workflow.
- Add systemd service template for Linux Agent deployment.
- Add Windows Agent support if needed.
- Add stronger secret handling for LDAP bind password.
- Add full LDAP integration tests with a disposable LDAP server.
