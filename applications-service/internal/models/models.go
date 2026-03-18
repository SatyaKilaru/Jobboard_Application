package models

import (
	"time"

	"github.com/google/uuid"
)

type Application struct {
	ID          uuid.UUID  `json:"id"`
	UserID      uuid.UUID  `json:"user_id"`
	JobID       *uuid.UUID `json:"job_id,omitempty"`
	CompanyName string     `json:"company_name"`
	JobTitle    string     `json:"job_title"`
	JobURL      string     `json:"job_url,omitempty"`
	Status      string     `json:"status"`
	Notes       string     `json:"notes"`
	AppliedAt   time.Time  `json:"applied_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type ApplicationStats struct {
	Wishlist  int `json:"wishlist"`
	Applied   int `json:"applied"`
	Interview int `json:"interview"`
	Offer     int `json:"offer"`
	Rejected  int `json:"rejected"`
	Withdrawn int `json:"withdrawn"`
	Total     int `json:"total"`
}
