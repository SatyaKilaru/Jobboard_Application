import axios from 'axios'
import { getAccessToken, setAccessToken } from '@/contexts/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

const client = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
})

client.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

// Auth endpoints that legitimately return 401 — never trigger token refresh for these
const SKIP_REFRESH = ['auth/login', 'auth/register', 'auth/refresh']

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const url = originalRequest?.url || ''

    // Check if this is an auth endpoint — skip refresh to preserve the original error
    const isAuthEndpoint = SKIP_REFRESH.some(ep => url.includes(ep))

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return client(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true })
        setAccessToken(data.access_token)
        processQueue(null, data.access_token)
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`
        return client(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        setAccessToken(null)
        // Don't redirect if already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default client
