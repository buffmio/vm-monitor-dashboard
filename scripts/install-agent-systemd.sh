#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="vm-monitor-agent"
INSTALL_BIN="/usr/local/bin/vm-monitor-agent"
ENV_FILE="/etc/vm-monitor-agent.env"
UNIT_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

SERVER_URL=""
AGENT_KEY=""
LOCATION=""
INTERVAL_SECONDS="30"
BINARY_PATH=""
NON_INTERACTIVE="false"

usage() {
  cat <<'USAGE'
Install VM Monitor Agent as a systemd service.

Interactive:
  sudo ./scripts/install-agent-systemd.sh

Non-interactive:
  sudo ./scripts/install-agent-systemd.sh \
    --server-url http://panel-host:8080 \
    --agent-key vma_... \
    --location "Shanghai DC A / Rack 03" \
    --interval 30 \
    --binary ./build/agent/vm-agent-linux-amd64

Options:
  --server-url VALUE   VM Monitor panel URL.
  --agent-key VALUE    Agent Key generated in Settings.
  --location VALUE     VM location label.
  --interval VALUE     Heartbeat interval seconds. Default: 30.
  --binary VALUE       Local Agent binary path.
  --yes                Fail instead of prompting for missing values.
  -h, --help           Show this help.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --server-url)
      SERVER_URL="${2:-}"
      shift 2
      ;;
    --agent-key)
      AGENT_KEY="${2:-}"
      shift 2
      ;;
    --location)
      LOCATION="${2:-}"
      shift 2
      ;;
    --interval)
      INTERVAL_SECONDS="${2:-}"
      shift 2
      ;;
    --binary)
      BINARY_PATH="${2:-}"
      shift 2
      ;;
    --yes)
      NON_INTERACTIVE="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "this installer must run as root; use sudo" >&2
    exit 1
  fi
}

prompt_value() {
  local var_name="$1"
  local prompt="$2"
  local default_value="${3:-}"
  local secret="${4:-false}"
  local current_value="${!var_name}"

  if [[ -n "${current_value}" ]]; then
    return
  fi

  if [[ "${NON_INTERACTIVE}" == "true" ]]; then
    echo "missing required value: ${var_name}" >&2
    exit 2
  fi

  local answer=""
  if [[ "${secret}" == "true" ]]; then
    if [[ -n "${default_value}" ]]; then
      read -r -s -p "${prompt} [default hidden]: " answer
    else
      read -r -s -p "${prompt}: " answer
    fi
    echo
  else
    if [[ -n "${default_value}" ]]; then
      read -r -p "${prompt} [${default_value}]: " answer
    else
      read -r -p "${prompt}: " answer
    fi
  fi

  if [[ -z "${answer}" ]]; then
    answer="${default_value}"
  fi
  printf -v "${var_name}" '%s' "${answer}"
}

validate() {
  if [[ -z "${SERVER_URL}" ]]; then
    echo "server URL is required" >&2
    exit 2
  fi
  if [[ -z "${AGENT_KEY}" ]]; then
    echo "agent key is required" >&2
    exit 2
  fi
  if [[ -z "${BINARY_PATH}" ]]; then
    echo "agent binary path is required" >&2
    exit 2
  fi
  if [[ ! -f "${BINARY_PATH}" ]]; then
    echo "agent binary not found: ${BINARY_PATH}" >&2
    exit 2
  fi
  if [[ ! -x "${BINARY_PATH}" ]]; then
    chmod +x "${BINARY_PATH}"
  fi
  if ! [[ "${INTERVAL_SECONDS}" =~ ^[0-9]+$ ]] || [[ "${INTERVAL_SECONDS}" -le 0 ]]; then
    echo "interval must be a positive integer" >&2
    exit 2
  fi
}

systemd_env_quote() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//\$/\\\$}"
  value="${value//\`/\\\`}"
  printf '"%s"' "${value}"
}

write_env_file() {
  umask 077
  cat > "${ENV_FILE}" <<EOF
MONITOR_SERVER_URL=$(systemd_env_quote "${SERVER_URL}")
MONITOR_AGENT_KEY=$(systemd_env_quote "${AGENT_KEY}")
MONITOR_LOCATION=$(systemd_env_quote "${LOCATION}")
MONITOR_INTERVAL_SECONDS=$(systemd_env_quote "${INTERVAL_SECONDS}")
EOF
  chmod 600 "${ENV_FILE}"
}

write_unit_file() {
  cat > "${UNIT_FILE}" <<EOF
[Unit]
Description=VM Monitor Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=${ENV_FILE}
ExecStart=${INSTALL_BIN}
Restart=always
RestartSec=10
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=read-only
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
}

install_agent() {
  install -m 0755 "${BINARY_PATH}" "${INSTALL_BIN}"
  write_env_file
  write_unit_file

  systemctl daemon-reload
  systemctl enable --now "${SERVICE_NAME}"
}

main() {
  require_root

  local default_binary="./build/agent/vm-agent-linux-amd64"
  if [[ ! -f "${default_binary}" ]]; then
    default_binary="./vm-agent-linux-amd64"
  fi

  prompt_value SERVER_URL "Panel URL, for example http://panel-host:8080"
  prompt_value AGENT_KEY "Agent Key" "" true
  prompt_value LOCATION "Location" "Local Lab"
  prompt_value INTERVAL_SECONDS "Heartbeat interval seconds" "30"
  prompt_value BINARY_PATH "Agent binary path" "${default_binary}"

  validate
  install_agent

  cat <<EOF
${SERVICE_NAME} installed and started.

Status:
  systemctl status ${SERVICE_NAME}

Logs:
  journalctl -u ${SERVICE_NAME} -f

Restart:
  systemctl restart ${SERVICE_NAME}

Stop:
  systemctl stop ${SERVICE_NAME}

Config:
  ${ENV_FILE}
EOF
}

main "$@"
