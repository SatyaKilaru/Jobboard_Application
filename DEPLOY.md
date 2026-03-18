# Deployment Guide — Render + Vercel + GoDaddy

## Architecture

```
Browser
  │
  ├─ app.yourdomain.com (Vercel — React frontend)
  │     └─ /api/* rewrites to ──► api.yourdomain.com (Render — Gateway)
  │                                    ├─ /auth/*         → auth-service
  │                                    ├─ /jobs/*         → jobs-service
  │                                    ├─ /insights/*     → jobs-service
  │                                    ├─ /companies/*    → jobs-service
  │                                    └─ /applications/* → applications-service
  │
  └─ PostgreSQL (Render managed)
```

---

## Step 1: Push to GitHub

```bash
cd ~/Desktop/Project/pdev
git init
git add -A
git commit -m "Initial commit — JobBoard microservices"
git remote add origin https://github.com/YOUR_USERNAME/jobboard.git
git push -u origin main
```

---

## Step 2: Deploy Backend on Render

### Option A: Blueprint (Recommended)
1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New** → **Blueprint**
3. Connect your GitHub repo
4. Render reads `render.yaml` and creates all services + database automatically
5. Wait for all services to deploy

### Option B: Manual Setup
1. **Create PostgreSQL Database**
   - New → PostgreSQL → Name: `jobboard-db` → Free plan → Create
   - Copy the **Internal Database URL**

2. **Create each service** (repeat for auth, jobs, applications, gateway):
   - New → Web Service → Connect repo
   - Root Directory: `auth-service` (or `jobs-service`, etc.)
   - Runtime: Docker
   - Plan: Free
   - Add environment variables (see below)

### Environment Variables

**auth-service:**
| Variable | Value |
|---|---|
| `DATABASE_URL` | (from Render PostgreSQL — Internal URL) |
| `JWT_ACCESS_SECRET` | (generate: `openssl rand -hex 32`) |
| `JWT_REFRESH_SECRET` | (generate: `openssl rand -hex 32`) |
| `PORT` | `8081` |
| `FRONTEND_ORIGIN` | `https://app.yourdomain.com` |
| `ENV` | `production` |

**jobs-service:**
| Variable | Value |
|---|---|
| `DATABASE_URL` | (same Internal URL) |
| `JWT_ACCESS_SECRET` | (same as auth-service!) |
| `PORT` | `8082` |
| `FRONTEND_ORIGIN` | `https://app.yourdomain.com` |
| `ENV` | `production` |
| `ADZUNA_APP_ID` | (optional — from developer.adzuna.com) |
| `ADZUNA_APP_KEY` | (optional) |

**applications-service:**
| Variable | Value |
|---|---|
| `DATABASE_URL` | (same Internal URL) |
| `JWT_ACCESS_SECRET` | (same as auth-service!) |
| `PORT` | `8083` |
| `FRONTEND_ORIGIN` | `https://app.yourdomain.com` |
| `ENV` | `production` |

**api-gateway:**
| Variable | Value |
|---|---|
| `PORT` | `8080` |
| `AUTH_SERVICE_URL` | `https://jobboard-auth.onrender.com` |
| `JOBS_SERVICE_URL` | `https://jobboard-jobs.onrender.com` |
| `APPLICATIONS_SERVICE_URL` | `https://jobboard-applications.onrender.com` |
| `FRONTEND_ORIGIN` | `https://app.yourdomain.com` |

> **IMPORTANT**: `JWT_ACCESS_SECRET` must be the same across auth-service, jobs-service, and applications-service. They all validate the same JWT tokens.

3. Note the gateway's public URL (e.g., `https://jobboard-gateway.onrender.com`)

---

## Step 3: Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. **Framework Preset**: Vite
3. **Root Directory**: `frontend`
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. **Environment Variables**: None needed (API calls go through Vercel rewrites)
7. Click **Deploy**

### Update Vercel Rewrites

After Render deploys the gateway, update `frontend/vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://jobboard-gateway.onrender.com/api/:path*"
    }
  ]
}
```

Replace `GATEWAY_URL_HERE` with your actual Render gateway URL. Commit and push — Vercel will auto-redeploy.

---

## Step 4: GoDaddy Custom Domain

### For the Frontend (Vercel)
1. In Vercel dashboard → Project → Settings → Domains
2. Add `app.yourdomain.com`
3. Vercel gives you a CNAME record
4. In GoDaddy DNS:
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   TTL: 600
   ```
5. Wait 5-10 minutes for DNS propagation
6. Vercel auto-provisions SSL

### For the API Gateway (Render)
1. In Render dashboard → Gateway service → Settings → Custom Domains
2. Add `api.yourdomain.com`
3. Render gives you a CNAME record
4. In GoDaddy DNS:
   ```
   Type: CNAME
   Name: api
   Value: jobboard-gateway.onrender.com
   TTL: 600
   ```
5. Wait 5-10 minutes for DNS propagation
6. Render auto-provisions SSL

### Update FRONTEND_ORIGIN

After domains are live, update the `FRONTEND_ORIGIN` env var on all Render services:
```
FRONTEND_ORIGIN=https://app.yourdomain.com
```

---

## Step 5: Verify

1. Visit `https://app.yourdomain.com` — should load the frontend
2. Register a new account — should work end-to-end
3. Browse jobs page — scrapers should fetch from all sources
4. Check `https://api.yourdomain.com/health` — should return `{"status":"ok"}`

---

## Troubleshooting

| Issue | Fix |
|---|---|
| CORS errors in browser | Check `FRONTEND_ORIGIN` matches exactly (with https://) |
| Cookies not sent | Verify Vercel rewrites are working (same origin) |
| 502 on Render | Check service logs in Render dashboard |
| Services can't reach each other | Use the Render public URLs, not internal ones (free tier) |
| Cold starts (30-60s) | Normal on Render free tier — first request after sleep is slow |
| Database connection refused | Check `DATABASE_URL` uses the Internal URL from Render |

---

## Cost Summary

| Service | Platform | Plan | Cost |
|---|---|---|---|
| Frontend | Vercel | Hobby | Free |
| API Gateway | Render | Free | Free |
| Auth Service | Render | Free | Free |
| Jobs Service | Render | Free | Free |
| Applications Service | Render | Free | Free |
| PostgreSQL | Render | Free (90 days) | Free → $7/mo |
| Custom Domain | GoDaddy | (already owned) | — |
| **Total** | | | **$0/mo** (first 90 days) |
