package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"jobboard/applications-service/internal/models"
)

type ApplicationRepo struct {
	pool *pgxpool.Pool
}

func NewApplicationRepo(pool *pgxpool.Pool) *ApplicationRepo {
	return &ApplicationRepo{pool: pool}
}

const applicationColumns = `id, user_id, job_id, company_name, job_title, job_url, status, notes, applied_at, updated_at`

func scanApplication(scanner interface{ Scan(dest ...any) error }, a *models.Application) error {
	return scanner.Scan(
		&a.ID, &a.UserID, &a.JobID, &a.CompanyName, &a.JobTitle,
		&a.JobURL, &a.Status, &a.Notes, &a.AppliedAt, &a.UpdatedAt,
	)
}

// ListByUser returns all applications for a user, optionally filtered by status.
func (r *ApplicationRepo) ListByUser(ctx context.Context, userID, status string) ([]models.Application, error) {
	query := `SELECT ` + applicationColumns + ` FROM applications WHERE user_id = $1`
	args := []interface{}{userID}

	if status != "" {
		query += ` AND status = $2`
		args = append(args, status)
	}
	query += ` ORDER BY updated_at DESC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list applications: %w", err)
	}
	defer rows.Close()

	apps := make([]models.Application, 0)
	for rows.Next() {
		var a models.Application
		if err := scanApplication(rows, &a); err != nil {
			continue
		}
		apps = append(apps, a)
	}
	return apps, nil
}

// GetByID returns a single application, ensuring ownership.
func (r *ApplicationRepo) GetByID(ctx context.Context, appID, userID string) (models.Application, error) {
	query := `SELECT ` + applicationColumns + ` FROM applications WHERE id = $1 AND user_id = $2`
	var a models.Application
	if err := scanApplication(r.pool.QueryRow(ctx, query, appID, userID), &a); err != nil {
		return models.Application{}, fmt.Errorf("get application: %w", err)
	}
	return a, nil
}

// Create inserts a new application and returns it with the generated ID.
func (r *ApplicationRepo) Create(ctx context.Context, app models.Application) (models.Application, error) {
	query := `INSERT INTO applications (user_id, job_id, company_name, job_title, job_url, status, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING ` + applicationColumns

	var a models.Application
	err := scanApplication(r.pool.QueryRow(ctx, query,
		app.UserID, app.JobID, app.CompanyName, app.JobTitle, app.JobURL, app.Status, app.Notes,
	), &a)
	if err != nil {
		return models.Application{}, fmt.Errorf("create application: %w", err)
	}
	return a, nil
}

// UpdateStatus changes the Kanban column of an application.
func (r *ApplicationRepo) UpdateStatus(ctx context.Context, appID, userID, status string) error {
	query := `UPDATE applications SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`
	tag, err := r.pool.Exec(ctx, query, status, appID, userID)
	if err != nil {
		return fmt.Errorf("update status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("application not found")
	}
	return nil
}

// UpdateNotes updates the notes of an application.
func (r *ApplicationRepo) UpdateNotes(ctx context.Context, appID, userID, notes string) error {
	query := `UPDATE applications SET notes = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`
	tag, err := r.pool.Exec(ctx, query, notes, appID, userID)
	if err != nil {
		return fmt.Errorf("update notes: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("application not found")
	}
	return nil
}

// Delete removes an application.
func (r *ApplicationRepo) Delete(ctx context.Context, appID, userID string) error {
	query := `DELETE FROM applications WHERE id = $1 AND user_id = $2`
	tag, err := r.pool.Exec(ctx, query, appID, userID)
	if err != nil {
		return fmt.Errorf("delete application: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("application not found")
	}
	return nil
}

// GetStats returns application counts per status for a user.
func (r *ApplicationRepo) GetStats(ctx context.Context, userID string) (models.ApplicationStats, error) {
	query := `SELECT
		COUNT(*) FILTER (WHERE status = 'wishlist') AS wishlist,
		COUNT(*) FILTER (WHERE status = 'applied') AS applied,
		COUNT(*) FILTER (WHERE status = 'interview') AS interview,
		COUNT(*) FILTER (WHERE status = 'offer') AS offer,
		COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
		COUNT(*) FILTER (WHERE status = 'withdrawn') AS withdrawn,
		COUNT(*) AS total
		FROM applications WHERE user_id = $1`

	var s models.ApplicationStats
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&s.Wishlist, &s.Applied, &s.Interview, &s.Offer, &s.Rejected, &s.Withdrawn, &s.Total,
	)
	if err != nil {
		return models.ApplicationStats{}, fmt.Errorf("get stats: %w", err)
	}
	return s, nil
}
