CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS local_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ldap_config (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  url TEXT NOT NULL DEFAULT '',
  bind_dn TEXT NOT NULL DEFAULT '',
  bind_password_ciphertext TEXT NOT NULL DEFAULT '',
  user_base_dn TEXT NOT NULL DEFAULT '',
  user_filter TEXT NOT NULL DEFAULT '(sAMAccountName={username})',
  group_base_dn TEXT NOT NULL DEFAULT '',
  group_member_attribute TEXT NOT NULL DEFAULT 'member',
  start_tls BOOLEAN NOT NULL DEFAULT FALSE,
  insecure_skip_verify BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ldap_config_singleton CHECK (id)
);

CREATE TABLE IF NOT EXISTS ad_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  distinguished_name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS vms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key_id UUID REFERENCES agent_keys(id),
  external_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  ip_address TEXT NOT NULL DEFAULT '',
  host TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  os TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL DEFAULT '',
  environment TEXT NOT NULL DEFAULT '',
  vcpu INTEGER NOT NULL DEFAULT 0,
  memory_gb INTEGER NOT NULL DEFAULT 0,
  storage_gb INTEGER NOT NULL DEFAULT 0,
  uptime_seconds BIGINT NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vm_metrics (
  id BIGSERIAL PRIMARY KEY,
  vm_id UUID NOT NULL REFERENCES vms(id) ON DELETE CASCADE,
  captured_at TIMESTAMPTZ NOT NULL,
  cpu_percent NUMERIC(5,2) NOT NULL,
  memory_percent NUMERIC(5,2) NOT NULL,
  disk_percent NUMERIC(5,2) NOT NULL,
  network_in_mbps NUMERIC(12,2) NOT NULL,
  network_out_mbps NUMERIC(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS vm_metrics_vm_time_idx ON vm_metrics (vm_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vm_id UUID NOT NULL REFERENCES vms(id) ON DELETE CASCADE,
  severity TEXT NOT NULL,
  resource TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS alerts_status_severity_idx ON alerts (status, severity, created_at DESC);

INSERT INTO ldap_config (id)
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;
