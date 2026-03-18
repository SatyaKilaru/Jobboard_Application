import client from './client'

export const fetchJobs = (filters = {}) => {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.location) params.set('location', filters.location)
  if (filters.remote) params.set('remote', 'true')
  if (filters.job_type) params.set('job_type', filters.job_type)
  if (filters.salary_min) params.set('salary_min', String(filters.salary_min))
  params.set('page', String(filters.page ?? 1))
  params.set('limit', String(filters.limit ?? 20))
  return client.get(`/jobs?${params.toString()}`).then(r => r.data)
}

export const fetchJob = (id) =>
  client.get(`/jobs/${id}`).then(r => r.data.job)

export const saveJob = (id) =>
  client.post(`/jobs/${id}/save`).then(r => r.data)

export const unsaveJob = (id) =>
  client.delete(`/jobs/${id}/save`).then(r => r.data)

export const fetchSavedJobs = () =>
  client.get('/saved-jobs').then(r => r.data.jobs)
