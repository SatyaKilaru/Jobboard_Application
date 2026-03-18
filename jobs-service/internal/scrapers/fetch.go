package scrapers

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Per-query cache so we don't hammer external APIs on every page load.
// Same query within 2 minutes reuses the DB results already stored.
var (
	cacheMu  sync.Mutex
	cache    = map[string]time.Time{}
	cacheTTL = 2 * time.Minute
)

func shouldFetch(key string) bool {
	cacheMu.Lock()
	defer cacheMu.Unlock()
	if last, ok := cache[key]; ok && time.Since(last) < cacheTTL {
		return false
	}
	cache[key] = time.Now()
	return true
}

// FetchAllAsync fires all scrapers in the background (non-blocking).
// The handler returns DB results immediately; fresh data appears on next refetch.
func FetchAllAsync(ctx context.Context, pool *pgxpool.Pool, cfg ScraperConfig, query string) {
	if !shouldFetch(query) {
		return
	}
	go fetchAll(ctx, pool, cfg, query)
}

// FetchAll runs all scrapers synchronously (used by the scheduler for startup warm-up).
func FetchAll(ctx context.Context, pool *pgxpool.Pool, cfg ScraperConfig, query string) {
	if !shouldFetch(query) {
		slog.Info("fetch: cached, skipping", "query", query)
		return
	}
	fetchAll(ctx, pool, cfg, query)
}

func fetchAll(ctx context.Context, pool *pgxpool.Pool, cfg ScraperConfig, query string) {
	fetchCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	var wg sync.WaitGroup
	wg.Add(6)

	go func() {
		defer wg.Done()
		if err := ScrapeRemotive(fetchCtx, pool, query); err != nil {
			slog.Error("remotive scrape failed", "err", err)
		}
	}()
	go func() {
		defer wg.Done()
		if err := ScrapeRemoteOK(fetchCtx, pool, query); err != nil {
			slog.Error("remoteok scrape failed", "err", err)
		}
	}()
	go func() {
		defer wg.Done()
		if err := ScrapeAdzuna(fetchCtx, pool, cfg.AdzunaAppID, cfg.AdzunaAppKey, query); err != nil {
			slog.Error("adzuna scrape failed", "err", err)
		}
	}()
	go func() {
		defer wg.Done()
		if err := ScrapeTheMuse(fetchCtx, pool, query); err != nil {
			slog.Error("themuse scrape failed", "err", err)
		}
	}()
	go func() {
		defer wg.Done()
		if err := ScrapeArbeitnow(fetchCtx, pool, query); err != nil {
			slog.Error("arbeitnow scrape failed", "err", err)
		}
	}()
	go func() {
		defer wg.Done()
		if err := ScrapeJobicy(fetchCtx, pool, query); err != nil {
			slog.Error("jobicy scrape failed", "err", err)
		}
	}()

	wg.Wait()
	slog.Info("fetch: completed all sources", "query", query)
}
