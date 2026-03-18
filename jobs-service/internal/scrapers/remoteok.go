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

type remoteOKJob struct {
	Slug        string   `json:"slug"`
	ID          string   `json:"id"`
	URL         string   `json:"url"`
	ApplyURL    string   `json:"apply_url"`
	Position    string   `json:"position"`
	Company     string   `json:"company"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	Date        string   `json:"date"`
	Location    string   `json:"location"`
	SalaryMin   float64  `json:"salary_min"`
	SalaryMax   float64  `json:"salary_max"`
}

func ScrapeRemoteOK(ctx context.Context, pool *pgxpool.Pool, query string) error {
	apiURL := "https://remoteok.com/api"
	if query != "" {
		apiURL += "?tags=" + url.QueryEscape(query)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; JobBoard/1.0)")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("fetch remoteok: %w", err)
	}
	defer resp.Body.Close()

	var raw []json.RawMessage
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return fmt.Errorf("decode remoteok: %w", err)
	}

	count := 0
	for i, item := range raw {
		if i == 0 {
			continue // skip metadata
		}
		var j remoteOKJob
		if err := json.Unmarshal(item, &j); err != nil {
			continue
		}
		if j.Position == "" {
			continue
		}
		postedAt, _ := time.Parse(time.RFC3339, j.Date)
		jobURL := j.ApplyURL
		if jobURL == "" {
			jobURL = j.URL
		}
		if !strings.HasPrefix(jobURL, "http") {
			jobURL = "https://remoteok.com" + jobURL
		}
		externalID := "remoteok-" + j.ID
		if j.ID == "" {
			externalID = "remoteok-" + j.Slug
		}
		loc := j.Location
		if loc == "" {
			loc = "Remote"
		}
		nj := models.NormalizedJob{
			ExternalID:  externalID,
			Source:      "remoteok",
			SourceURL:   jobURL,
			Title:       j.Position,
			CompanyName: j.Company,
			Description: Truncate(j.Description, 5000),
			Location:    loc,
			IsRemote:    true,
			JobType:     "full-time",
			SalaryMin:   NormalizeSalary(j.SalaryMin, "year"),
			SalaryMax:   NormalizeSalary(j.SalaryMax, "year"),
			Tags:        j.Tags,
			PostedAt:    SafeTime(postedAt, time.Now()),
		}
		if err := UpsertJob(ctx, pool, nj); err != nil {
			slog.Error("remoteok upsert failed", "err", err)
			continue
		}
		count++
	}
	slog.Info("remoteok: upserted jobs", "count", count, "query", query)
	return nil
}
