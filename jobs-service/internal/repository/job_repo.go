package repository

import (
	"context"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"jobboard/jobs-service/internal/models"
)

type SalaryInsight struct {
	JobType   string  `json:"job_type"`
	AvgMin    float64 `json:"avg_min"`
	AvgMax    float64 `json:"avg_max"`
	MedianMin float64 `json:"median_min"`
	MedianMax float64 `json:"median_max"`
	Count     int     `json:"count"`
}

type SalaryBySource struct {
	Source string  `json:"source"`
	AvgMin float64 `json:"avg_min"`
	AvgMax float64 `json:"avg_max"`
	Count  int     `json:"count"`
}

type TopPayingJob struct {
	ID          uuid.UUID `json:"id"`
	Title       string    `json:"title"`
	CompanyName string    `json:"company_name"`
	SalaryMin   *int64    `json:"salary_min"`
	SalaryMax   *int64    `json:"salary_max"`
	Source      string    `json:"source"`
	Location    string    `json:"location"`
}

type CompanyProfile struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Slug         string    `json:"slug"`
	JobCount     int       `json:"job_count"`
	AvgSalaryMin *float64  `json:"avg_salary_min,omitempty"`
	AvgSalaryMax *float64  `json:"avg_salary_max,omitempty"`
	TopTags      []string  `json:"top_tags"`
}

type JobRepo struct {
	pool *pgxpool.Pool
}

func NewJobRepo(pool *pgxpool.Pool) *JobRepo {
	return &JobRepo{pool: pool}
}

// Pool returns the underlying connection pool (needed by scrapers).
func (r *JobRepo) Pool() *pgxpool.Pool {
	return r.pool
}

type JobFilter struct {
	Q         string
	Location  string
	JobType   string
	Remote    bool
	SalaryMin *int64
	Page      int
	Limit     int
}

type JobListResult struct {
	Jobs  []models.Job `json:"jobs"`
	Total int          `json:"total"`
	Page  int          `json:"page"`
	Limit int          `json:"limit"`
}

// jobColumns is the standard column list for scanning a Job row.
const jobColumns = `j.id, j.external_id, j.source, j.source_url, j.title,
	j.company_name, j.description, j.location, j.is_remote, j.job_type,
	j.salary_min, j.salary_max, j.tags, j.is_active, j.posted_at, j.created_at, j.updated_at`

func scanJob(scanner interface{ Scan(dest ...any) error }, j *models.Job) error {
	return scanner.Scan(
		&j.ID, &j.ExternalID, &j.Source, &j.SourceURL, &j.Title,
		&j.CompanyName, &j.Description, &j.Location, &j.IsRemote, &j.JobType,
		&j.SalaryMin, &j.SalaryMax, &j.Tags, &j.IsActive, &j.PostedAt, &j.CreatedAt, &j.UpdatedAt,
		&j.IsSaved,
	)
}

func defaultTags(j *models.Job) {
	if j.Tags == nil {
		j.Tags = []string{}
	}
}

// buildWhereClause constructs a parameterized WHERE clause from a JobFilter.
// Returns the clause string, args slice, and the next available arg index.
func buildWhereClause(f JobFilter) (string, []interface{}, int) {
	conditions := []string{"j.is_active = TRUE"}
	args := []interface{}{}
	idx := 1

	if f.Q != "" {
		conditions = append(conditions,
			"(to_tsvector('english', j.title || ' ' || j.description) @@ plainto_tsquery('english', $"+strconv.Itoa(idx)+") OR j.title ILIKE '%' || $"+strconv.Itoa(idx)+" || '%')")
		args = append(args, f.Q)
		idx++
	}
	if f.Remote {
		conditions = append(conditions, "j.is_remote = TRUE")
	}
	if f.Location != "" {
		conditions = append(conditions, "j.location ILIKE '%' || $"+strconv.Itoa(idx)+" || '%'")
		args = append(args, f.Location)
		idx++
	}
	if f.JobType != "" {
		conditions = append(conditions, "j.job_type = $"+strconv.Itoa(idx))
		args = append(args, f.JobType)
		idx++
	}
	if f.SalaryMin != nil {
		conditions = append(conditions, "(j.salary_min IS NOT NULL AND j.salary_min >= $"+strconv.Itoa(idx)+")")
		args = append(args, *f.SalaryMin)
		idx++
	}

	return strings.Join(conditions, " AND "), args, idx
}

