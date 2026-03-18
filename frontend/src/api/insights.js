import client from './client'

export const fetchSalaryInsights = () =>
  client.get('/insights/salary').then(r => r.data)

export const fetchSalaryBySource = () =>
  client.get('/insights/salary/sources').then(r => r.data)

export const fetchTopPayingJobs = (limit = 20) =>
  client.get('/insights/salary/top', { params: { limit } }).then(r => r.data)

export const fetchCompanies = (page = 1, limit = 20) =>
  client.get('/companies', { params: { page, limit } }).then(r => r.data)

export const fetchCompanyProfile = (slug) =>
  client.get(`/companies/${slug}`).then(r => r.data)

export const fetchCompanyJobs = (slug, page = 1) =>
  client.get(`/companies/${slug}/jobs`, { params: { page } }).then(r => r.data)
