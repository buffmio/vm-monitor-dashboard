# Real Agent Auth Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real Go Agent + Go API server + PostgreSQL-backed authentication and ingestion foundation to the VM monitoring dashboard.

**Architecture:** Keep the existing React frontend, add `server/` for the Go API and CLI, `agent/` for the Go VM Agent, and `db/` for PostgreSQL migrations. The frontend becomes API-backed with mock fallback and protected routes. Local admin users are created through CLI, AD groups are managed in Settings, and Agent ingestion requires panel-generated keys.

**Tech Stack:** Go, PostgreSQL, React, TypeScript, Vitest, LDAP/LDAPS, JWT-style signed sessions, bcrypt, SHA-256 Agent key hashes.

---

## File Map

- Create `db/migrations/001_initial.sql`: PostgreSQL tables.
- Create `server/go.mod`: Go module.
- Create `server/cmd/server/main.go`: CLI entrypoint for `serve`, `migrate`, and `create-admin`.
- Create `server/internal/config/config.go`: environment config.
- Create `server/internal/httpapi/router.go`: HTTP routing.
- Create `server/internal/httpapi/types.go`: request/response types.
- Create `server/internal/security/passwords.go`: bcrypt helpers.
- Create `server/internal/security/tokens.go`: session and Agent key helpers.
- Create `server/internal/store/postgres.go`: DB access boundary.
- Create `server/internal/auth/ldap.go`: LDAP authentication interface and implementation stub.
- Create `agent/go.mod`: Go module.
- Create `agent/cmd/vm-agent/main.go`: Agent entrypoint.
- Create `agent/internal/config/config.go`: Agent config.
- Create `agent/internal/collector/linux.go`: Linux metric collection.
- Create `agent/internal/client/client.go`: Agent API client.
- Modify `src`: frontend auth, API client, protected routes, API-backed VM pages, Settings management sections.

## Task 1: Database Schema

**Files:**
- Create: `db/migrations/001_initial.sql`

- [ ] **Step 1: Create schema**

Create tables for local users, LDAP config, AD groups, Agent keys, VMs, metrics, and alerts.

- [ ] **Step 2: Verify schema syntax later**

Run after PostgreSQL tooling is available:

```bash
psql "$DATABASE_URL" -f db/migrations/001_initial.sql
```

Expected: schema applies without errors.

## Task 2: Go Server Skeleton

**Files:**
- Create server module and source files listed in File Map.

- [ ] **Step 1: Create server module**

Use module path `vm-monitor-dashboard/server`.

- [ ] **Step 2: Create CLI**

Support commands:

```bash
server serve
server migrate
server create-admin --username admin
server create-admin --username admin --password secret
```

- [ ] **Step 3: Create HTTP endpoints**

Add route skeletons for auth, VMs, alerts, settings, and Agent ingestion.

- [ ] **Step 4: Verify later**

Run after Go is installed:

```bash
cd server && go test ./...
cd server && go build ./cmd/server
```

Expected: tests and build pass.

## Task 3: Go Agent Skeleton

**Files:**
- Create agent module and source files listed in File Map.

- [ ] **Step 1: Create agent config**

Read `MONITOR_SERVER_URL`, `MONITOR_AGENT_KEY`, and optional interval.

- [ ] **Step 2: Create collector**

Collect Linux hostname, OS, IPs, uptime, CPU, memory, disk, and network values.

- [ ] **Step 3: Create client**

POST heartbeat and metrics with `Authorization: Bearer <agent_key>`.

- [ ] **Step 4: Verify later**

Run after Go is installed:

```bash
cd agent && go test ./...
cd agent && go build ./cmd/vm-agent
```

Expected: tests and build pass.

## Task 4: Frontend Auth and API Client

**Files:**
- Create: `src/lib/apiClient.ts`
- Create: `src/lib/auth.ts`
- Create: `src/pages/LoginPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: VM and alert pages to use API-backed data with fallback.

- [ ] **Step 1: Write failing tests**

Add tests for login route rendering, protected redirect, and API fallback.

- [ ] **Step 2: Implement auth context**

Store bearer token in local storage.

- [ ] **Step 3: Implement API client**

Use `/api` base path and fallback to mock data on fetch failure for VM reads.

- [ ] **Step 4: Verify**

Run:

```bash
npm test
npm run build
```

Expected: all frontend tests and build pass.

## Task 5: Settings Sections

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Create focused components if needed.

- [ ] **Step 1: Add Settings UI**

Add LDAP config, AD groups, and Agent keys sections.

- [ ] **Step 2: Wire API calls**

Use API client functions for read/create/update/disable.

- [ ] **Step 3: Verify**

Run:

```bash
npm test
npm run build
```

Expected: all frontend tests and build pass.

## Self-Review

Spec coverage:

- Go Agent: Task 3.
- Go Server: Task 2.
- PostgreSQL schema: Task 1.
- Local admin CLI: Task 2.
- LDAP/AD groups managed in panel: Tasks 2 and 5.
- Agent Key generation and validation: Tasks 1, 2, 3, and 5.
- Frontend login and protected routes: Task 4.
- API-backed frontend with fallback: Task 4.

Known local constraint:

- `go` is not installed in the current environment, so Go compilation and Go tests require installing Go before verification.
