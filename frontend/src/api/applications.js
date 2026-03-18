import client from './client'

export const fetchApplications = (status) =>
  client.get('/applications', { params: status ? { status } : {} }).then(r => r.data)

export const fetchApplicationStats = () =>
  client.get('/applications/stats').then(r => r.data)

export const createApplication = (data) =>
  client.post('/applications', data).then(r => r.data)

export const updateApplicationStatus = (id, status) =>
  client.patch(`/applications/${id}/status`, { status }).then(r => r.data)

export const updateApplicationNotes = (id, notes) =>
  client.patch(`/applications/${id}/notes`, { notes }).then(r => r.data)

export const deleteApplication = (id) =>
  client.delete(`/applications/${id}`).then(r => r.data)
