CREATE TABLE IF NOT EXISTS vm_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key_id UUID REFERENCES agent_keys(id),
  external_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL DEFAULT '',
  host TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  os TEXT NOT NULL DEFAULT '',
  uptime_seconds BIGINT NOT NULL DEFAULT 0,
  cpu_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  memory_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  disk_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  network_in_mbps NUMERIC(12,2) NOT NULL DEFAULT 0,
  network_out_mbps NUMERIC(12,2) NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS vm_registrations_status_requested_idx
  ON vm_registrations (status, requested_at DESC);
