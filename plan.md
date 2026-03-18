# JobBoard — Job Aggregation Platform

## Context
Build a job aggregation platform similar to Indeed/Glassdoor but differentiated by AI-powered job matching, salary insights, application tracking, and company culture scoring. Aggregates jobs from free public APIs (Adzuna, Remotive, RemoteOK, HackerNews "Who's Hiring"). Frontend on Vercel, Go backend on Railway, GoDaddy subdomain for routing.

---

## Stack
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Go + Gin framework
- **Database**: PostgreSQL via Neon (free tier)
- **Auth**: JWT with refresh token rotation — access token in memory, refresh token in `httpOnly` cookie
- **AI**: Claude API (`claude-sonnet-4-6`) for resume parsing + job matching
- **Scraping**: Go `Colly` (static) + `gocron` scheduler
- **Deployment**: Frontend → Vercel, Backend → Railway, DB → Neon, Domain → GoDaddy CNAME

---

## Project Structure

```
jobboard/
├── frontend/               # React + Vite app → deployed to Vercel
│   └── src/
│       ├── api/            # Axios client + per-resource API files
│       ├── components/     # UI, layout, jobs, resume, salary, applications, auth
│       ├── contexts/       # AuthContext (token in memory)
│       ├── hooks/          # useJobs, useAuth, useResumeMatch, useInfiniteJobs
│       ├── pages/          # HomePage, JobsPage, DashboardPage, etc.
│       ├── store/          # Zustand auth store
│       └── types/          # Shared TypeScript types
├── backend/                # Go API → deployed to Railway
│   ├── cmd/api/main.go     # Entry point: DB, migrations, scheduler, routes
│   └── internal/
│       ├── auth/           # JWT handler, middleware, token rotation
│       ├── jobs/           # Job CRUD, search, filter
│       ├── applications/   # Application tracker CRUD
│       ├── resume/         # File upload, PDF/DOCX text extraction
│       ├── ai/             # Claude API client, matcher, prompts
│       ├── scrapers/       # Adzuna, Remotive, RemoteOK, HN + scheduler + deduplicator + normalizer
│       ├── salary/         # Salary aggregation + trend queries
│       ├── companies/      # Company profiles, culture scores
│       ├── users/          # User profile
│       └── db/             # pgx pool, migrations (golang-migrate)
└── docker-compose.yml      # Local dev (Postgres + backend)
```

---

## Database Schema (7 tables)

| Table | Key Columns |
|---|---|
| `users` | id, email, password_hash, full_name, resume_url, resume_text, resume_parsed_at |
| `refresh_tokens` | id, user_id, token_hash, family (UUID), is_revoked, expires_at |
| `companies` | id, name, slug, culture_score, culture_sources (JSONB) |
| `jobs` | id, external_id, source, source_url, title, company_id, description, location, is_remote, job_type, salary_min/max, tags (TEXT[]), fingerprint (UNIQUE SHA256), raw_data (JSONB) |
| `saved_jobs` | user_id, job_id (UNIQUE pair) |
| `applications` | user_id, job_id, status (saved→applied→interview→offer→rejected), notes |
| `user_skills` | user_id, skill_name, category, years_exp, proficiency, source |
| `job_match_scores` | user_id, job_id, score (0–100), matched_skills[], missing_skills[] |
| `salary_snapshots` | title_normalized, location, salary_min/max/avg, snapshot_month |

---

## API Endpoints

```
POST /api/v1/auth/register|login|refresh|logout
GET  /api/v1/auth/me

GET  /api/v1/jobs                    ?q, location, remote, job_type, salary_min/max, tags, sort
GET  /api/v1/jobs/:id
GET  /api/v1/jobs/recommended        [protected, uses match scores]

GET/POST/PATCH/DELETE /api/v1/applications/:id
GET/POST/DELETE       /api/v1/saved-jobs/:job_id

POST /api/v1/resume/upload
GET  /api/v1/resume/skills
GET  /api/v1/resume/matches

GET  /api/v1/companies/:slug
GET  /api/v1/companies/:slug/jobs
GET  /api/v1/salary/insights?title=&location=
GET  /api/v1/salary/trends?title=&months=
```