// ListJobs returns a paginated list of jobs matching the given filter.
// If userID is non-empty, the is_saved field is populated.
func (r *JobRepo) ListJobs(ctx context.Context, f JobFilter, userID string) (JobListResult, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.Limit < 1 || f.Limit > 100 {
		f.Limit = 20
	}
	offset := (f.Page - 1) * f.Limit

	where, args, idx := buildWhereClause(f)

	// Count
	var total int
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM jobs j WHERE "+where, args...).Scan(&total); err != nil {
		return JobListResult{}, err
	}

	// Saved join (parameterized)
	savedJoin := ""
	savedSelect := "FALSE as is_saved"
	if userID != "" {
		savedJoin = "LEFT JOIN saved_jobs sj ON sj.job_id = j.id AND sj.user_id = $" + strconv.Itoa(idx)
		args = append(args, userID)
		idx++
		savedSelect = "sj.job_id IS NOT NULL as is_saved"
	}

	// Parameterized LIMIT and OFFSET
	limitP := "$" + strconv.Itoa(idx)
	args = append(args, f.Limit)
	idx++
	offsetP := "$" + strconv.Itoa(idx)
	args = append(args, offset)

	dataSQL := `SELECT ` + jobColumns + `, ` + savedSelect + `
		FROM jobs j ` + savedJoin + `
		WHERE ` + where + `
		ORDER BY j.posted_at DESC
		LIMIT ` + limitP + ` OFFSET ` + offsetP

	rows, err := r.pool.Query(ctx, dataSQL, args...)
	if err != nil {
		return JobListResult{}, err
	}
	defer rows.Close()

	jobs := make([]models.Job, 0)
	for rows.Next() {
		var j models.Job
		if err := scanJob(rows, &j); err != nil {
			continue
		}
		defaultTags(&j)
		jobs = append(jobs, j)
	}

	return JobListResult{Jobs: jobs, Total: total, Page: f.Page, Limit: f.Limit}, nil
}

// GetJob returns a single job by ID. If userID is non-empty, is_saved is populated.
func (r *JobRepo) GetJob(ctx context.Context, jobID, userID string) (models.Job, error) {
	savedJoin := ""
	savedSelect := "FALSE as is_saved"
	queryArgs := []interface{}{jobID}

	if userID != "" {
		savedJoin = "LEFT JOIN saved_jobs sj ON sj.job_id = j.id AND sj.user_id = $2"
		queryArgs = append(queryArgs, userID)
		savedSelect = "sj.job_id IS NOT NULL as is_saved"
	}

	sql := `SELECT ` + jobColumns + `, ` + savedSelect + `
		FROM jobs j ` + savedJoin + `
		WHERE j.id = $1 AND j.is_active = TRUE`

	var j models.Job
	if err := scanJob(r.pool.QueryRow(ctx, sql, queryArgs...), &j); err != nil {
		return models.Job{}, err
	}
	defaultTags(&j)
	return j, nil
}

// SaveJob saves a job for a user. No-op if already saved.
func (r *JobRepo) SaveJob(ctx context.Context, userID, jobID string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO saved_jobs (user_id, job_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		userID, jobID,
	)
	return err
}

// UnsaveJob removes a saved job for a user.
func (r *JobRepo) UnsaveJob(ctx context.Context, userID, jobID string) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM saved_jobs WHERE user_id = $1 AND job_id = $2`,
		userID, jobID,
	)
	return err
}

// ListSavedJobs returns saved jobs for a user with pagination.
func (r *JobRepo) ListSavedJobs(ctx context.Context, userID string, page, limit int) ([]models.Job, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	rows, err := r.pool.Query(ctx,
		`SELECT `+jobColumns+`, TRUE as is_saved
		 FROM saved_jobs sj
		 JOIN jobs j ON j.id = sj.job_id
		 WHERE sj.user_id = $1 AND j.is_active = TRUE
		 ORDER BY sj.created_at DESC
		 LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	jobs := make([]models.Job, 0)
	for rows.Next() {
		var j models.Job
		if err := scanJob(rows, &j); err != nil {
			continue
		}
		defaultTags(&j)
		jobs = append(jobs, j)
	}
	return jobs, nil
}

// GetSalaryInsights returns aggregate salary statistics grouped by job_type.
func (r *JobRepo) GetSalaryInsights(ctx context.Context) ([]SalaryInsight, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT job_type,
			AVG(salary_min) as avg_min, AVG(salary_max) as avg_max,
			PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_min) as median_min,
			PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_max) as median_max,
			COUNT(*) as count
		FROM jobs
		WHERE is_active = TRUE AND salary_min IS NOT NULL
		GROUP BY job_type
		ORDER BY count DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SalaryInsight
	for rows.Next() {
		var si SalaryInsight
		if err := rows.Scan(&si.JobType, &si.AvgMin, &si.AvgMax, &si.MedianMin, &si.MedianMax, &si.Count); err != nil {
			return nil, err
		}
		results = append(results, si)
	}
	return results, nil
}

