import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { refreshToken, getMe, logoutApi } from '@/api/auth'

const TOKEN_KEY = 'jb_token'
const USER_KEY  = 'jb_user'

// Decode JWT payload without a library to check expiry
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

// In-memory accessor (so axios interceptor can always read it synchronously)
let _accessToken = null
export const getAccessToken = () => _accessToken

export function setAccessToken(token) {
  _accessToken = token
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }
}

// Module-level singleton — prevents StrictMode double-mount from calling
// the refresh endpoint twice (second call would reuse an already-rotated token)
let _bootPromise = null
function boot() {
  if (!_bootPromise) {
    _bootPromise = (async () => {
      // 1. Try stored token first — avoids a network round-trip on every page load
      const stored = localStorage.getItem(TOKEN_KEY)
      if (stored && !isTokenExpired(stored)) {
        _accessToken = stored
        const cachedUser = localStorage.getItem(USER_KEY)
        if (cachedUser) return JSON.parse(cachedUser)
        // Token valid but no cached user — fetch profile
        try {
          const me = await getMe()
          localStorage.setItem(USER_KEY, JSON.stringify(me.user))
          return me.user
        } catch {
          setAccessToken(null)
          return null
        }
      }

      // 2. Token missing or expired — try refresh cookie
      try {
        const data = await refreshToken()
        setAccessToken(data.access_token)
        const me = await getMe()
        localStorage.setItem(USER_KEY, JSON.stringify(me.user))
        return me.user
      } catch {
        setAccessToken(null)
        return null
      }
    })()
  }
  return _bootPromise
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    boot().then((userData) => {
      setUser(userData)
      setIsLoading(false)
    })
  }, [])

  const login = useCallback((token, userData) => {
    setAccessToken(token)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
    setUser(userData)
  }, [])

  const logout = useCallback(async () => {
    try { await logoutApi() } catch { /* ignore */ }
    queryClient.clear()
    setAccessToken(null)
    setUser(null)
  }, [queryClient])

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
