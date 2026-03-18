package models

import (
	"time"

	"github.com/google/uuid"
)

type Company struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Slug         string    `json:"slug"`
	CultureScore *float64  `json:"culture_score,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type Job struct {
	ID          uuid.UUID  `json:"id"`
	ExternalID  string     `json:"external_id,omitempty"`
	Source      string     `json:"source"`
	SourceURL   string     `json:"source_url"`
	Title       string     `json:"title"`
	CompanyID   *uuid.UUID `json:"company_id,omitempty"`
	CompanyName string     `json:"company_name"`
	Description string     `json:"description"`
	Location    string     `json:"location"`
	IsRemote    bool       `json:"is_remote"`
	JobType     string     `json:"job_type"`
	SalaryMin   *int64     `json:"salary_min,omitempty"`
	SalaryMax   *int64     `json:"salary_max,omitempty"`
	Tags        []string   `json:"tags"`
	Fingerprint string     `json:"-"`
	IsActive    bool       `json:"is_active"`
	PostedAt    time.Time  `json:"posted_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	IsSaved     bool       `json:"is_saved,omitempty"`
}

// NormalizedJob is the intermediate struct all scrapers produce before DB insert
type NormalizedJob struct {
	ExternalID  string
	Source      string
	SourceURL   string
	Title       string
	CompanyName string
	Description string
	Location    string
	IsRemote    bool
	JobType     string
	SalaryMin   *int64
	SalaryMax   *int64
	Tags        []string
	PostedAt    time.Time
}