// GetSalaryBySource returns aggregate salary statistics grouped by source.
func (r *JobRepo) GetSalaryBySource(ctx context.Context) ([]SalaryBySource, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT source, AVG(salary_min) as avg_min, AVG(salary_max) as avg_max, COUNT(*) as count
		FROM jobs WHERE is_active = TRUE AND salary_min IS NOT NULL
		GROUP BY source ORDER BY avg_max DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SalaryBySource
	for rows.Next() {
		var s SalaryBySource
		if err := rows.Scan(&s.Source, &s.AvgMin, &s.AvgMax, &s.Count); err != nil {
			return nil, err
		}
		results = append(results, s)
	}
	return results, nil
}

// GetTopPayingJobs returns the top N jobs ordered by salary_max descending.
func (r *JobRepo) GetTopPayingJobs(ctx context.Context, limit int) ([]TopPayingJob, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, title, company_name, salary_min, salary_max, source, location
		FROM jobs WHERE is_active = TRUE AND salary_max IS NOT NULL
		ORDER BY salary_max DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []TopPayingJob
	for rows.Next() {
		var j TopPayingJob
		if err := rows.Scan(&j.ID, &j.Title, &j.CompanyName, &j.SalaryMin, &j.SalaryMax, &j.Source, &j.Location); err != nil {
			return nil, err
		}
		results = append(results, j)
	}
	return results, nil
}

// ListCompanies returns a paginated list of companies with job counts and avg salaries.
func (r *JobRepo) ListCompanies(ctx context.Context, page, limit int) ([]CompanyProfile, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Count total companies with jobs
	var total int
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM (
			SELECT c.id FROM companies c
			LEFT JOIN jobs j ON j.company_name = c.name AND j.is_active = TRUE
			GROUP BY c.id HAVING COUNT(j.id) > 0
		) sub`).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.pool.Query(ctx, `
		SELECT c.id, c.name, c.slug,
			COUNT(j.id) as job_count,
			AVG(j.salary_min) as avg_salary_min,
			AVG(j.salary_max) as avg_salary_max
		FROM companies c
		LEFT JOIN jobs j ON j.company_name = c.name AND j.is_active = TRUE
		GROUP BY c.id, c.name, c.slug
		HAVING COUNT(j.id) > 0
		ORDER BY job_count DESC
		LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var companies []CompanyProfile
	for rows.Next() {
		var cp CompanyProfile
		if err := rows.Scan(&cp.ID, &cp.Name, &cp.Slug, &cp.JobCount, &cp.AvgSalaryMin, &cp.AvgSalaryMax); err != nil {
			return nil, 0, err
		}
		cp.TopTags = []string{}
		companies = append(companies, cp)
	}
	return companies, total, nil
}

// GetCompanyProfile returns a single company profile by slug.
func (r *JobRepo) GetCompanyProfile(ctx context.Context, slug string) (CompanyProfile, error) {
	var cp CompanyProfile
	err := r.pool.QueryRow(ctx, `
		SELECT c.id, c.name, c.slug,
			COUNT(j.id) as job_count,
			AVG(j.salary_min) as avg_salary_min,
			AVG(j.salary_max) as avg_salary_max
		FROM companies c
		LEFT JOIN jobs j ON j.company_name = c.name AND j.is_active = TRUE
		WHERE c.slug = $1
		GROUP BY c.id, c.name, c.slug`, slug).Scan(&cp.ID, &cp.Name, &cp.Slug, &cp.JobCount, &cp.AvgSalaryMin, &cp.AvgSalaryMax)
	if err != nil {
		return CompanyProfile{}, err
	}
	cp.TopTags = []string{}
	return cp, nil
}

// GetCompanyJobs returns jobs for a given company name with pagination.
func (r *JobRepo) GetCompanyJobs(ctx context.Context, companyName string, page, limit int) ([]models.Job, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var total int
	if err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM jobs j WHERE j.company_name = $1 AND j.is_active = TRUE`,
		companyName).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.pool.Query(ctx,
		`SELECT `+jobColumns+`, FALSE as is_saved
		 FROM jobs j
		 WHERE j.company_name = $1 AND j.is_active = TRUE
		 ORDER BY j.posted_at DESC
		 LIMIT $2 OFFSET $3`, companyName, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	jobs := make([]models.Job, 0)
	for rows.Next() {
		var j models.Job
		if err := scanJob(rows, &j); err != nil {
			continue
		}
		defaultTags(&j)
		jobs = append(jobs, j)
	}
	return jobs, total, nil
}
