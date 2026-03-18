import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApplications, fetchApplicationStats, createApplication, updateApplicationStatus, updateApplicationNotes, deleteApplication } from '@/api/applications'

export function useApplications(status) {
  return useQuery({
    queryKey: ['applications', status],
    queryFn: () => fetchApplications(status),
  })
}

export function useApplicationStats() {
  return useQuery({
    queryKey: ['application-stats'],
    queryFn: fetchApplicationStats,
  })
}

export function useCreateApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createApplication,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] })
      qc.invalidateQueries({ queryKey: ['application-stats'] })
    },
  })
}

export function useUpdateStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => updateApplicationStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] })
      qc.invalidateQueries({ queryKey: ['application-stats'] })
    },
  })
}

export function useUpdateNotes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }) => updateApplicationNotes(id, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  })
}

export function useDeleteApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteApplication,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] })
      qc.invalidateQueries({ queryKey: ['application-stats'] })
    },
  })
}