---

## Auth: JWT with Refresh Token Rotation

- **Access token**: 15-min JWT, stored in module-level JS variable (not localStorage, not state) — prevents XSS theft. On page refresh, silently re-hydrated via httpOnly cookie.
- **Refresh token**: 30-day token stored as bcrypt hash in DB, sent via `httpOnly` cookie. Each token belongs to a `family` UUID — reuse of an old family token revokes the entire family (rotation attack protection).
- **Axios interceptor**: On 401, auto-calls `/auth/refresh`, retries the original request. No manual token management needed in components.

---

## Job Data Sources (all free)

| Source | Method | Schedule |
|---|---|---|
| **Remotive** | Free REST API (no key) | Every 4h |
| **RemoteOK** | Free REST API (no key) | Every 4h (offset 60min) |
| **Adzuna** | Free API (app_id + app_key, 250 req/day) | Every 6h |
| **HackerNews "Who's Hiring"** | HN Algolia API → parse monthly thread comments | 1st–5th of each month |

**Deduplication**: `fingerprint = SHA256(lower(title) + "|" + lower(company) + "|" + source)` → PostgreSQL `INSERT ... ON CONFLICT DO UPDATE` upsert.

**Normalization**: All sources → common `Job` struct via `normalizer.go` (salary to annual USD, remote detection, tag normalization).

---

## AI Integration (Claude API)

**Resume parsing** (1 API call per upload):
- Extract text from PDF/DOCX → call `claude-sonnet-4-6` with structured prompt → returns JSON array of skills with category/proficiency/years_exp → persist to `user_skills`

**Job matching** (no Claude call per job — cost-efficient):
```
score = (tag_overlap × 0.6) + (title_match × 0.25) + (experience_match × 0.15)
```
- Tag intersection between `user_skills` and `job.tags` using PostgreSQL GIN index
- Scores batch-computed as background goroutine after resume upload
- Results stored in `job_match_scores`, surfaced as `?sort=match_score` + match % badge on cards

---

## Deployment

| Component | Host | Config |
|---|---|---|
| Frontend | Vercel | GitHub auto-deploy; `vercel.json` SPA rewrite |
| Backend | Railway | Dockerfile + `railway.toml`; env vars in dashboard |
| Database | Neon | Serverless Postgres; pgx pool MaxConns=10 |
| Domain | GoDaddy | `www` CNAME → Vercel; `api` CNAME → Railway |

---

## Build Phases (MVP-first)

| Phase | Deliverable | ~Time |
|---|---|---|
| **1** | Monorepo setup, DB, JWT auth (register/login/refresh/logout) | Week 1–2 |
| **2** | Job ingestion pipeline (all 4 sources), job list/search UI | Week 3–4 |
| **3** | Job detail page, save jobs, application Kanban tracker | Week 5 |
| **4** | Resume upload, Claude skill extraction, AI match scores | Week 6–7 |
| **5** | Salary insights charts (Recharts) + trend graphs | Week 8 |
| **6** | Company profile pages + culture score display | Week 9 |
| **7** | Rate limiting, CORS hardening, SEO, Lighthouse 90+, CI/CD | Week 10 |

---

## Critical Files to Create First
- `backend/cmd/api/main.go` — app entry point (DB + migrations + scheduler + routes)
- `backend/internal/auth/tokens.go` — JWT + refresh token family rotation (security foundation)
- `backend/internal/scrapers/normalizer.go` — canonical Job struct (all scrapers depend on this)
- `frontend/src/api/client.ts` — Axios instance with 401 → silent refresh interceptor
- `backend/internal/ai/matcher.go` — tag-intersection scoring + Claude resume parser

---

---

## Detailed Flow Diagrams

### 1. User Registration & Login Flow

