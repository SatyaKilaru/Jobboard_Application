import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchJobs, fetchSavedJobs, saveJob, unsaveJob } from '@/api/jobs'

export function useJobs(filters = {}) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => fetchJobs(filters),
    staleTime: 1000 * 60 * 2,
    // Auto-refetch once after 5s so background scraper results appear
    refetchInterval: (query) =>
      query.state.dataUpdateCount < 2 ? 5000 : false,
  })
}

export function useSavedJobs() {
  return useQuery({
    queryKey: ['saved-jobs'],
    queryFn: fetchSavedJobs,
  })
}

export function useToggleSave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isSaved }) =>
      isSaved ? unsaveJob(id) : saveJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] })
    },
    onError: (error) => {
      console.error('Save toggle failed:', error)
    },
  })
}
