package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"vm-monitor-dashboard/server/internal/auth"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

type LocalUser struct {
	ID           string
	Username     string
	PasswordHash string
	Enabled      bool
}

type AgentKey struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Prefix    string `json:"prefix"`
	Enabled   bool   `json:"enabled"`
	CreatedAt string `json:"createdAt"`
	LastUsedAt string `json:"lastUsedAt,omitempty"`
}

type ADGroup struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	DistinguishedName string `json:"distinguishedName"`
	Enabled           bool   `json:"enabled"`
}

type Heartbeat struct {
	ExternalID     string
	Name           string
	IPAddress      string
	Host           string
	Location       string
	OS             string
	Environment    string
	VCPU           int
	MemoryGB       int
	StorageGB      int
	UptimeSeconds  int64
	CPUPercent     float64
	MemoryPercent  float64
	DiskPercent    float64
	NetworkInMbps  float64
	NetworkOutMbps float64
	Tags           []string
}

type VMRegistration struct {
	ID              string   `json:"id"`
	ExternalID      string   `json:"externalId"`
	Name            string   `json:"name"`
	IPAddress       string   `json:"ipAddress"`
	Host            string   `json:"host"`
	Location        string   `json:"location"`
	OS              string   `json:"os"`
	Environment     string   `json:"environment"`
	VCPU            int      `json:"vcpu"`
	MemoryGB        int      `json:"memoryGb"`
	StorageGB       int      `json:"storageGb"`
	UptimeSeconds   int64    `json:"uptimeSeconds"`
	CPUPercent      float64  `json:"cpuPercent"`
	MemoryPercent   float64  `json:"memoryPercent"`
	DiskPercent     float64  `json:"diskPercent"`
	NetworkInMbps   float64  `json:"networkInMbps"`
	NetworkOutMbps  float64  `json:"networkOutMbps"`
	Tags            []string `json:"tags"`
	RequestedAt     string   `json:"requestedAt"`
}

func Open(ctx context.Context, databaseURL string) (*Store, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &Store{pool: pool}, nil
}

func (s *Store) Close() {
	s.pool.Close()
}

func (s *Store) Migrate(ctx context.Context, migrationSQL string) error {
	_, err := s.pool.Exec(ctx, migrationSQL)
	return err
}

func (s *Store) CreateLocalUser(ctx context.Context, username string, passwordHash string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO local_users (username, password_hash, display_name)
		VALUES ($1, $2, $1)
		ON CONFLICT (username) DO UPDATE
		SET password_hash = EXCLUDED.password_hash, enabled = TRUE, updated_at = now()
	`, username, passwordHash)
	return err
}

func (s *Store) GetLocalUser(ctx context.Context, username string) (LocalUser, error) {
	var user LocalUser
	err := s.pool.QueryRow(ctx, `
		SELECT id::text, username, password_hash, enabled
		FROM local_users
		WHERE username = $1
	`, username).Scan(&user.ID, &user.Username, &user.PasswordHash, &user.Enabled)
	return user, err
}

func (s *Store) GetLDAPConfig(ctx context.Context) (auth.LDAPConfig, error) {
	var cfg auth.LDAPConfig
	err := s.pool.QueryRow(ctx, `
		SELECT enabled, url, bind_dn, bind_password_ciphertext, user_base_dn, user_filter,
		       group_base_dn, group_member_attribute, start_tls, insecure_skip_verify
		FROM ldap_config
		WHERE id = TRUE
	`).Scan(&cfg.Enabled, &cfg.URL, &cfg.BindDN, &cfg.BindPassword, &cfg.UserBaseDN, &cfg.UserFilter, &cfg.GroupBaseDN, &cfg.GroupMemberAttr, &cfg.StartTLS, &cfg.InsecureSkipVerify)
	return cfg, err
}

func (s *Store) UpdateLDAPConfig(ctx context.Context, cfg auth.LDAPConfig) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO ldap_config (
			id, enabled, url, bind_dn, bind_password_ciphertext, user_base_dn, user_filter,
			group_base_dn, group_member_attribute, start_tls, insecure_skip_verify, updated_at
		)
		VALUES (TRUE, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
		ON CONFLICT (id) DO UPDATE SET
			enabled = EXCLUDED.enabled,
			url = EXCLUDED.url,
			bind_dn = EXCLUDED.bind_dn,
			bind_password_ciphertext = EXCLUDED.bind_password_ciphertext,
			user_base_dn = EXCLUDED.user_base_dn,
			user_filter = EXCLUDED.user_filter,
			group_base_dn = EXCLUDED.group_base_dn,
			group_member_attribute = EXCLUDED.group_member_attribute,
			start_tls = EXCLUDED.start_tls,
			insecure_skip_verify = EXCLUDED.insecure_skip_verify,
			updated_at = now()
	`, cfg.Enabled, cfg.URL, cfg.BindDN, cfg.BindPassword, cfg.UserBaseDN, cfg.UserFilter, cfg.GroupBaseDN, cfg.GroupMemberAttr, cfg.StartTLS, cfg.InsecureSkipVerify)
	return err
}