```
REGISTER
--------
User fills form (email + password + name)
  → POST /api/v1/auth/register
    → Go: validate input (email format, password min 8 chars)
    → Go: bcrypt hash password (cost 12)
    → Go: INSERT into users
    → Go: generate access token (JWT, 15min, signed with JWT_ACCESS_SECRET)
    → Go: generate refresh token (random 32 bytes, SHA256 hash stored in refresh_tokens)
    → Go: set httpOnly cookie "refresh_token" (Secure, SameSite=Strict, 30 days)
    → Response: { user: {...}, access_token: "eyJ..." }
  → Frontend: store access_token in AuthContext module variable (NOT localStorage)
  → Frontend: redirect to /dashboard

LOGIN
-----
User submits email + password
  → POST /api/v1/auth/login
    → Go: SELECT user by email
    → Go: bcrypt.CompareHashAndPassword
    → Go: same token generation as register
    → Response: { user: {...}, access_token: "eyJ..." }
  → Frontend: same as register

PAGE REFRESH (silent re-auth)
------------------------------
App mounts → AuthContext checks if access_token in memory = null
  → POST /api/v1/auth/refresh (browser automatically sends httpOnly cookie)
    → Go: read "refresh_token" from cookie
    → Go: SHA256 hash it, SELECT from refresh_tokens WHERE token_hash = ? AND NOT is_revoked AND expires_at > NOW()
    → Go: REUSE ATTACK CHECK — if token family has a newer token already issued, revoke entire family and return 401
    → Go: mark old token as revoked, generate new refresh token (same family), INSERT new row
    → Go: set new httpOnly cookie, return new access_token
  → Frontend: store new access_token, render protected routes
  → If 401 → redirect to /login

LOGOUT
------
  → POST /api/v1/auth/logout (sends cookie)
    → Go: mark current refresh token as revoked
    → Go: clear cookie (set Max-Age=0)
    → Frontend: clear access_token from memory, redirect to /
```

---

### 2. Axios Interceptor Flow (Silent Token Refresh)

```
Any protected API call (e.g. GET /jobs/recommended)
  → Axios attaches Authorization: Bearer <access_token>
  → Server returns 401 (token expired)
  → Axios interceptor catches 401
    → Calls POST /auth/refresh (cookie sent automatically)
    → On success: update in-memory access_token, RETRY original request
    → On failure (cookie also expired): redirect to /login
  → Original request completes transparently
```

---

### 3. Job Scraping & Ingestion Pipeline Flow

```
gocron scheduler (runs inside Go backend process)
  │
  ├── Every 4h → remotive.go
  │     → GET https://remotive.com/api/remote-jobs
  │     → Parse JSON array of jobs
  │     → normalizer.go: map to Job{} struct
  │     → deduplicator.go: compute fingerprint = SHA256(title+company+source)
  │     → DB: INSERT INTO jobs ON CONFLICT (fingerprint) DO UPDATE SET updated_at, is_active=true
  │
  ├── Every 4h (offset 60min) → remoteok.go
  │     → GET https://remoteok.com/api
  │     → Skip first element (metadata), parse rest
  │     → normalizer.go → deduplicator.go → DB upsert
  │
  ├── Every 6h → adzuna.go
  │     → GET https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=&app_key=&category=it-jobs&results_per_page=50
  │     → Paginate: repeat with page=2,3... until results < 50
  │     → sleep(500ms) between pages (rate limit etiquette)
  │     → normalizer.go → deduplicator.go → DB upsert
  │
  └── Daily 09:00 UTC (1st–5th of month) → hackernews.go
        → GET https://hn.algolia.com/api/v1/search?query=Ask+HN:+Who+is+hiring&tags=story
        → Find latest thread by user "whoishiring"
        → Fetch all top-level comments (paginated via HN API)
        → Each comment → regex + Claude API to extract structured job data
        → normalizer.go → deduplicator.go → DB upsert

normalizer.go transforms all sources → common Job struct:
  - Salary: detect "per hour" → multiply by 2080; detect currency symbols → convert
  - Remote: check "remote", "anywhere", "work from home", "🌎" → is_remote = true
  - Tags: extract from description keywords, lowercase, deduplicate, max 20
  - Dates: parse any format → time.Time UTC

DB upsert with fingerprint:
  INSERT INTO jobs (...) VALUES (...)
  ON CONFLICT (fingerprint) DO UPDATE
    SET is_active = TRUE, updated_at = NOW(), raw_data = EXCLUDED.raw_data
```

