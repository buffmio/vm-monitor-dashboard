# VM Monitor Dashboard

[简体中文](README.md) | English

VM Monitor Dashboard is a self-hosted virtual machine monitoring platform built with a React dashboard, a Go API service, PostgreSQL, and a Go VM agent.

Features include:

- Local administrator and AD/LDAP sign-in.
- VM agent registration, approval, rejection, and removal.
- CPU, memory, disk, network, and uptime metrics.
- VM details with current metrics, historical charts, configuration, alerts, and events.
- LDAP, AD group, and agent key settings.

- [GitHub repository](https://github.com/buffmio/vm-monitor-dashboard)
- [Architecture documentation](docs/superpowers/specs/2026-05-07-vm-monitor-current-architecture.md)
- [架构文档（简体中文）](docs/superpowers/specs/2026-05-07-vm-monitor-current-architecture-zh.md)

## Project Structure

```text
.
├── src/                  # React frontend
├── server/               # Go API service and CLI
├── agent/                # Go VM agent
├── db/migrations/        # PostgreSQL migrations
└── docs/                 # Design, plans, and architecture documentation
```

## Requirements

- Node.js
- npm
- Go 1.22+
- PostgreSQL

Make sure `go` is available in `PATH`. Check with `go version`.

## Run the Frontend

Install dependencies from the project directory:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend is available at:

```text
http://localhost:5174
```

Vite proxies `/api` requests to:

```text
http://127.0.0.1:8080
```

## Deploy with Docker Compose

```bash
cp .env.example .env
docker compose up -d --build
```

Open the dashboard at:

```text
http://localhost:8080
```

Compose starts:

- `postgres`: PostgreSQL database.
- `api`: Go API service; database migrations run on startup.
- `web`: Nginx frontend, which proxies `/api` requests to `api:8080`.

Create the local administrator after the first startup:

```bash
docker compose exec api /app/server create-admin --username admin
```

Before production deployment, update these values in `.env`:

- `POSTGRES_PASSWORD`
- `MONITOR_SESSION_SECRET`
- `MONITOR_WEB_PORT`

Stop the services:

```bash
docker compose down
```

To also remove the database volume:

```bash
docker compose down -v
```

## API Service

Run these commands from the `server` directory:

```bash
cd server
go run ./cmd/server migrate
```

Create a local administrator:

```bash
go run ./cmd/server create-admin --username admin
```

You can provide a password non-interactively:

```bash
go run ./cmd/server create-admin --username admin --password secret
```

Start the API service:

```bash
go run ./cmd/server serve
```

The default API address is:

```text
http://127.0.0.1:8080
```

## Database Configuration

The server connects to PostgreSQL through `DATABASE_URL`:

```bash
export DATABASE_URL="postgres://<user>:<password>@127.0.0.1:55432/vm_monitor?sslmode=disable"
```

## VM Agent

Generate an Agent Key from the dashboard's Settings page, then configure these environment variables on the VM to monitor:

```bash
export MONITOR_SERVER_URL="http://panel-host:8080"
export MONITOR_AGENT_KEY="vma_..."
export MONITOR_LOCATION="Shanghai DC A / Rack 03"
```

Start the agent:

```bash
cd agent
go run ./cmd/vm-agent
```

The first heartbeat creates a pending registration. The VM appears in the VM list and dashboard statistics after an administrator approves it.

### Build the Agent Binary

Build a Linux amd64 agent:

```bash
./scripts/build-agent.sh
```

The binary is written to:

```text
build/agent/vm-agent-linux-amd64
```

If `go` is not in `PATH`, set `GO_BIN`:

```bash
GO_BIN=/path/to/go ./scripts/build-agent.sh
```

Build for Linux ARM64:

```bash
GOOS=linux GOARCH=arm64 ./scripts/build-agent.sh
```

Copy the binary to the VM, set the environment variables, and run it:

```bash
export MONITOR_SERVER_URL="http://panel-host:8080"
export MONITOR_AGENT_KEY="vma_..."
export MONITOR_LOCATION="Shanghai DC A / Rack 03"
./vm-agent-linux-amd64
```

### Deploy the Agent with systemd

Copy the agent binary and installer to the VM, then run the interactive installer:

```bash
sudo ./scripts/install-agent-systemd.sh
```

The installer prompts for:

- Dashboard URL, such as `http://panel-host:8080`
- Agent Key generated on the Settings page
- Location
- Heartbeat interval in seconds
- Agent binary path

After installation, systemd manages the agent and starts it automatically at boot.

Common management commands:

```bash
sudo systemctl status vm-monitor-agent
sudo journalctl -u vm-monitor-agent -f
sudo systemctl restart vm-monitor-agent
sudo systemctl stop vm-monitor-agent
```

You can also install non-interactively:

```bash
sudo ./scripts/install-agent-systemd.sh \
  --server-url http://panel-host:8080 \
  --agent-key vma_... \
  --location "Shanghai DC A / Rack 03" \
  --interval 30 \
  --binary ./vm-agent-linux-amd64
```

## Verification Commands

Run frontend tests:

```bash
npm test
```

Build the frontend:

```bash
npm run build
```

Run server tests:

```bash
cd server
go test ./...
```

Run agent tests:

```bash
cd agent
go test ./...
```

## Notes

- `.local-pgdata/`, `node_modules/`, `dist/`, and locally built binaries are not committed to Git.
- An Agent Key is shown in plain text only when it is created; the server stores only its hash.
- `Owner` refers to the dashboard user who approved a VM. It is not reported by the agent.
