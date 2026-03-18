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

type remotiveResponse struct {
	Jobs []remotiveJob `json:"jobs"`
}

type remotiveJob struct {
	ID              int      `json:"id"`
	URL             string   `json:"url"`
	Title           string   `json:"title"`
	CompanyName     string   `json:"company_name"`
	Description     string   `json:"description"`
	JobType         string   `json:"job_type"`
	Tags            []string `json:"tags"`
	PublicationDate string   `json:"publication_date"`
}

func ScrapeRemotive(ctx context.Context, pool *pgxpool.Pool, query string) error {
	apiURL := "https://remotive.com/api/remote-jobs?limit=100"
	if query != "" {
		apiURL += "&search=" + url.QueryEscape(query)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("User-Agent", "JobBoard/1.0")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("fetch remotive: %w", err)
	}
	defer resp.Body.Close()

	var result remotiveResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("decode remotive: %w", err)
	}

	count := 0
	for _, j := range result.Jobs {
		postedAt, _ := time.Parse("2006-01-02T15:04:05", j.PublicationDate)
		nj := models.NormalizedJob{
			ExternalID:  fmt.Sprintf("remotive-%d", j.ID),
			Source:      "remotive",
			SourceURL:   j.URL,
			Title:       j.Title,
			CompanyName: j.CompanyName,
			Description: Truncate(j.Description, 5000),
			Location:    "Remote",
			IsRemote:    true,
			JobType:     NormalizeJobType(j.JobType),
			Tags:        j.Tags,
			PostedAt:    SafeTime(postedAt, time.Now()),
		}
		if err := UpsertJob(ctx, pool, nj); err != nil {
			slog.Error("remotive upsert failed", "err", err)
			continue
		}
		count++
	}
	slog.Info("remotive: upserted jobs", "count", count, "query", query)
	return nil
}
