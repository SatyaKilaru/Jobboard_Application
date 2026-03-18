import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Briefcase, Building2, DollarSign, Hash } from 'lucide-react'
import { useCompanyProfile, useCompanyJobs } from '@/hooks/useInsights'
import { useAuth } from '@/contexts/AuthContext'
import JobCard from '@/components/JobCard'

const fmt = (n) => n ? `$${Math.round(n / 1000)}k` : '\u2014'

export default function CompanyDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [page, setPage] = useState(1)

  const { data: company, isLoading: profileLoading, isError: profileError } = useCompanyProfile(slug)
  const { data: jobsData, isLoading: jobsLoading } = useCompanyJobs(slug, page)

  const totalPages = jobsData ? Math.ceil((jobsData.total ?? 0) / 20) : 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/companies')}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center">
                <Briefcase className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent text-sm">
                JobBoard
              </span>
            </div>
          </div>
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                {(user?.full_name?.[0] || user?.email?.[0] || '?').toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 pt-10 pb-16">
        <div className="max-w-5xl mx-auto px-4">
          {profileLoading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-white/20 rounded w-1/3 mb-3" />
              <div className="h-4 bg-white/10 rounded w-1/4" />
            </div>
          ) : profileError ? (
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Company not found</h1>
              <p className="text-indigo-200 text-sm">This company profile could not be loaded</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-indigo-200" />
                <p className="text-indigo-200 text-sm font-medium">Company Profile</p>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                {company?.name}
              </h1>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-sm text-indigo-200">
                  <Hash className="w-4 h-4" />
                  {slug}
                </span>
                {company?.job_count != null && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-white/15 backdrop-blur-sm text-white rounded-full">
                    <Briefcase className="w-3 h-3" />
                    {company.job_count} {company.job_count === 1 ? 'job' : 'jobs'}
                  </span>
                )}
                {(company?.avg_salary_min || company?.avg_salary_max) && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-500/20 backdrop-blur-sm text-emerald-200 rounded-full">
                    <DollarSign className="w-3 h-3" />
                    {fmt(company.avg_salary_min)} – {fmt(company.avg_salary_max)}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Jobs list */}
      <div className="max-w-3xl mx-auto px-4 -mt-6 pb-12">
        <button
          onClick={() => navigate('/companies')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Companies
        </button>

        {jobsLoading && (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
                <div className="flex gap-2 mb-3">
                  <div className="h-5 w-20 bg-slate-100 rounded-full" />
                  <div className="h-5 w-16 bg-slate-100 rounded-full" />
                </div>
                <div className="h-5 bg-slate-100 rounded w-2/3 mb-2" />
                <div className="h-4 bg-slate-50 rounded w-1/3 mb-3" />
                <div className="flex gap-2">
                  <div className="h-5 w-14 bg-slate-50 rounded-full" />
                  <div className="h-5 w-14 bg-slate-50 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!jobsLoading && (!jobsData?.jobs || jobsData.jobs.length === 0) && (
          <div className="text-center py-20">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-lg font-semibold text-slate-700">No jobs found for this company</p>
            <p className="text-sm text-slate-400 mt-1">Jobs may have expired or been removed</p>
          </div>
        )}

        {!jobsLoading && jobsData?.jobs && jobsData.jobs.length > 0 && (
          <>
            <p className="text-xs font-medium text-slate-400 mb-3 ml-1">
              {jobsData.total?.toLocaleString()} {jobsData.total === 1 ? 'job' : 'jobs'}
            </p>

            <div className="space-y-3">
              {jobsData.jobs.map(job => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl disabled:opacity-40 hover:border-indigo-300 hover:text-indigo-600 transition-colors bg-white"
                >
                  &larr; Prev
                </button>
                <span className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl disabled:opacity-40 hover:border-indigo-300 hover:text-indigo-600 transition-colors bg-white"
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
