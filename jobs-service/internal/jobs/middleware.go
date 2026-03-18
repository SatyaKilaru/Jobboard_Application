package jobs

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"jobboard/jobs-service/internal/config"
	"jobboard/jobs-service/internal/constants"
)

const UserIDKey = "userID"

type accessTokenClaims struct {
	Email string `json:"email"`
	jwt.RegisteredClaims
}

func RequireAuth(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"code": constants.ErrCodeUnauthorized, "message": "missing token"})
			return
		}
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		token, err := jwt.ParseWithClaims(tokenStr, &accessTokenClaims{}, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return []byte(cfg.JWTAccessSecret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"code": constants.ErrCodeTokenExpired, "message": "invalid token"})
			return
		}

		claims, ok := token.Claims.(*accessTokenClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"code": constants.ErrCodeUnauthorized, "message": "invalid claims"})
			return
		}

		c.Set(UserIDKey, claims.Subject)
		c.Next()
	}
}

// OptionalAuth sets userID if token present but does not abort if missing
func OptionalAuth(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			token, err := jwt.ParseWithClaims(tokenStr, &accessTokenClaims{}, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method")
				}
				return []byte(cfg.JWTAccessSecret), nil
			})
			if err == nil && token.Valid {
				if claims, ok := token.Claims.(*accessTokenClaims); ok {
					c.Set(UserIDKey, claims.Subject)
				}
			}
		}
		c.Next()
	}
}
