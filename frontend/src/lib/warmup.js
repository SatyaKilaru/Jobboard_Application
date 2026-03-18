import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

let warmedUp = false

/**
 * Pings all service health endpoints in parallel on first app load
 * to wake up sleeping Render free-tier services (~30-60s cold start).
 * Subsequent calls are no-ops.
 */
export async function warmupServices() {
  if (warmedUp) return
  warmedUp = true
  const endpoints = [
    API_BASE + '/../health',           // gateway
    API_BASE + '/auth/me',             // auth (will 401 but wakes it up)
    API_BASE + '/jobs?limit=1',        // jobs
    API_BASE + '/applications/stats',  // applications (will 401 but wakes it up)
  ]
  await Promise.allSettled(
    endpoints.map(url => axios.get(url, { timeout: 60000 }).catch(() => {}))
  )
}