func (s *Store) ListADGroups(ctx context.Context) ([]ADGroup, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id::text, name, distinguished_name, enabled
		FROM ad_groups
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	groups := []ADGroup{}
	for rows.Next() {
		var group ADGroup
		if err := rows.Scan(&group.ID, &group.Name, &group.DistinguishedName, &group.Enabled); err != nil {
			return nil, err
		}
		groups = append(groups, group)
	}
	return groups, rows.Err()
}

func (s *Store) ListEnabledADGroupDNs(ctx context.Context) ([]string, error) {
	rows, err := s.pool.Query(ctx, `SELECT distinguished_name FROM ad_groups WHERE enabled = TRUE`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var dns []string
	for rows.Next() {
		var dn string
		if err := rows.Scan(&dn); err != nil {
			return nil, err
		}
		dns = append(dns, dn)
	}
	return dns, rows.Err()
}

func (s *Store) CreateADGroup(ctx context.Context, name string, distinguishedName string, enabled bool) (ADGroup, error) {
	group := ADGroup{ID: uuid.NewString(), Name: name, DistinguishedName: distinguishedName, Enabled: enabled}
	_, err := s.pool.Exec(ctx, `
		INSERT INTO ad_groups (id, name, distinguished_name, enabled)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (distinguished_name) DO UPDATE
		SET name = EXCLUDED.name, enabled = EXCLUDED.enabled, updated_at = now()
	`, group.ID, group.Name, group.DistinguishedName, group.Enabled)
	return group, err
}

func (s *Store) ListVMs(ctx context.Context) ([]map[string]any, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT v.id::text, v.external_id, v.name, v.status, v.ip_address, v.host, v.location, v.os, v.owner, v.environment,
		       v.vcpu, v.memory_gb, v.storage_gb, v.uptime_seconds, v.tags, v.last_seen_at,
		       COALESCE(m.cpu_percent, 0), COALESCE(m.memory_percent, 0), COALESCE(m.disk_percent, 0),
		       COALESCE(m.network_in_mbps, 0), COALESCE(m.network_out_mbps, 0)
		FROM vms v
		LEFT JOIN LATERAL (
			SELECT cpu_percent, memory_percent, disk_percent, network_in_mbps, network_out_mbps
			FROM vm_metrics
			WHERE vm_id = v.id
			ORDER BY captured_at DESC
			LIMIT 1
		) m ON TRUE
		ORDER BY v.name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []map[string]any{}
	for rows.Next() {
		var vmID, externalID, name, status, ip, host, location, osName, owner, environment string
		var vcpu, memoryGB, storageGB int
		var uptime int64
		var tags []string
		var lastSeen *time.Time
		var cpu, memory, disk, networkIn, networkOut float64
		if err := rows.Scan(&vmID, &externalID, &name, &status, &ip, &host, &location, &osName, &owner, &environment, &vcpu, &memoryGB, &storageGB, &uptime, &tags, &lastSeen, &cpu, &memory, &disk, &networkIn, &networkOut); err != nil {
			return nil, err
		}
		history, err := s.metricHistory(ctx, vmID)
		if err != nil {
			return nil, err
		}
		items = append(items, map[string]any{
			"id": externalID, "name": name, "status": status, "ipAddress": ip, "host": host,
			"region": location, "os": osName, "owner": owner, "environment": environment,
			"vcpu": vcpu, "memoryGb": memoryGB, "storageGb": storageGB, "uptime": formatUptime(uptime),
			"tags": tags, "lastSeenAt": lastSeen,
			"currentMetrics": map[string]any{
				"cpu": cpu, "memory": memory, "disk": disk, "networkIn": networkIn, "networkOut": networkOut,
			},
			"metricHistory": history, "alerts": []any{}, "events": []any{},
		})
	}
	return items, rows.Err()
}

func (s *Store) metricHistory(ctx context.Context, vmID string) ([]map[string]any, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT captured_at, cpu_percent, memory_percent, disk_percent, network_in_mbps, network_out_mbps
		FROM (
			SELECT captured_at, cpu_percent, memory_percent, disk_percent, network_in_mbps, network_out_mbps
			FROM vm_metrics
			WHERE vm_id = $1
			ORDER BY captured_at DESC
			LIMIT 8
		) recent
		ORDER BY captured_at
	`, vmID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	history := []map[string]any{}
	for rows.Next() {
		var capturedAt time.Time
		var cpu, memory, disk, networkIn, networkOut float64
		if err := rows.Scan(&capturedAt, &cpu, &memory, &disk, &networkIn, &networkOut); err != nil {
			return nil, err
		}
		history = append(history, map[string]any{
			"time": capturedAt.Format("15:04:05"), "cpu": cpu, "memory": memory, "disk": disk,
			"networkIn": networkIn, "networkOut": networkOut,
		})
	}
	return history, rows.Err()
}

func (s *Store) DeleteVM(ctx context.Context, externalID string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM vms WHERE external_id = $1`, externalID)
	return err
}

