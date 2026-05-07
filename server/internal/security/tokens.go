package security

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

type SessionClaims struct {
	Subject   string   `json:"sub"`
	Username  string   `json:"username"`
	AuthType  string   `json:"authType"`
	Groups    []string `json:"groups,omitempty"`
	ExpiresAt int64    `json:"exp"`
}

func SignSession(claims SessionClaims, secret string) (string, error) {
	header := encodeJSON(map[string]string{"alg": "HS256", "typ": "JWT"})
	body, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	payload := base64.RawURLEncoding.EncodeToString(body)
	unsigned := header + "." + payload
	signature := sign(unsigned, secret)
	return unsigned + "." + signature, nil
}

func VerifySession(token string, secret string) (SessionClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return SessionClaims{}, errors.New("invalid token")
	}
	unsigned := parts[0] + "." + parts[1]
	if !hmac.Equal([]byte(parts[2]), []byte(sign(unsigned, secret))) {
		return SessionClaims{}, errors.New("invalid signature")
	}
	body, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return SessionClaims{}, err
	}
	var claims SessionClaims
	if err := json.Unmarshal(body, &claims); err != nil {
		return SessionClaims{}, err
	}
	if time.Now().Unix() > claims.ExpiresAt {
		return SessionClaims{}, errors.New("token expired")
	}
	return claims, nil
}

func NewAgentKey() (plain string, prefix string, hash string, err error) {
	random := make([]byte, 32)
	if _, err := rand.Read(random); err != nil {
		return "", "", "", err
	}
	plain = "vma_" + base64.RawURLEncoding.EncodeToString(random)
	prefix = plain[:12]
	hash = HashAgentKey(plain)
	return plain, prefix, hash, nil
}

func HashAgentKey(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func encodeJSON(value any) string {
	body, _ := json.Marshal(value)
	return base64.RawURLEncoding.EncodeToString(body)
}

func sign(value string, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(value))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
