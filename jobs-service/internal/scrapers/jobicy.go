package scrapers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"jobboard/jobs-service/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type jobicyResponse struct {
	Jobs []jobicyJob `json:"jobs"`
}

type jobicyJob struct {
	ID             int      `json:"id"`
	URL            string   `json:"url"`
	JobTitle       string   `json:"jobTitle"`
	CompanyName    string   `json:"companyName"`
	JobExcerpt     string   `json:"jobExcerpt"`
	JobDescription string   `json:"jobDescription"`
	JobGeo         string   `json:"jobGeo"`
	JobLevel       string   `json:"jobLevel"`
	JobType        []string `json:"jobType"`
	JobIndustry    []string `json:"jobIndustry"`
	PubDate        string   `json:"pubDate"`
	SalaryMin      float64  `json:"salaryMin"`
	SalaryMax      float64  `json:"salaryMax"`
	SalaryCurrency string   `json:"salaryCurrency"`
}

// ScrapeJobicy fetches remote jobs from Jobicy API (free, no auth).
func ScrapeJobicy(ctx context.Context, pool *pgxpool.Pool, query string) error {
	client := &http.Client{Timeout: 30 * time.Second}

	apiURL := "https://jobicy.com/api/v2/remote-jobs?count=50"
	if query != "" {
		apiURL += "&tag=" + url.QueryEscape(query)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; JobBoard/1.0)")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("fetch jobicy: %w", err)
	}
	defer resp.Body.Close()

	var result jobicyResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("decode jobicy: %w", err)
	}

	total := 0
	for _, j := range result.Jobs {
		if j.JobTitle == "" || j.URL == "" {
			continue
		}

		postedAt, _ := time.Parse(time.RFC3339, j.PubDate)
		if postedAt.IsZero() {
			postedAt, _ = time.Parse("2006-01-02T15:04:05-07:00", j.PubDate)
		}

		jobType := "full-time"
		for _, jt := range j.JobType {
			jobType = NormalizeJobType(jt)
			break
		}

		tags := make([]string, 0)
		for _, ind := range j.JobIndustry {
			tags = append(tags, strings.ToLower(stripHTML(ind)))
		}
		tags = append(tags, ExtractTagsFromText(j.JobTitle+" "+j.JobExcerpt)...)

		salaryMin := j.SalaryMin
		salaryMax := j.SalaryMax
		if j.SalaryCurrency != "" && j.SalaryCurrency != "USD" {
			salaryMin = 0
			salaryMax = 0
		}

		nj := models.NormalizedJob{
			ExternalID:  fmt.Sprintf("jobicy-%d", j.ID),
			Source:      "jobicy",
			SourceURL:   j.URL,
			Title:       j.JobTitle,
			CompanyName: j.CompanyName,
			Description: Truncate(stripHTML(j.JobDescription), 5000),
			Location:    j.JobGeo,
			IsRemote:    true,
			JobType:     jobType,
			SalaryMin:   NormalizeSalary(salaryMin, "year"),
			SalaryMax:   NormalizeSalary(salaryMax, "year"),
			Tags:        NormalizeTags(tags),
			PostedAt:    SafeTime(postedAt, time.Now()),
		}
		if err := UpsertJob(ctx, pool, nj); err != nil {
			slog.Error("jobicy upsert failed", "err", err)
			continue
		}
		total++
	}

	slog.Info("jobicy: upserted jobs", "count", total, "query", query)
	return nil
}
