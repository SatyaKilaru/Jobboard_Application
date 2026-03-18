package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"jobboard/auth-service/internal/config"
)

// accessTokenClaims holds the custom claims embedded in the access JWT.
type accessTokenClaims struct {
	Email string `json:"email"`
	jwt.RegisteredClaims
}

// GenerateAccessToken creates a signed HS256 JWT access token valid for 15 minutes.
func GenerateAccessToken(userID, email string, cfg *config.Config) (string, error) {
	claims := accessTokenClaims{
		Email: email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTAccessSecret))
}

// ValidateAccessToken parses and validates a JWT access token, returning its registered claims.
func ValidateAccessToken(tokenStr string, cfg *config.Config) (*jwt.RegisteredClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &accessTokenClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(cfg.JWTAccessSecret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*accessTokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	return &claims.RegisteredClaims, nil
}

// GenerateRefreshToken creates a cryptographically secure random refresh token.
// Returns the raw hex token (to be stored in cookie) and its SHA256 hash (to be stored in DB).
func GenerateRefreshToken() (raw, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", fmt.Errorf("generate random bytes: %w", err)
	}
	raw = hex.EncodeToString(b)
	sum := sha256.Sum256([]byte(raw))
	hash = hex.EncodeToString(sum[:])
	return raw, hash, nil
}

// IssueTokenPair generates a new access + refresh token pair and stores the refresh token in DB.
// Pass an empty family string to generate a new family UUID automatically.
func IssueTokenPair(ctx context.Context, pool *pgxpool.Pool, userID, email, family string, cfg *config.Config) (accessToken string, rawRefresh string, err error) {
	if family == "" {
		family = uuid.New().String()
	}

	accessToken, err = GenerateAccessToken(userID, email, cfg)
	if err != nil {
		return "", "", fmt.Errorf("generate access token: %w", err)
	}

	rawRefresh, tokenHash, err := GenerateRefreshToken()
	if err != nil {
		return "", "", fmt.Errorf("generate refresh token: %w", err)
	}

	expiresAt := time.Now().Add(30 * 24 * time.Hour)
	_, err = pool.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, family, expires_at) VALUES ($1, $2, $3, $4)`,
		userID, tokenHash, family, expiresAt,
	)
	if err != nil {
		return "", "", fmt.Errorf("store refresh token: %w", err)
	}

	return accessToken, rawRefresh, nil
}

// RotateRefreshToken validates a refresh token, revokes it (or the entire family on reuse),
// and issues a new token pair. The entire operation runs inside a DB transaction.
func RotateRefreshToken(ctx context.Context, pool *pgxpool.Pool, rawToken string, cfg *config.Config) (newAccess, newRaw, returnedUserID string, retErr error) {
	sum := sha256.Sum256([]byte(rawToken))
	tokenHash := hex.EncodeToString(sum[:])

	tx, err := pool.Begin(ctx)
	if err != nil {
		return "", "", "", fmt.Errorf("begin transaction: %w", err)
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()

	var tokenID, family, tokenUserID string
	var isRevoked bool
	var expiresAt time.Time

	err = tx.QueryRow(ctx,
		`SELECT id, user_id, family, is_revoked, expires_at FROM refresh_tokens WHERE token_hash = $1`,
		tokenHash,
	).Scan(&tokenID, &tokenUserID, &family, &isRevoked, &expiresAt)
	if err != nil {
		retErr = fmt.Errorf("token not found: %w", err)
		return
	}

	// Reuse detected: revoke entire family and abort
	if isRevoked {
		_, retErr = tx.Exec(ctx,
			`UPDATE refresh_tokens SET is_revoked = TRUE WHERE family = $1`,
			family,
		)
		if retErr != nil {
			retErr = fmt.Errorf("revoke family: %w", retErr)
			return
		}
		if retErr = tx.Commit(ctx); retErr != nil {
			retErr = fmt.Errorf("commit family revocation: %w", retErr)
			return
		}
		committed = true
		retErr = fmt.Errorf("refresh token reuse detected; family revoked")
		return
	}

	// Check expiration
	if time.Now().After(expiresAt) {
		retErr = fmt.Errorf("refresh token expired")
		return
	}

	// Revoke the current token
	_, retErr = tx.Exec(ctx,
		`UPDATE refresh_tokens SET is_revoked = TRUE WHERE id = $1`,
		tokenID,
	)
	if retErr != nil {
		retErr = fmt.Errorf("revoke current token: %w", retErr)
		return
	}

	// Look up the user email for the new access token
	var email string
	retErr = tx.QueryRow(ctx, `SELECT email FROM users WHERE id = $1`, tokenUserID).Scan(&email)
	if retErr != nil {
		retErr = fmt.Errorf("fetch user email: %w", retErr)
		return
	}

	// Generate new access token
	newAccess, retErr = GenerateAccessToken(tokenUserID, email, cfg)
	if retErr != nil {
		retErr = fmt.Errorf("generate access token: %w", retErr)
		return
	}

	// Generate new refresh token
	var newHash string
	newRaw, newHash, retErr = GenerateRefreshToken()
	if retErr != nil {
		retErr = fmt.Errorf("generate refresh token: %w", retErr)
		return
	}

	newExpiry := time.Now().Add(30 * 24 * time.Hour)
	_, retErr = tx.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, family, expires_at) VALUES ($1, $2, $3, $4)`,
		tokenUserID, newHash, family, newExpiry,
	)
	if retErr != nil {
		retErr = fmt.Errorf("insert new refresh token: %w", retErr)
		return
	}

	if retErr = tx.Commit(ctx); retErr != nil {
		retErr = fmt.Errorf("commit rotation: %w", retErr)
		return
	}
	committed = true

	returnedUserID = tokenUserID
	return newAccess, newRaw, returnedUserID, nil
}
