# VM Monitor 当前架构说明

日期：2026-05-07

本文档对齐当前已实现的 VM Monitor 面板、API 服务、PostgreSQL 数据库结构和 VM Agent 行为。

## 项目结构

- `src/`：React 前端。
- `server/`：Go API 服务和 CLI。
- `agent/`：Go VM Agent。
- `db/migrations/`：PostgreSQL schema migration。
- `docs/superpowers/specs/`：设计和架构文档。
- `docs/superpowers/plans/`：实施计划文档。

## 运行组件

### 前端

前端是一个 Vite React 应用，页面访问受登录保护。

已实现页面：

- `LoginPage`：本地管理员或 AD 用户登录。
- `Dashboard`：VM 总览和遥测概览。
- `VmListPage`：已批准 VM 列表、筛选、删除和待审批 VM。
- `VmDetail`：VM 指标、遥测图表、配置、告警和事件。
- `AlertsPage`：当前告警中心。
- `SettingsPage`：LDAP 配置、允许登录的 AD 组、Agent Key 管理，以及本地管理员初始化命令参考。

前端使用 `/api` 作为 API 基础路径。Vite 开发代理会把 `/api` 转发到：

```text
http://127.0.0.1:8080
```

### API 服务

Go 服务提供：

- CLI 命令：
  - `serve`
  - `migrate`
  - `create-admin --username admin`
  - `create-admin --username admin --password secret`
- 本地管理员认证。
- 基于 LDAP/LDAPS 的 AD 认证。
- Session bearer token。
- Agent Key 创建和校验。
- VM 注册审批流程。
- VM 列表、删除、设置和 Agent 数据接收 API。

### VM Agent

Go Agent 运行在每台被监控的 VM 内部。

必需环境变量：

```bash
MONITOR_SERVER_URL=http://panel-host:8080
MONITOR_AGENT_KEY=<panel-generated-agent-key>
```

可选环境变量：

```bash
MONITOR_LOCATION="Shanghai DC A / Rack 03"
MONITOR_INTERVAL_SECONDS=30
```

Agent 职责：

- 通过 `os.Hostname()` 检测 hostname。
- 从非 loopback 网卡中检测主 IP。
- 通过 Go runtime 检测操作系统。
- 尽可能检测虚拟化环境，例如 `WSL2`、`VMware`、`KVM`、`Hyper-V` 或 `Physical or unknown`。
- 采集 vCPU 数量。
- 采集内存总容量和内存使用率。
- 采集根磁盘总容量和磁盘使用率。
- 从 `/proc/stat` 采集 CPU 使用率。
- 从 `/proc/net/dev` 采集 network in/out 吞吐。
- 从 `/proc/uptime` 采集 uptime。
- 使用 `Authorization: Bearer <agent_key>` 向 `/api/agent/heartbeat` POST heartbeat 数据。

## 认证和访问控制

### 本地管理员

本地管理员只通过 CLI 创建。当前没有首次运行的网页初始化向导。

示例：

```bash
cd server
go run ./cmd/server create-admin --username admin
```

密码以 bcrypt hash 形式存储在 `local_users` 表中。

### AD 登录

AD 登录使用 LDAP/LDAPS。

配置存储在 `ldap_config` 表中，并通过 Settings 页面管理：

- LDAP URL
- Bind DN
- Bind password
- User Base DN
- User Filter
- Group Base DN
- Group Member Attribute
- StartTLS 开关
- Insecure skip verify 开关

允许登录的 AD 组存储在 `ad_groups` 表中。AD 组需要在 Settings 页面手动添加。系统不写死任何 AD group DN。

AD 登录流程：

1. 使用 service account bind。
2. 使用 `User Filter` 搜索用户 DN。
3. 使用用户提交的密码，以该用户身份 bind。
4. 使用配置的 group member attribute 搜索用户组关系。
5. 只有当用户属于 `ad_groups` 中至少一个已启用 AD 组时，才允许登录。
6. 签发 signed bearer token。

### Session

前端把 signed bearer token 存储在 local storage。受保护的面板 API 需要：

```http
Authorization: Bearer <session_token>
```

Agent 数据接收 API 不接受用户 session token。

## Agent Keys

Agent Key 在 Settings 页面生成。

规则：

- 明文 key 只在创建时显示一次。
- 服务端只存储 SHA-256 hash。
- Agent 以 bearer token 形式发送 key。
- 启用状态的 key 可以接收 Agent heartbeat。

示例：

```bash
export MONITOR_AGENT_KEY="vma_..."
```

## VM 注册和审批

Agent heartbeat 不会立刻创建一台已批准 VM。

流程：

