package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"vm-monitor-dashboard/server/internal/auth"
	"vm-monitor-dashboard/server/internal/config"
	"vm-monitor-dashboard/server/internal/security"
	"vm-monitor-dashboard/server/internal/store"
)

type contextKey string

const claimsContextKey contextKey = "sessionClaims"

type Server struct {
	cfg   config.Config
	store *store.Store
	ldap  auth.LDAPAuthenticator
}

func New(cfg config.Config, store *store.Store, ldap auth.LDAPAuthenticator) http.Handler {
	server := &Server{cfg: cfg, store: store, ldap: ldap}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/auth/login", server.login)
	mux.HandleFunc("GET /api/vms", server.authenticated(server.listVMs))
	mux.HandleFunc("DELETE /api/vms/{vmId}", server.authenticated(server.deleteVM))
	mux.HandleFunc("GET /api/alerts", server.authenticated(server.listAlerts))
	mux.HandleFunc("GET /api/vm-registrations", server.authenticated(server.listVMRegistrations))
	mux.HandleFunc("POST /api/vm-registrations/{registrationId}/approve", server.authenticated(server.approveVMRegistration))
	mux.HandleFunc("POST /api/vm-registrations/{registrationId}/reject", server.authenticated(server.rejectVMRegistration))
	mux.HandleFunc("GET /api/settings/agent-keys", server.authenticated(server.listAgentKeys))
	mux.HandleFunc("POST /api/settings/agent-keys", server.authenticated(server.createAgentKey))
	mux.HandleFunc("GET /api/settings/ad-groups", server.authenticated(server.listADGroups))
	mux.HandleFunc("POST /api/settings/ad-groups", server.authenticated(server.createADGroup))
	mux.HandleFunc("GET /api/settings/ldap", server.authenticated(server.getLDAP))
	mux.HandleFunc("PUT /api/settings/ldap", server.authenticated(server.updateLDAP))
	mux.HandleFunc("POST /api/agent/heartbeat", server.agentAuthenticated(server.agentHeartbeat))
	return withJSON(mux)
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if user, err := s.store.GetLocalUser(r.Context(), req.Username); err == nil && user.Enabled && security.CheckPassword(user.PasswordHash, req.Password) {
		token, _ := security.SignSession(security.SessionClaims{
			Subject: user.ID, Username: user.Username, AuthType: "local", ExpiresAt: time.Now().Add(12 * time.Hour).Unix(),
		}, s.cfg.SessionSecret)
		writeJSON(w, http.StatusOK, LoginResponse{Token: token, User: User{ID: user.ID, Username: user.Username, AuthType: "local"}})
		return
	}
	identity, err := s.ldap.Authenticate(r.Context(), req.Username, req.Password)
	if err == nil {
		token, _ := security.SignSession(security.SessionClaims{
			Subject: identity.DN, Username: identity.Username, AuthType: "ldap", Groups: identity.Groups, ExpiresAt: time.Now().Add(12 * time.Hour).Unix(),
		}, s.cfg.SessionSecret)
		writeJSON(w, http.StatusOK, LoginResponse{Token: token, User: User{ID: identity.DN, Username: identity.Username, AuthType: "ldap", Groups: identity.Groups}})
		return
	}
	writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
}

func (s *Server) listVMs(w http.ResponseWriter, r *http.Request) {
	vms, err := s.store.ListVMs(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, vms)
}

func (s *Server) listAlerts(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, []any{})
}

func (s *Server) deleteVM(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeleteVM(r.Context(), r.PathValue("vmId")); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (s *Server) listVMRegistrations(w http.ResponseWriter, r *http.Request) {
	items, err := s.store.ListPendingRegistrations(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) approveVMRegistration(w http.ResponseWriter, r *http.Request) {
	claims, _ := r.Context().Value(claimsContextKey).(security.SessionClaims)
	if err := s.store.ApproveRegistration(r.Context(), r.PathValue("registrationId"), claims.Username); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "approved"})
}

func (s *Server) rejectVMRegistration(w http.ResponseWriter, r *http.Request) {
	if err := s.store.RejectRegistration(r.Context(), r.PathValue("registrationId")); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "rejected"})
}

