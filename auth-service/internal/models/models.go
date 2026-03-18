package models

import "time"

// User represents a registered user in the system.
type User struct {
	ID           string    `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	FullName     string    `json:"full_name" db:"full_name"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

// RefreshToken represents a stored refresh token record.
type RefreshToken struct {
	ID        string    `db:"id"`
	UserID    string    `db:"user_id"`
	TokenHash string    `db:"token_hash"`
	Family    string    `db:"family"`
	IsRevoked bool      `db:"is_revoked"`
	ExpiresAt time.Time `db:"expires_at"`
	CreatedAt time.Time `db:"created_at"`
}
