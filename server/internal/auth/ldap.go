package auth

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"strings"

	"github.com/go-ldap/ldap/v3"
)

type LDAPConfig struct {
	Enabled            bool
	URL                string
	BindDN             string
	BindPassword       string
	UserBaseDN         string
	UserFilter         string
	GroupBaseDN        string
	GroupMemberAttr    string
	StartTLS           bool
	InsecureSkipVerify bool
}

type LDAPIdentity struct {
	Username string
	DN       string
	Groups   []string
}

type LDAPAuthenticator interface {
	Authenticate(ctx context.Context, username string, password string) (LDAPIdentity, error)
}

type ConfigProvider interface {
	GetLDAPConfig(ctx context.Context) (LDAPConfig, error)
	ListEnabledADGroupDNs(ctx context.Context) ([]string, error)
}

type Authenticator struct {
	provider ConfigProvider
}

func NewLDAPAuthenticator(provider ConfigProvider) Authenticator {
	return Authenticator{provider: provider}
}

func (a Authenticator) Authenticate(ctx context.Context, username string, password string) (LDAPIdentity, error) {
	if username == "" || password == "" {
		return LDAPIdentity{}, errors.New("missing credentials")
	}
	cfg, err := a.provider.GetLDAPConfig(ctx)
	if err != nil {
		return LDAPIdentity{}, err
	}
	if !cfg.Enabled {
		return LDAPIdentity{}, errors.New("ldap is disabled")
	}
	allowed, err := a.provider.ListEnabledADGroupDNs(ctx)
	if err != nil {
		return LDAPIdentity{}, err
	}
	if len(allowed) == 0 {
		return LDAPIdentity{}, errors.New("no enabled ad groups")
	}

	tlsConfig := &tls.Config{InsecureSkipVerify: cfg.InsecureSkipVerify}
	conn, err := ldap.DialURL(cfg.URL, ldap.DialWithTLSConfig(tlsConfig))
	if err != nil {
		return LDAPIdentity{}, err
	}
	defer conn.Close()
	if cfg.StartTLS {
		if err := conn.StartTLS(tlsConfig); err != nil {
			return LDAPIdentity{}, err
		}
	}

	if err := conn.Bind(cfg.BindDN, cfg.BindPassword); err != nil {
		return LDAPIdentity{}, fmt.Errorf("service bind failed: %w", err)
	}

	userFilter := strings.ReplaceAll(cfg.UserFilter, "{username}", ldap.EscapeFilter(username))
	userSearch := ldap.NewSearchRequest(
		cfg.UserBaseDN,
		ldap.ScopeWholeSubtree,
		ldap.NeverDerefAliases,
		1,
		0,
		false,
		userFilter,
		[]string{"dn", "sAMAccountName", "cn"},
		nil,
	)
	userResult, err := conn.Search(userSearch)
	if err != nil {
		return LDAPIdentity{}, err
	}
	if len(userResult.Entries) != 1 {
		return LDAPIdentity{}, errors.New("user not found")
	}
	userDN := userResult.Entries[0].DN
	if err := conn.Bind(userDN, password); err != nil {
		return LDAPIdentity{}, errors.New("invalid credentials")
	}
	if err := conn.Bind(cfg.BindDN, cfg.BindPassword); err != nil {
		return LDAPIdentity{}, fmt.Errorf("service rebind failed: %w", err)
	}

	memberAttr := cfg.GroupMemberAttr
	if memberAttr == "" {
		memberAttr = "member"
	}
	groupSearch := ldap.NewSearchRequest(
		cfg.GroupBaseDN,
		ldap.ScopeWholeSubtree,
		ldap.NeverDerefAliases,
		0,
		0,
		false,
		fmt.Sprintf("(%s=%s)", memberAttr, ldap.EscapeFilter(userDN)),
		[]string{"dn", "cn"},
		nil,
	)
	groupResult, err := conn.Search(groupSearch)
	if err != nil {
		return LDAPIdentity{}, err
	}
	matched := intersectGroupDNs(groupResult.Entries, allowed)
	if len(matched) == 0 {
		return LDAPIdentity{}, errors.New("user is not in an allowed ad group")
	}
	return LDAPIdentity{Username: username, DN: userDN, Groups: matched}, nil
}

type DisabledLDAPAuthenticator struct{}

func (DisabledLDAPAuthenticator) Authenticate(context.Context, string, string) (LDAPIdentity, error) {
	return LDAPIdentity{}, errors.New("ldap is not configured")
}

func intersectGroupDNs(entries []*ldap.Entry, allowed []string) []string {
	allowedSet := map[string]string{}
	for _, dn := range allowed {
		allowedSet[strings.ToLower(dn)] = dn
	}
	matched := []string{}
	for _, entry := range entries {
		if original, ok := allowedSet[strings.ToLower(entry.DN)]; ok {
			matched = append(matched, original)
		}
	}
	return matched
}
