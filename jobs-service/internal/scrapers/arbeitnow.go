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

type arbeitnowResponse struct {
	Data []arbeitnowJob `json:"data"`
}

type arbeitnowJob struct {
	Slug        string   `json:"slug"`
	CompanyName string   `json:"company_name"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Remote      bool     `json:"remote"`
	URL         string   `json:"url"`
	Tags        []string `json:"tags"`
	JobTypes    []string `json:"job_types"`
	Location    string   `json:"location"`
	CreatedAt   int64    `json:"created_at"`
}

// ScrapeArbeitnow fetches jobs from Arbeitnow API (free, no auth).
func ScrapeArbeitnow(ctx context.Context, pool *pgxpool.Pool, query string) error {
	client := &http.Client{Timeout: 30 * time.Second}
	total := 0

	for page := 1; page <= 3; page++ {
		apiURL := fmt.Sprintf("https://www.arbeitnow.com/api/job-board-api?page=%d", page)
		if query != "" {
			apiURL += "&search=" + url.QueryEscape(query)
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
		if err != nil {
			return fmt.Errorf("build request: %w", err)
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; JobBoard/1.0)")

		resp, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("fetch arbeitnow page %d: %w", page, err)
		}

		var result arbeitnowResponse
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			resp.Body.Close()
			return fmt.Errorf("decode arbeitnow page %d: %w", page, err)
		}
		resp.Body.Close()

		if len(result.Data) == 0 {
			break
		}

		for _, j := range result.Data {
			if j.Title == "" || j.URL == "" {
				continue
			}

			postedAt := time.Unix(j.CreatedAt, 0)
			jobType := "full-time"
			for _, jt := range j.JobTypes {
				jobType = NormalizeJobType(jt)
				break
			}

			tags := j.Tags
			if len(tags) == 0 {
				tags = ExtractTagsFromText(j.Title + " " + stripHTML(j.Description))
			}

			nj := models.NormalizedJob{
				ExternalID:  "arbeitnow-" + j.Slug,
				Source:      "arbeitnow",
				SourceURL:   j.URL,
				Title:       j.Title,
				CompanyName: j.CompanyName,
				Description: Truncate(stripHTML(j.Description), 5000),
				Location:    j.Location,
				IsRemote:    j.Remote,
				JobType:     jobType,
				Tags:        NormalizeTags(tags),
				PostedAt:    SafeTime(postedAt, time.Now()),
			}
			if err := UpsertJob(ctx, pool, nj); err != nil {
				slog.Error("arbeitnow upsert failed", "err", err)
				continue
			}
			total++
		}

		time.Sleep(300 * time.Millisecond)
	}

	slog.Info("arbeitnow: upserted jobs", "count", total, "query", query)
	return nil
}