func (s *Server) listAgentKeys(w http.ResponseWriter, r *http.Request) {
	keys, err := s.store.ListAgentKeys(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, keys)
}

func (s *Server) createAgentKey(w http.ResponseWriter, r *http.Request) {
	var req AgentKeyRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	plain, prefix, hash, err := security.NewAgentKey()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	id, err := s.store.CreateAgentKey(r.Context(), req.Name, prefix, hash)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": id, "name": req.Name, "key": plain, "prefix": prefix})
}

func (s *Server) listADGroups(w http.ResponseWriter, r *http.Request) {
	groups, err := s.store.ListADGroups(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, groups)
}

func (s *Server) createADGroup(w http.ResponseWriter, r *http.Request) {
	var req ADGroupRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	group, err := s.store.CreateADGroup(r.Context(), req.Name, req.DistinguishedName, req.Enabled)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusCreated, group)
}

func (s *Server) getLDAP(w http.ResponseWriter, r *http.Request) {
	cfg, err := s.store.GetLDAPConfig(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, LDAPConfigRequest{
		Enabled: cfg.Enabled, URL: cfg.URL, BindDN: cfg.BindDN, UserBaseDN: cfg.UserBaseDN,
		UserFilter: cfg.UserFilter, GroupBaseDN: cfg.GroupBaseDN, GroupMemberAttr: cfg.GroupMemberAttr,
		StartTLS: cfg.StartTLS, InsecureSkipVerify: cfg.InsecureSkipVerify,
	})
}

func (s *Server) updateLDAP(w http.ResponseWriter, r *http.Request) {
	var req LDAPConfigRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	cfg := auth.LDAPConfig{
		Enabled: req.Enabled, URL: req.URL, BindDN: req.BindDN, BindPassword: req.BindPassword,
		UserBaseDN: req.UserBaseDN, UserFilter: req.UserFilter, GroupBaseDN: req.GroupBaseDN,
		GroupMemberAttr: req.GroupMemberAttr, StartTLS: req.StartTLS, InsecureSkipVerify: req.InsecureSkipVerify,
	}
	if err := s.store.UpdateLDAPConfig(r.Context(), cfg); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, req)
}

func (s *Server) agentHeartbeat(w http.ResponseWriter, r *http.Request) {
	var req AgentHeartbeat
	if !decodeJSON(w, r, &req) {
		return
	}
	key := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	agentKeyID, err := s.store.ValidateAgentKey(r.Context(), security.HashAgentKey(key))
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid agent key"})
		return
	}
	status, err := s.store.RecordHeartbeat(r.Context(), agentKeyID, store.Heartbeat{
		ExternalID: req.ExternalID, Name: req.Name, IPAddress: req.IPAddress, Host: req.Host,
		Location: req.Location, OS: req.OS, Environment: req.Environment,
		VCPU: req.VCPU, MemoryGB: req.MemoryGB, StorageGB: req.StorageGB,
		UptimeSeconds: req.UptimeSeconds,
		CPUPercent: req.CPUPercent, MemoryPercent: req.MemoryPercent, DiskPercent: req.DiskPercent,
		NetworkInMbps: req.NetworkInMbps, NetworkOutMbps: req.NetworkOutMbps, Tags: req.Tags,
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]string{"status": status})
}

func (s *Server) authenticated(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if token == "" {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing bearer token"})
			return
		}
		claims, err := security.VerifySession(token, s.cfg.SessionSecret)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid bearer token"})
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), claimsContextKey, claims)))
	}
}

func (s *Server) agentAuthenticated(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if key == "" {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing agent key"})
			return
		}
		if _, err := s.store.ValidateAgentKey(r.Context(), security.HashAgentKey(key)); err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid agent key"})
			return
		}
		next(w, r)
	}
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	defer r.Body.Close()
	if err := json.NewDecoder(r.Body).Decode(target); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func withJSON(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

func ContextWithShutdown(parent context.Context) (context.Context, context.CancelFunc) {
	return context.WithCancel(parent)
}