---

### 4. Job Search & Display Flow

```
User types in search bar (debounced 300ms)
  → GET /api/v1/jobs?q=golang+engineer&remote=true&salary_min=80000&page=1&limit=20
    → Go handler: parse query params
    → Go: build PostgreSQL query dynamically:
        SELECT * FROM jobs
        WHERE is_active = TRUE
          AND ($1 = '' OR to_tsvector('english', title || ' ' || description) @@ plainto_tsquery($1))
          AND ($2 = FALSE OR is_remote = TRUE)
          AND (salary_min IS NULL OR salary_min >= $3)
        ORDER BY posted_at DESC
        LIMIT 20 OFFSET 0
    → Response: { jobs: [...], total: 1423, page: 1, limit: 20 }

  → Frontend: React Query caches result keyed by all filter params
  → JobList renders JobCard[] using virtualized list (react-virtual)
  → User scrolls to bottom → useInfiniteQuery fetches page=2 automatically

JobCard shows:
  - Title, Company name (→ links to /companies/:slug)
  - Location badge + Remote badge
  - Salary range (formatted: "$80k – $120k")
  - Tags (first 5, overflow hidden)
  - Posted date (relative: "3 days ago")
  - AI Match % badge (only if user has uploaded resume)
  - [Save] button (heart icon) → POST /saved-jobs
  - [Apply →] button → window.open(job.source_url, '_blank')
```

---

### 5. Resume Upload & AI Matching Flow

```
User drags PDF onto ResumeUpload component
  → POST /api/v1/resume/upload (multipart/form-data)
    → Go: validate MIME type (application/pdf or .docx)
    → Go: validate file size ≤ 5MB
    → Go: store file to Cloudflare R2 (S3-compatible, free 10GB)
    → Go: extract plain text:
          PDF  → pdfcpu library → plain text string
          DOCX → gooxml library → plain text string
    → Go: UPDATE users SET resume_url=..., resume_text=..., resume_parsed_at=NULL
    → Go: spawn goroutine for AI extraction (non-blocking)
    → Response: 202 Accepted { message: "Processing resume..." }

Background goroutine (ai/claude.go):
  → Truncate resume_text to 8000 tokens
  → POST to Claude API (claude-sonnet-4-6):
      system: "You are a resume parser. Return ONLY JSON with skills array..."
      user: <resume_text>
  → Parse JSON response → []Skill{name, category, years_exp, proficiency}
  → DELETE FROM user_skills WHERE user_id = ?
  → INSERT INTO user_skills (batch insert all extracted skills)
  → UPDATE users SET resume_parsed_at = NOW()

Frontend polls GET /api/v1/resume/skills every 3s
  → Until resume_parsed_at IS NOT NULL
  → Renders SkillsDisplay: badges grouped by category (Languages, Frameworks, Tools, Cloud)
  → User can manually add/remove skills

Match score computation (ai/matcher.go) — triggered after skills saved:
  → SELECT tags FROM jobs WHERE is_active = TRUE (paginated, 500 at a time)
  → SELECT skill_name FROM user_skills WHERE user_id = ?
  → For each job:
      tag_overlap    = |user_skills ∩ job.tags| / max(|job.tags|, 1)
      title_match    = 1.0 if job.title contains any of user's titles, else 0
      experience_match = clamp(user.max_years / required_years, 0, 1) — estimated from description
      score = (tag_overlap × 0.6) + (title_match × 0.25) + (experience_match × 0.15) × 100
  → UPSERT INTO job_match_scores (user_id, job_id, score, matched_skills, missing_skills)
  → After all jobs scored, job list ?sort=match_score becomes available

Job feed with match scores:
  → GET /api/v1/jobs?sort=match_score (protected)
    → Go: JOIN jobs with job_match_scores WHERE user_id = ?
    → ORDER BY score DESC
    → Each job card shows green badge "87% match"
    → Hover → tooltip shows matched skills and missing skills
```

