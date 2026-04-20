import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

let status = 'idle'
const listeners = new Set()

function setStatus(next) {
  if (status === next) return
  status = next
  listeners.forEach(fn => fn(status))
}

export function getWarmupStatus() {
  return status
}

export function subscribeWarmup(fn) {
  listeners.add(fn)
  fn(status)
  return () => listeners.delete(fn)
}

/**
 * Pings all service health endpoints in parallel on first app load
 * to wake up sleeping Render free-tier services (~30-60s cold start).
 * Subsequent calls are no-ops. Exposes status via subscribeWarmup so
 * the cold-start banner can react.
 */
export async function warmupServices() {
  if (status !== 'idle') return
  setStatus('pending')

  const endpoints = [
    API_BASE + '/../health',           // gateway
    API_BASE + '/auth/me',             // auth (will 401 but proves it's up)
    API_BASE + '/jobs?limit=1',        // jobs
    API_BASE + '/applications/stats',  // applications (will 401 but proves it's up)
  ]

  const results = await Promise.allSettled(
    endpoints.map(url => axios.get(url, { timeout: 60000 }))
  )

  // A service is "responsive" if it answered at all — even 401/404 means the
  // process is up and serving HTTP. Only network-level errors count as cold.
  const responsive = results.some(r => {
    if (r.status === 'fulfilled') return true
    return Boolean(r.reason?.response?.status)
  })

  setStatus(responsive ? 'ready' : 'failed')
}
