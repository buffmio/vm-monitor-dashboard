# Real Agent Auth Platform Design

Date: 2026-05-07

## Goal

Turn the VM monitoring demo into a real monitored platform with:

- Go VM Agent running inside each VM.
- Go API server receiving Agent data.
- PostgreSQL persistence.
- Frontend login protection.
- Local administrator bootstrap through CLI.
- LDAP/LDAPS authentication against Active Directory.
- AD group allow-list managed in the panel.
- Agent keys generated in the panel and required for Agent ingestion.

## Scope

The first implementation should produce a working foundation, not a fully hardened enterprise product.

In scope:

- Project structure for `server`, `agent`, `db`, and existing React frontend.
- PostgreSQL schema files.
- Go server source with HTTP endpoints, config loading, auth helpers, and repository boundaries.
- Go agent source with host metric collection and HTTP posting.
- Frontend API client, login page, protected routes, and Settings sections for AD groups and Agent keys.
- Mock fallback for frontend development when API is unavailable.

Out of scope for the first pass:

- HA deployment.
- Long-term metric retention policy.
- Advanced RBAC beyond local admin and AD allow-list membership.
- Full LDAP test environment.
- TLS certificate management automation.

## Architecture

### Components

- `agent/`: Go binary installed inside each VM.
- `server/`: Go API server and CLI.
- `db/`: PostgreSQL migrations.
- `src/`: existing React frontend.

### Data Flow

1. A local admin is created with:
   - `server create-admin --username admin`
   - or `server create-admin --username admin --password ...`
2. Admin logs into the panel.
3. Admin configures LDAP/LDAPS and AD groups in Settings.
4. Admin generates an Agent Key in the panel.
5. VM Agent runs with `MONITOR_AGENT_KEY`.
6. Agent sends heartbeat and metrics to the server.
7. Server validates Agent Key, writes VM and metric records to PostgreSQL, and updates alerts.
8. Frontend reads real data from API. If API is unavailable during development, it can fall back to mock data.

## Authentication

### Local Admin

Local admin accounts are created through CLI only. No first-visit setup page is used.

Commands:

- `server migrate`
- `server create-admin --username admin`
- `server create-admin --username admin --password "..."` for non-interactive automation.
- `server serve`

Local users:

- Stored in `local_users`.
- Passwords are stored as bcrypt hashes.
- Disabled local users cannot log in.

### AD Login

AD login uses LDAP/LDAPS.

Login flow:

1. User submits username and password.
2. Server reads LDAP config from database.
3. Server binds with service account.
4. Server finds the user DN.
5. Server binds as the user with submitted password.
6. Server checks whether user belongs to any enabled AD group stored in `auth_ad_groups`.
7. If allowed, server signs a session token.

AD group names are not hard-coded.

### Session

The first implementation uses signed JWT-style bearer tokens stored by the frontend. All dashboard APIs require `Authorization: Bearer <token>`.

## Agent Key

Agent keys are generated in Settings.

Rules:

- Key plaintext is shown only once.
- Server stores only SHA-256 hash.
- Keys can be disabled.
- Agent sends `Authorization: Bearer <agent_key>`.
- Agent endpoints do not accept user session tokens.

## API

### Public/Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Protected Panel APIs

- `GET /api/vms`
- `GET /api/vms/{id}`
- `GET /api/vms/{id}/metrics?range=1h`
- `GET /api/alerts`
- `GET /api/settings/ldap`
- `PUT /api/settings/ldap`
- `GET /api/settings/ad-groups`
- `POST /api/settings/ad-groups`
- `PUT /api/settings/ad-groups/{id}`
- `DELETE /api/settings/ad-groups/{id}`
- `GET /api/settings/agent-keys`
- `POST /api/settings/agent-keys`
- `PUT /api/settings/agent-keys/{id}/disable`

### Agent APIs

- `POST /api/agent/heartbeat`
- `POST /api/agent/metrics`

## Database

Tables:

- `local_users`
- `ldap_config`
- `auth_ad_groups`
- `agent_keys`
- `vms`
- `vm_metrics`
- `alerts`

The `vms.location` field is user-defined and must not imply cloud provider regions.

## Frontend

Changes:

- Add login page.
- Protect all app routes.
- Add API client.
- Replace mock-only VM reads with API-backed data and mock fallback.
- Add Settings sections for:
  - LDAP config.
  - AD groups.
  - Agent keys.

## Agent

Go Agent responsibilities:

- Collect hostname, OS, IP addresses, uptime, CPU, memory, disk, and network counters.
- Send heartbeat.
- Send metrics periodically.
- Use `MONITOR_SERVER_URL` and `MONITOR_AGENT_KEY`.

First-pass metric collection can use Linux `/proc` and standard library APIs. Windows support is not required in the first pass.

## Security Defaults

- Prefer LDAPS.
- Do not store plaintext Agent keys.
- Do not store plaintext passwords.
- Do not hard-code AD groups.
- Do not allow panel APIs without login.
- Do not allow Agent ingestion without a valid enabled Agent Key.

## Acceptance Criteria

- Server source and DB schema exist.
- Agent source exists.
- Local admin CLI command exists in source.
- Frontend has login and protected app routes.
- Frontend Settings can represent LDAP config, AD groups, and Agent keys.
- Frontend can read API data when available and keep mock fallback for development.
- Existing frontend tests still pass.
- Go verification is documented if Go is unavailable locally.