---

### 6. Application Tracking Flow

```
User clicks [Track Application] on a job card
  → POST /api/v1/applications { job_id: "uuid", status: "applied" }
    → Go: INSERT INTO applications (user_id, job_id, status, applied_at=NOW())
    → Response: application object

ApplicationsPage renders Kanban board:
  Columns: Saved | Applied | Phone Screen | Interview | Offer | Rejected

  → GET /api/v1/applications
    → Go: SELECT a.*, j.title, j.company_name, j.source_url FROM applications a JOIN jobs j ...
    → Frontend: group by status, render ApplicationCard in each column

User drags card from "Applied" → "Interview":
  → PATCH /api/v1/applications/:id { status: "interview" }
    → Go: UPDATE applications SET status=?, updated_at=NOW() WHERE id=? AND user_id=?
    → Optimistic UI update (React Query mutation with rollback on error)

User adds note:
  → PATCH /api/v1/applications/:id { notes: "Spoke with recruiter, follow up by Friday" }
```

---

### 7. Salary Insights Flow

```
Nightly background job (gocron, 02:00 UTC):
  → SELECT title, location, is_remote, salary_min, salary_max FROM jobs
    WHERE is_active = TRUE AND salary_min IS NOT NULL
    GROUP BY normalize(title), location
  → Compute avg = (salary_min + salary_max) / 2 for each job
  → UPSERT INTO salary_snapshots (title_normalized, location, salary_min, salary_max, salary_avg, snapshot_month, sample_count)

SalaryPage:
  User types "Senior Frontend Engineer" in search
  → GET /api/v1/salary/insights?title=senior+frontend+engineer
    → SELECT avg(salary_avg), min(salary_min), max(salary_max), count(*) FROM salary_snapshots
      WHERE title_normalized ILIKE '%senior frontend engineer%'
      AND snapshot_month = date_trunc('month', NOW())
    → Response: { avg: 130000, min: 95000, max: 175000, sample_count: 234 }
  → SalaryChart: bar chart showing min/avg/max with color bands

  User clicks "Show Trends"
  → GET /api/v1/salary/trends?title=senior+frontend+engineer&months=6
    → SELECT snapshot_month, salary_avg FROM salary_snapshots
      WHERE title_normalized ILIKE ? ORDER BY snapshot_month ASC
      LIMIT 6
    → TrendGraph: line chart showing salary movement over last 6 months
```

---

### 8. Domain & Deployment Flow

```
GoDaddy DNS:
  www     CNAME → cname.vercel-dns.com    (Vercel handles TLS)
  api     CNAME → yoursvc.up.railway.app   (Railway handles TLS)

Push to main branch on GitHub:
  → GitHub Actions: run go test ./... (backend)
  → GitHub Actions: run npm run build (frontend)
  → On success:
      Vercel GitHub integration auto-deploys frontend
      Railway GitHub integration auto-deploys backend (builds Dockerfile)

Request flow (production):
  Browser → www.yourdomain.com → Vercel CDN → serves React SPA (static)
  SPA API calls → api.yourdomain.com → Railway → Go server → Neon PostgreSQL

CORS (Go backend):
  Allowed origins: ["https://www.yourdomain.com", "https://yourdomain.com"]
  Allowed methods: GET, POST, PATCH, DELETE, OPTIONS
  Allowed headers: Authorization, Content-Type
  Allow credentials: true (required for httpOnly cookie to be sent cross-origin)
```

---

## Verification Checklist
- [ ] `go test ./...` passes for auth, scrapers, matcher packages
- [ ] `POST /auth/register` → `POST /auth/login` → `GET /auth/me` flow works end-to-end
- [ ] Jobs appear in UI after scraper runs (check DB row count)
- [ ] Resume upload → skills extracted → job cards show match %
- [ ] Refresh token rotation: reusing old token revokes the family
- [ ] `api.yourdomain.com` resolves to Railway backend (CNAME check)
- [ ] `www.yourdomain.com` resolves to Vercel frontend
- [ ] Lighthouse score ≥ 90 on production build
