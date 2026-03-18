package scrapers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"time"

	"jobboard/jobs-service/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type adzunaResponse struct {
	Results []adzunaJob `json:"results"`
	Count   int         `json:"count"`
}

type adzunaJob struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	RedirectURL string `json:"redirect_url"`
	Description string `json:"description"`
	Company     struct {
		DisplayName string `json:"display_name"`
	} `json:"company"`
	Location struct {
		DisplayName string `json:"display_name"`
	} `json:"location"`
	ContractType string  `json:"contract_type"`
	SalaryMin    float64 `json:"salary_min"`
	SalaryMax    float64 `json:"salary_max"`
	Created      string  `json:"created"`
}

// ScrapeAdzuna fetches jobs from Adzuna API (requires app_id + app_key).
// If credentials are empty it skips silently.
func ScrapeAdzuna(ctx context.Context, pool *pgxpool.Pool, appID, appKey, query string) error {
	if appID == "" || appKey == "" {
		slog.Info("adzuna: no credentials, skipping")
		return nil
	}

	what := "software"
	if query != "" {
		what = query
	}

	client := &http.Client{Timeout: 30 * time.Second}
	total := 0

	for page := 1; page <= 5; page++ {
		apiURL := fmt.Sprintf(
			"https://api.adzuna.com/v1/api/jobs/us/search/%d?app_id=%s&app_key=%s&results_per_page=50&what=%s&category=it-jobs&content-type=application/json",
			page, appID, appKey, url.QueryEscape(what),
		)
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
		if err != nil {
			return fmt.Errorf("build request: %w", err)
		}

		resp, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("fetch adzuna page %d: %w", page, err)
		}

		var result adzunaResponse
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			resp.Body.Close()
			return fmt.Errorf("decode adzuna page %d: %w", page, err)
		}
		resp.Body.Close()

		if len(result.Results) == 0 {
			break
		}

		for _, j := range result.Results {
			postedAt, _ := time.Parse(time.RFC3339, j.Created)
			nj := models.NormalizedJob{
				ExternalID:  "adzuna-" + j.ID,
				Source:      "adzuna",
				SourceURL:   j.RedirectURL,
				Title:       j.Title,
				CompanyName: j.Company.DisplayName,
				Description: Truncate(j.Description, 5000),
				Location:    j.Location.DisplayName,
				IsRemote:    DetectRemote(j.Title, j.Description, j.Location.DisplayName),
				JobType:     NormalizeJobType(j.ContractType),
				SalaryMin:   NormalizeSalary(j.SalaryMin, "year"),
				SalaryMax:   NormalizeSalary(j.SalaryMax, "year"),
				Tags:        ExtractTagsFromText(j.Title + " " + j.Description),
				PostedAt:    SafeTime(postedAt, time.Now()),
			}
			if err := UpsertJob(ctx, pool, nj); err != nil {
				slog.Error("adzuna upsert failed", "err", err)
				continue
			}
			total++
		}

		if len(result.Results) < 50 {
			break
		}
		time.Sleep(500 * time.Millisecond)
	}

	slog.Info("adzuna: upserted jobs", "count", total, "query", query)
	return nil
}
