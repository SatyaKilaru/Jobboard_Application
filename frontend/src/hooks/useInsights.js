import { useQuery } from '@tanstack/react-query'
import { fetchSalaryInsights, fetchSalaryBySource, fetchTopPayingJobs, fetchCompanies, fetchCompanyProfile, fetchCompanyJobs } from '@/api/insights'

export function useSalaryInsights() {
  return useQuery({ queryKey: ['salary-insights'], queryFn: fetchSalaryInsights, staleTime: 1000 * 60 * 10 })
}

export function useSalaryBySource() {
  return useQuery({ queryKey: ['salary-by-source'], queryFn: fetchSalaryBySource, staleTime: 1000 * 60 * 10 })
}

export function useTopPayingJobs(limit = 20) {
  return useQuery({ queryKey: ['top-paying', limit], queryFn: () => fetchTopPayingJobs(limit), staleTime: 1000 * 60 * 10 })
}

export function useCompanies(page = 1) {
  return useQuery({ queryKey: ['companies', page], queryFn: () => fetchCompanies(page) })
}

export function useCompanyProfile(slug) {
  return useQuery({ queryKey: ['company', slug], queryFn: () => fetchCompanyProfile(slug), enabled: !!slug })
}

export function useCompanyJobs(slug, page = 1) {
  return useQuery({ queryKey: ['company-jobs', slug, page], queryFn: () => fetchCompanyJobs(slug, page), enabled: !!slug })
}
