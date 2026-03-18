-- Jobs Service Schema
-- Safe to re-run: all statements use IF NOT EXISTS

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS companies (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    slug          TEXT NOT NULL UNIQUE,
    culture_score NUMERIC(3,1),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);

CREATE TABLE IF NOT EXISTS jobs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id  TEXT,
    source       TEXT NOT NULL,
    source_url   TEXT NOT NULL,
    title        TEXT NOT NULL,
    company_id   UUID REFERENCES companies(id),
    company_name TEXT NOT NULL DEFAULT '',
    description  TEXT NOT NULL DEFAULT '',
    location     TEXT NOT NULL DEFAULT '',
    is_remote    BOOLEAN NOT NULL DEFAULT FALSE,
    job_type     TEXT NOT NULL DEFAULT 'full-time',
    salary_min   BIGINT,
    salary_max   BIGINT,
    tags         TEXT[] NOT NULL DEFAULT '{}',
    fingerprint  TEXT NOT NULL UNIQUE,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    posted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_fingerprint ON jobs(fingerprint);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active   ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at   ON jobs(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_tags        ON jobs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_jobs_search      ON jobs USING GIN(
    to_tsvector('english', title || ' ' || description)
);

CREATE TABLE IF NOT EXISTS saved_jobs (
    user_id    UUID NOT NULL,
    job_id     UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);
