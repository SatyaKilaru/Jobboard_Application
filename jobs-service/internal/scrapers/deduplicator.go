package scrapers

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"jobboard/jobs-service/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

// UpsertJob inserts a job or updates it on fingerprint conflict.
// It also upserts the company by name and links company_id.
func UpsertJob(ctx context.Context, pool *pgxpool.Pool, j models.NormalizedJob) error {
	fp := Fingerprint(j.Title, j.CompanyName, j.Source)

	// Upsert company
	var companyID *string
	if j.CompanyName != "" {
		slug := toSlug(j.CompanyName)
		var cid string
		err := pool.QueryRow(ctx,
			`INSERT INTO companies (name, slug)
             VALUES ($1, $2)
             ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
			j.CompanyName, slug,
		).Scan(&cid)
		if err != nil {
			slog.Error("upsert company failed", "company", j.CompanyName, "err", err)
		} else {
			companyID = &cid
		}
	}

	tags := NormalizeTags(j.Tags)
	if len(tags) == 0 {
		tags = NormalizeTags(ExtractTagsFromText(j.Description))
	}

	_, err := pool.Exec(ctx,
		`INSERT INTO jobs (
            external_id, source, source_url, title,
            company_id, company_name, description, location,
            is_remote, job_type, salary_min, salary_max,
            tags, fingerprint, posted_at
        ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10, $11, $12,
            $13, $14, $15
        )
        ON CONFLICT (fingerprint) DO UPDATE SET
            is_active   = TRUE,
            updated_at  = NOW(),
            description = EXCLUDED.description,
            source_url  = EXCLUDED.source_url`,
		j.ExternalID, j.Source, j.SourceURL, Truncate(j.Title, 255),
		companyID, j.CompanyName, j.Description, j.Location,
		j.IsRemote, j.JobType, j.SalaryMin, j.SalaryMax,
		tags, fp, j.PostedAt,
	)
	if err != nil {
		return fmt.Errorf("upsert job %q: %w", j.Title, err)
	}
	return nil
}

// toSlug converts a company name to a URL-safe slug
func toSlug(name string) string {
	var b strings.Builder
	prev := '-'
	for _, r := range strings.ToLower(strings.TrimSpace(name)) {
		if r >= 'a' && r <= 'z' || r >= '0' && r <= '9' {
			b.WriteRune(r)
			prev = r
		} else if prev != '-' {
			b.WriteRune('-')
			prev = '-'
		}
	}
	return strings.Trim(b.String(), "-")
}
