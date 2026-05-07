package httpapi

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type User struct {
	ID       string   `json:"id"`
	Username string   `json:"username"`
	AuthType string   `json:"authType"`
	Groups   []string `json:"groups,omitempty"`
}

type LDAPConfigRequest struct {
	Enabled            bool   `json:"enabled"`
	URL                string `json:"url"`
	BindDN             string `json:"bindDn"`
	BindPassword       string `json:"bindPassword,omitempty"`
	UserBaseDN         string `json:"userBaseDn"`
	UserFilter         string `json:"userFilter"`
	GroupBaseDN        string `json:"groupBaseDn"`
	GroupMemberAttr    string `json:"groupMemberAttribute"`
	StartTLS           bool   `json:"startTls"`
	InsecureSkipVerify bool   `json:"insecureSkipVerify"`
}

type ADGroupRequest struct {
	Name              string `json:"name"`
	DistinguishedName string `json:"distinguishedName"`
	Enabled           bool   `json:"enabled"`
}

type AgentKeyRequest struct {
	Name string `json:"name"`
}

type AgentHeartbeat struct {
	ExternalID      string         `json:"externalId"`
	Name            string         `json:"name"`
	IPAddress       string         `json:"ipAddress"`
	Host            string         `json:"host"`
	Location        string         `json:"location"`
	OS              string         `json:"os"`
	Environment     string         `json:"environment"`
	VCPU            int            `json:"vcpu"`
	MemoryGB        int            `json:"memoryGb"`
	StorageGB       int            `json:"storageGb"`
	UptimeSeconds   int64          `json:"uptimeSeconds"`
	CPUPercent      float64        `json:"cpuPercent"`
	MemoryPercent   float64        `json:"memoryPercent"`
	DiskPercent     float64        `json:"diskPercent"`
	NetworkInMbps   float64        `json:"networkInMbps"`
	NetworkOutMbps  float64        `json:"networkOutMbps"`
	Tags            []string       `json:"tags"`
	ExtraProperties map[string]any `json:"extraProperties,omitempty"`
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