1. 管理员生成 Agent Key。
2. Agent 使用 `MONITOR_AGENT_KEY` 启动。
3. 首次 heartbeat 创建或更新一条 `vm_registrations` 记录，状态为 `pending`。
4. VM 出现在 `Virtual Machines -> Pending VM Approvals` 中。
5. 已登录的面板用户批准或拒绝该注册。
6. 批准后，系统在 `vms` 表中创建或更新记录。
7. 批准人的 username 会写入 `vms.owner`。
8. 已批准 VM 会出现在 VM 列表和 Dashboard 中。

Owner 规则：

- `Owner` 表示把 VM 批准加入监控的面板用户。
- 如果是 AD 用户批准，Owner 就是该 AD username。
- 如果是本地管理员批准，Owner 就是 `admin`。
- Agent 不能设置 Owner。

删除规则：

- 删除 VM 会从 `vms` 表移除该 VM。
- 如果同一个 Agent 之后再次上报，它会重新回到待审批状态。
- 服务端会保护已有的非零容量字段，避免被旧 Agent 上报的 0 容量覆盖。

## Host、Name、Location 和 Environment

### VM Name

对于 Agent 创建的 VM，当前 VM 名称就是 Agent 检测到的 hostname。

### Host

后端仍然存储 `host` 字段，值同样来自 `os.Hostname()`。但在当前 Agent 创建 VM 的场景下，Host 和 VM Name 重复，所以主界面不再单独显示 Host 列。

保留该字段是为了未来支持“展示名称”和“主机身份”分离。

### Location

Location 不自动检测。

它由 Agent 环境变量提供：

```bash
MONITOR_LOCATION="Shanghai DC A / Rack 03"
```

Location 应表达物理或运维位置，例如数据中心、机房、机柜、站点或业务区域。

### Environment

Environment 由 Agent 自动检测，表示虚拟化或平台环境，例如：

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

## 指标

### 当前指标

当前指标来自最新一条 `vm_metrics` 记录：

- CPU percent
- Memory percent
- Disk percent
- Network in MB/s
- Network out MB/s

### Network 显示规则

VM 列表和 VM 详情使用同一套 network headline：

```text
networkIn + networkOut
```

这样可以避免一个页面只显示 inbound、另一个页面显示总吞吐导致的数据不一致。

### 指标历史

API 在 `metricHistory` 中返回每台 VM 最近 8 个指标点。

VM 详情页渲染以下图表：

- CPU
- Memory
- Disk
- Network Out

图表行为：

- 鼠标悬停在某个点上时，在固定读数行显示该点的时间和值。
- 图表会高亮悬停点，并显示垂直辅助线。
- tooltip 数据不会覆盖折线本身。
- 键盘 focus 到点位时，会通过 ARIA label 暴露相同的数值。

## 当前 API 范围

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

## 数据库 Migration

当前 migrations：

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
  - pending/approved/rejected 注册状态
- `003_registration_capacity.sql`
  - registration 上的 vCPU、memory GB、storage GB 字段
- `004_registration_environment.sql`
  - registration 上的 environment 字段

重要字段说明：

- `vms.owner`：批准该 VM 的面板用户名。
- `vms.location`：来自 Agent 环境变量的用户填写位置。
- `vms.environment`：Agent 检测到的虚拟化或平台环境。
- `agent_keys.key_hash`：只存储 SHA-256 hash。

## 本地开发运行环境

当前初始化过的本地开发环境使用：

- PostgreSQL：`127.0.0.1:55432`
- API：`http://127.0.0.1:8080`
- 前端：`http://localhost:5174`
- 数据库：`vm_monitor`
- 数据库用户：`vm_monitor`

本地初始化期间创建的管理员：

```text
username: admin
```

本地初始化期间创建的 Agent 测试 key：

```text
vma_<local-test-key>
```

## 验证命令

前端：

```bash
npm test
npm run build
```

Server：

```bash
cd server
go test ./...
go build ./cmd/server
```

Agent：

```bash
cd agent
go test ./...
go build ./cmd/vm-agent
```

运行时 Agent 冒烟测试：

```bash
cd agent
export MONITOR_SERVER_URL="http://127.0.0.1:8080"
export MONITOR_AGENT_KEY="vma_..."
export MONITOR_LOCATION="Local Lab"
go run ./cmd/vm-agent
```

预期行为：

- 如果 VM 尚未批准，新 VM 会出现在 Pending VM Approvals 中。
- 已批准 VM 会收到当前指标和指标历史。
- 当 Agent 采样期间存在真实网络流量时，Network 数值会变化。

## 已知后续项

- 为 AD groups 和 Agent Keys 增加 edit/disable/delete API。
- 增加真实告警生成规则。
- 为 `vm_metrics` 增加保留策略。
- 增加打包 Agent binary 的 release 流程。
- 增加 Linux Agent 的 systemd service 模板。
- 如有需要，增加 Windows Agent 支持。
- 增强 LDAP bind password 的密钥处理。
- 使用一次性 LDAP server 增加完整 LDAP 集成测试。
