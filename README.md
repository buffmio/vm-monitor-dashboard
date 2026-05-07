# VM Monitor Dashboard

VM Monitor Dashboard 是一个 VM 监控面板示例项目，包含 React 前端、Go API 服务、PostgreSQL 数据库迁移和 Go VM Agent。

当前能力：

- 面板登录：本地管理员登录、AD/LDAP 登录。
- VM 管理：Agent 注册、待审批、批准、拒绝、删除。
- 指标采集：CPU、内存、磁盘、网络、uptime。
- VM 详情：当前指标、历史图表、配置、告警和事件。
- 设置页：LDAP 配置、AD 组、Agent Key 管理。

## 项目结构

```text
.
├── src/                  # React 前端
├── server/               # Go API 服务和 CLI
├── agent/                # Go VM Agent
├── db/migrations/        # PostgreSQL 数据库迁移
└── docs/                 # 设计、计划和架构文档
```

## 环境要求

- Node.js
- npm
- Go 1.22+
- PostgreSQL

请确认 `go` 已加入 `PATH`，可以通过 `go version` 检查。

## 前端运行

安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run dev
```

默认前端地址：

```text
http://localhost:5174
```

Vite 会把 `/api` 代理到：

```text
http://127.0.0.1:8080
```

## API 服务

进入 server 目录：

```bash
cd server
```

运行数据库迁移：

```bash
go run ./cmd/server migrate
```

创建本地管理员：

```bash
go run ./cmd/server create-admin --username admin
```

也可以非交互传入密码：

```bash
go run ./cmd/server create-admin --username admin --password secret
```

启动 API 服务：

```bash
go run ./cmd/server serve
```

默认 API 地址：

```text
http://127.0.0.1:8080
```

## 数据库配置

服务端通过 `DATABASE_URL` 连接 PostgreSQL。

示例：

```bash
export DATABASE_URL="postgres://<user>:<password>@127.0.0.1:55432/vm_monitor?sslmode=disable"
```

## Agent 使用

在面板 Settings 页面生成 Agent Key，然后在被监控 VM 上设置：

```bash
export MONITOR_SERVER_URL="http://panel-host:8080"
export MONITOR_AGENT_KEY="vma_..."
export MONITOR_LOCATION="Shanghai DC A / Rack 03"
```

启动 Agent：

```bash
cd agent
go run ./cmd/vm-agent
```

首次 heartbeat 不会直接创建正式 VM，而是进入待审批列表。管理员批准后，该 VM 才会出现在 VM 列表和首页统计中。

## 验证命令

前端测试：

```bash
npm test
```

前端构建：

```bash
npm run build
```

Server 测试：

```bash
cd server
go test ./...
```

Agent 测试：

```bash
cd agent
go test ./...
```

## 文档

当前架构说明：

- `docs/superpowers/specs/2026-05-07-vm-monitor-current-architecture.md`
- `docs/superpowers/specs/2026-05-07-vm-monitor-current-architecture-zh.md`

## 注意事项

- `.local-pgdata/`、`node_modules/`、`dist/` 和本地编译二进制不会提交到 Git。
- Agent Key 明文只应在创建时展示一次，服务端只保存 hash。
- `Owner` 表示批准该 VM 加入监控的面板用户，不由 Agent 上报。