func (s *Store) RecordHeartbeat(ctx context.Context, agentKeyID string, hb Heartbeat) (string, error) {
	var vmID string
	err := s.pool.QueryRow(ctx, `SELECT id::text FROM vms WHERE external_id = $1`, hb.ExternalID).Scan(&vmID)
	if err == nil {
		_, err = s.pool.Exec(ctx, `
			UPDATE vms
			SET name = $2, ip_address = $3, host = $4, location = $5, os = $6, environment = $12,
			    uptime_seconds = $7, tags = $8,
			    vcpu = COALESCE(NULLIF($9, 0), vcpu),
			    memory_gb = COALESCE(NULLIF($10, 0), memory_gb),
			    storage_gb = COALESCE(NULLIF($11, 0), storage_gb),
			    last_seen_at = now(), updated_at = now()
			WHERE external_id = $1
		`, hb.ExternalID, hb.Name, hb.IPAddress, hb.Host, hb.Location, hb.OS, hb.UptimeSeconds, hb.Tags, hb.VCPU, hb.MemoryGB, hb.StorageGB, hb.Environment)
		if err != nil {
			return "", err
		}
		_, err = s.pool.Exec(ctx, `
			INSERT INTO vm_metrics (
				vm_id, captured_at, cpu_percent, memory_percent, disk_percent, network_in_mbps, network_out_mbps
			)
			VALUES ($1, now(), $2, $3, $4, $5, $6)
		`, vmID, hb.CPUPercent, hb.MemoryPercent, hb.DiskPercent, hb.NetworkInMbps, hb.NetworkOutMbps)
		return "updated", err
	}

	_, err = s.pool.Exec(ctx, `
		INSERT INTO vm_registrations (
			agent_key_id, external_id, name, ip_address, host, location, os, environment, uptime_seconds,
			vcpu, memory_gb, storage_gb, cpu_percent, memory_percent, disk_percent, network_in_mbps, network_out_mbps, tags, status, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'pending', now())
		ON CONFLICT (external_id) DO UPDATE SET
			agent_key_id = EXCLUDED.agent_key_id,
			name = EXCLUDED.name,
			ip_address = EXCLUDED.ip_address,
			host = EXCLUDED.host,
			location = EXCLUDED.location,
			os = EXCLUDED.os,
			environment = EXCLUDED.environment,
			uptime_seconds = EXCLUDED.uptime_seconds,
			vcpu = EXCLUDED.vcpu,
			memory_gb = EXCLUDED.memory_gb,
			storage_gb = EXCLUDED.storage_gb,
			cpu_percent = EXCLUDED.cpu_percent,
			memory_percent = EXCLUDED.memory_percent,
			disk_percent = EXCLUDED.disk_percent,
			network_in_mbps = EXCLUDED.network_in_mbps,
			network_out_mbps = EXCLUDED.network_out_mbps,
			tags = EXCLUDED.tags,
			status = 'pending',
			decided_at = NULL,
			updated_at = now()
	`, agentKeyID, hb.ExternalID, hb.Name, hb.IPAddress, hb.Host, hb.Location, hb.OS, hb.Environment, hb.UptimeSeconds, hb.VCPU, hb.MemoryGB, hb.StorageGB, hb.CPUPercent, hb.MemoryPercent, hb.DiskPercent, hb.NetworkInMbps, hb.NetworkOutMbps, hb.Tags)
	if err != nil {
		return "", err
	}
	return "pending_approval", nil
}

