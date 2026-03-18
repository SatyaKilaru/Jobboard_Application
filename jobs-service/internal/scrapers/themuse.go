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

type museResponse struct {
	Results  []museJob `json:"results"`
	Total    int       `json:"total"`
	Page     int       `json:"page"`
	PageCount int      `json:"page_count"`
}

type museJob struct {
	ID              int    `json:"id"`
	Name            string `json:"name"`
	Contents        string `json:"contents"`
	PublicationDate string `json:"publication_date"`
	ShortName       string `json:"short_name"`
	Locations       []struct {
		Name string `json:"name"`
	} `json:"locations"`
	Levels []struct {
		Name      string `json:"name"`
		ShortName string `json:"short_name"`
	} `json:"levels"`
	Tags []struct {
		Name      string `json:"name"`
		ShortName string `json:"short_name"`
	} `json:"tags"`
	Refs struct {
		LandingPage string `json:"landing_page"`
	} `json:"refs"`
	Company struct {
		Name string `json:"name"`
	} `json:"company"`
}

// ScrapeTheMuse fetches tech jobs from The Muse public API (no auth required).
func ScrapeTheMuse(ctx context.Context, pool *pgxpool.Pool, query string) error {
	client := &http.Client{Timeout: 30 * time.Second}
	total := 0

	for page := 0; page < 5; page++ {
		params := url.Values{}
		params.Set("page", fmt.Sprintf("%d", page))
		params.Set("descending", "true")
		params.Set("category", "Computer and IT")
		if query != "" {
			params.Set("q", query)
		}

		apiURL := "https://www.themuse.com/api/public/jobs?" + params.Encode()
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
		if err != nil {
			return fmt.Errorf("build request: %w", err)
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; JobBoard/1.0)")

		resp, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("fetch themuse page %d: %w", page, err)
		}

		var result museResponse
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			resp.Body.Close()
			return fmt.Errorf("decode themuse page %d: %w", page, err)
		}
		resp.Body.Close()

		if len(result.Results) == 0 {
			break
		}

		for _, j := range result.Results {
			if j.Name == "" || j.Refs.LandingPage == "" {
				continue
			}

			location := ""
			if len(j.Locations) > 0 {
				location = j.Locations[0].Name
			}

			// Collect tags from the tags array
			tags := make([]string, 0, len(j.Tags))
			for _, t := range j.Tags {
				if t.ShortName != "" {
					tags = append(tags, t.ShortName)
				}
			}
			// Supplement with text extraction if no tags
			if len(tags) == 0 {
				tags = ExtractTagsFromText(j.Name + " " + stripHTML(j.Contents))
			}

			jobType := "full-time"
			for _, lvl := range j.Levels {
				if strings.Contains(strings.ToLower(lvl.Name), "intern") {
					jobType = "internship"
				}
			}

			postedAt, _ := time.Parse(time.RFC3339, j.PublicationDate)

			nj := models.NormalizedJob{
				ExternalID:  fmt.Sprintf("themuse-%d", j.ID),
				Source:      "themuse",
				SourceURL:   j.Refs.LandingPage,
				Title:       j.Name,
				CompanyName: j.Company.Name,
				Description: Truncate(stripHTML(j.Contents), 5000),
				Location:    location,
				IsRemote:    DetectRemote(j.Name, j.Contents, location),
				JobType:     jobType,
				Tags:        NormalizeTags(tags),
				PostedAt:    SafeTime(postedAt, time.Now()),
			}
			if err := UpsertJob(ctx, pool, nj); err != nil {
				slog.Error("themuse upsert failed", "err", err)
				continue
			}
			total++
		}

		if page >= result.PageCount-1 {
			break
		}
		time.Sleep(300 * time.Millisecond)
	}

	slog.Info("themuse: upserted jobs", "count", total, "query", query)
	return nil
}
