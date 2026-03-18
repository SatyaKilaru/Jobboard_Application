import client from './client'
import axios from 'axios'

export const registerApi = (payload) =>
  client.post('/auth/register', payload).then(r => r.data)

export const loginApi = (payload) =>
  client.post('/auth/login', payload).then(r => r.data)

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

export const refreshToken = () =>
  axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true })
    .then(r => r.data)

export const logoutApi = () =>
  client.post('/auth/logout').then(r => r.data)

export const getMe = () =>
  client.get('/auth/me').then(r => r.data)
