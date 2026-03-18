package scrapers

import (
	"context"
	"log/slog"
	"time"

	"github.com/go-co-op/gocron/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ScraperConfig struct {
	AdzunaAppID  string
	AdzunaAppKey string
}

// StartScheduler starts a background refresh that keeps the DB warm with
// general (no-query) job data. Real-time per-query fetching is handled by
// FetchAll called directly from the jobs handler.
func StartScheduler(pool *pgxpool.Pool, cfg ScraperConfig) (gocron.Scheduler, error) {
	s, err := gocron.NewScheduler(gocron.WithLocation(time.UTC))
	if err != nil {
		return nil, err
	}

	ctx := context.Background()

	_, err = s.NewJob(
		gocron.DurationJob(6*time.Hour),
		gocron.NewTask(func() {
			slog.Info("scheduler: background general refresh")
			FetchAll(ctx, pool, cfg, "")
		}),
		gocron.WithStartAt(gocron.WithStartImmediately()),
	)
	if err != nil {
		return nil, err
	}

	s.Start()
	slog.Info("scheduler: started — general refresh every 6h (immediate), real-time fetch per search query")
	return s, nil
}
