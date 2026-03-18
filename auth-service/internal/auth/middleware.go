package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"jobboard/auth-service/internal/config"
	"jobboard/auth-service/internal/constants"
)

const UserIDKey = "userID"

// RequireAuth is a Gin middleware that validates the Bearer JWT in the Authorization header.
// On success it sets the userID in the context under the key UserIDKey.
func RequireAuth(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			apiError(c, http.StatusUnauthorized, constants.ErrCodeUnauthorized, "missing authorization header")
		c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			apiError(c, http.StatusUnauthorized, constants.ErrCodeUnauthorized, "invalid authorization header format")
		c.Abort()
			return
		}

		claims, err := ValidateAccessToken(parts[1], cfg)
		if err != nil {
			apiError(c, http.StatusUnauthorized, constants.ErrCodeTokenExpired, "invalid or expired token")
		c.Abort()
			return
		}

		c.Set(UserIDKey, claims.Subject)
		c.Next()
	}
}