func (s *Store) ListPendingRegistrations(ctx context.Context) ([]VMRegistration, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id::text, external_id, name, ip_address, host, location, os, environment, vcpu, memory_gb, storage_gb, uptime_seconds,
		       cpu_percent, memory_percent, disk_percent, network_in_mbps, network_out_mbps, tags, requested_at::text
		FROM vm_registrations
		WHERE status = 'pending'
		ORDER BY requested_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []VMRegistration{}
	for rows.Next() {
		var item VMRegistration
		if err := rows.Scan(&item.ID, &item.ExternalID, &item.Name, &item.IPAddress, &item.Host, &item.Location, &item.OS, &item.Environment, &item.VCPU, &item.MemoryGB, &item.StorageGB, &item.UptimeSeconds, &item.CPUPercent, &item.MemoryPercent, &item.DiskPercent, &item.NetworkInMbps, &item.NetworkOutMbps, &item.Tags, &item.RequestedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) ApproveRegistration(ctx context.Context, id string, owner string) error {
	if owner == "" {
		owner = "unknown"
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var reg VMRegistration
	var agentKeyID string
	err = tx.QueryRow(ctx, `
		SELECT agent_key_id::text, external_id, name, ip_address, host, location, os, environment, vcpu, memory_gb, storage_gb, uptime_seconds,
		       cpu_percent, memory_percent, disk_percent, network_in_mbps, network_out_mbps, tags
		FROM vm_registrations
		WHERE id = $1 AND status = 'pending'
	`, id).Scan(&agentKeyID, &reg.ExternalID, &reg.Name, &reg.IPAddress, &reg.Host, &reg.Location, &reg.OS, &reg.Environment, &reg.VCPU, &reg.MemoryGB, &reg.StorageGB, &reg.UptimeSeconds, &reg.CPUPercent, &reg.MemoryPercent, &reg.DiskPercent, &reg.NetworkInMbps, &reg.NetworkOutMbps, &reg.Tags)
	if err != nil {
		return err
	}

	vmID := uuid.NewString()
	_, err = tx.Exec(ctx, `
		INSERT INTO vms (id, agent_key_id, external_id, name, status, ip_address, host, location, os, environment, owner, vcpu, memory_gb, storage_gb, uptime_seconds, tags, last_seen_at)
		VALUES ($1, $2, $3, $4, 'running', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now())
		ON CONFLICT (external_id) DO UPDATE SET
			name = EXCLUDED.name,
			status = 'running',
			ip_address = EXCLUDED.ip_address,
			host = EXCLUDED.host,
			location = EXCLUDED.location,
			os = EXCLUDED.os,
			environment = EXCLUDED.environment,
			owner = EXCLUDED.owner,
			vcpu = EXCLUDED.vcpu,
			memory_gb = EXCLUDED.memory_gb,
			storage_gb = EXCLUDED.storage_gb,
			uptime_seconds = EXCLUDED.uptime_seconds,
			tags = EXCLUDED.tags,
			last_seen_at = now(),
			updated_at = now()
	`, vmID, agentKeyID, reg.ExternalID, reg.Name, reg.IPAddress, reg.Host, reg.Location, reg.OS, reg.Environment, owner, reg.VCPU, reg.MemoryGB, reg.StorageGB, reg.UptimeSeconds, reg.Tags)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO vm_metrics (vm_id, captured_at, cpu_percent, memory_percent, disk_percent, network_in_mbps, network_out_mbps)
		SELECT id, now(), $2, $3, $4, $5, $6 FROM vms WHERE external_id = $1
	`, reg.ExternalID, reg.CPUPercent, reg.MemoryPercent, reg.DiskPercent, reg.NetworkInMbps, reg.NetworkOutMbps)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `UPDATE vm_registrations SET status = 'approved', decided_at = now(), updated_at = now() WHERE id = $1`, id)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *Store) RejectRegistration(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `UPDATE vm_registrations SET status = 'rejected', decided_at = now(), updated_at = now() WHERE id = $1`, id)
	return err
}

func (s *Store) ListAgentKeys(ctx context.Context) ([]AgentKey, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id::text, name, prefix, enabled, created_at::text, COALESCE(last_used_at::text, '')
		FROM agent_keys
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	keys := []AgentKey{}
	for rows.Next() {
		var key AgentKey
		if err := rows.Scan(&key.ID, &key.Name, &key.Prefix, &key.Enabled, &key.CreatedAt, &key.LastUsedAt); err != nil {
			return nil, err
		}
		keys = append(keys, key)
	}
	return keys, rows.Err()
}

func (s *Store) CreateAgentKey(ctx context.Context, name string, prefix string, hash string) (string, error) {
	id := uuid.NewString()
	_, err := s.pool.Exec(ctx, `INSERT INTO agent_keys (id, name, prefix, key_hash) VALUES ($1, $2, $3, $4)`, id, name, prefix, hash)
	return id, err
}

func (s *Store) ValidateAgentKey(ctx context.Context, hash string) (string, error) {
	var id string
	err := s.pool.QueryRow(ctx, `
		UPDATE agent_keys SET last_used_at = now()
		WHERE key_hash = $1 AND enabled = TRUE AND revoked_at IS NULL
		RETURNING id::text
	`, hash).Scan(&id)
	if err != nil {
		return "", err
	}
	if id == "" {
		return "", errors.New("agent key denied")
	}
	return id, nil
}

func formatUptime(seconds int64) string {
	if seconds <= 0 {
		return "0d"
	}
	days := seconds / 86400
	hours := (seconds % 86400) / 3600
	return strconvFormat(days) + "d " + strconvFormat(hours) + "h"
}

func strconvFormat(value int64) string {
	return fmt.Sprintf("%d", value)
}
