package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
	"jobboard/auth-service/internal/config"
	"jobboard/auth-service/internal/constants"
	"jobboard/auth-service/internal/models"
)

const refreshCookieName = "refresh_token"

// Handler holds dependencies for auth HTTP handlers.
type Handler struct {
	pool *pgxpool.Pool
	cfg  *config.Config
}

// NewHandler creates a new Handler with the given pool and config.
func NewHandler(pool *pgxpool.Pool, cfg *config.Config) *Handler {
	return &Handler{pool: pool, cfg: cfg}
}

// hashToken returns the SHA256 hex hash of a raw token string.
func hashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

// apiError writes a structured error response with a code and message.
func apiError(c *gin.Context, status int, code, message string) {
	c.JSON(status, gin.H{"code": code, "message": message})
}

// setRefreshCookie writes the refresh token as an httpOnly cookie.
func (h *Handler) setRefreshCookie(c *gin.Context, rawToken string, maxAge int) {
	secure := h.cfg.IsProduction()
	if secure {
		// Production: SameSite=None allows cross-origin cookie (Vercel → Render)
		c.SetSameSite(http.SameSiteNoneMode)
	} else {
		c.SetSameSite(http.SameSiteLaxMode)
	}
	c.SetCookie(
		refreshCookieName,
		rawToken,
		maxAge,
		"/",
		"",
		secure,
		true, // httpOnly
	)
}

// clearRefreshCookie removes the refresh token cookie by setting MaxAge to -1.
func (h *Handler) clearRefreshCookie(c *gin.Context) {
	h.setRefreshCookie(c, "", -1)
}

// Register handles POST /auth/register
func (h *Handler) Register(c *gin.Context) {
	var body struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=8"`
		FullName string `json:"full_name"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		apiError(c, http.StatusBadRequest, constants.ErrCodeValidation, "Invalid input — check your email and password")
		return
	}

	body.Email = strings.ToLower(strings.TrimSpace(body.Email))

	hashBytes, err := bcrypt.GenerateFromPassword([]byte(body.Password), 12)
	if err != nil {
		apiError(c, http.StatusInternalServerError, constants.ErrCodeInternal, "Something went wrong. Please try again")
		return
	}

	var user models.User
	err = h.pool.QueryRow(c.Request.Context(),
		`INSERT INTO users (email, password_hash, full_name)
		 VALUES ($1, $2, $3)
		 RETURNING id, email, password_hash, full_name, created_at, updated_at`,
		body.Email, string(hashBytes), body.FullName,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FullName, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			apiError(c, http.StatusConflict, constants.ErrCodeEmailTaken, "This email is already registered")
			return
		}
		apiError(c, http.StatusInternalServerError, constants.ErrCodeInternal, "Something went wrong. Please try again")
		return
	}

	family := uuid.New().String()
	accessToken, rawRefresh, err := IssueTokenPair(c.Request.Context(), h.pool, user.ID, user.Email, family, h.cfg)
	if err != nil {
		apiError(c, http.StatusInternalServerError, constants.ErrCodeInternal, "Failed to create session")
		return
	}

	h.setRefreshCookie(c, rawRefresh, 30*24*60*60)

	c.JSON(http.StatusCreated, gin.H{
		"user":         user,
		"access_token": accessToken,
	})
}

// Login handles POST /auth/login
func (h *Handler) Login(c *gin.Context) {
	var body struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		apiError(c, http.StatusBadRequest, constants.ErrCodeValidation, "Email and password are required")
		return
	}

	body.Email = strings.ToLower(strings.TrimSpace(body.Email))

	var user models.User
	err := h.pool.QueryRow(c.Request.Context(),
		`SELECT id, email, password_hash, full_name, created_at, updated_at FROM users WHERE email = $1`,
		body.Email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FullName, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		apiError(c, http.StatusUnauthorized, constants.ErrCodeInvalidCredentials, "Incorrect email or password")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.Password)); err != nil {
		apiError(c, http.StatusUnauthorized, constants.ErrCodeInvalidCredentials, "Incorrect email or password")
		return
	}

	family := uuid.New().String()
	accessToken, rawRefresh, err := IssueTokenPair(c.Request.Context(), h.pool, user.ID, user.Email, family, h.cfg)
	if err != nil {
		apiError(c, http.StatusInternalServerError, constants.ErrCodeInternal, "Failed to create session")
		return
	}

	h.setRefreshCookie(c, rawRefresh, 30*24*60*60)

	c.JSON(http.StatusOK, gin.H{
		"user":         user,
		"access_token": accessToken,
	})
}

// Refresh handles POST /auth/refresh
func (h *Handler) Refresh(c *gin.Context) {
	rawToken, err := c.Cookie(refreshCookieName)
	if err != nil || rawToken == "" {
		apiError(c, http.StatusUnauthorized, constants.ErrCodeTokenExpired, "Session expired — please sign in again")
		return
	}

	newAccess, newRaw, _, err := RotateRefreshToken(c.Request.Context(), h.pool, rawToken, h.cfg)
	if err != nil {
		h.clearRefreshCookie(c)
		apiError(c, http.StatusUnauthorized, constants.ErrCodeTokenExpired, "Session expired — please sign in again")
		return
	}

	h.setRefreshCookie(c, newRaw, 30*24*60*60)

	c.JSON(http.StatusOK, gin.H{
		"access_token": newAccess,
	})
}

// Logout handles POST /auth/logout
func (h *Handler) Logout(c *gin.Context) {
	rawToken, err := c.Cookie(refreshCookieName)
	if err == nil && rawToken != "" {
		tokenHash := hashToken(rawToken)
		_, _ = h.pool.Exec(c.Request.Context(),
			`UPDATE refresh_tokens SET is_revoked = TRUE WHERE token_hash = $1 AND expires_at > $2`,
			tokenHash, time.Now(),
		)
	}

	h.clearRefreshCookie(c)
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}

// Me handles GET /auth/me — returns the authenticated user's profile.
func (h *Handler) Me(c *gin.Context) {
	userID, exists := c.Get(UserIDKey)
	if !exists {
		apiError(c, http.StatusUnauthorized, constants.ErrCodeUnauthorized, "Authentication required")
		return
	}

	var user models.User
	err := h.pool.QueryRow(c.Request.Context(),
		`SELECT id, email, password_hash, full_name, created_at, updated_at FROM users WHERE id = $1`,
		userID,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FullName, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		apiError(c, http.StatusNotFound, constants.ErrCodeNotFound, "User not found")
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}
