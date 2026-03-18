import { useState, useCallback } from 'react'
import { Search, SlidersHorizontal, X, Briefcase, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import JobCard from '@/components/JobCard'
import { useJobs } from '@/hooks/useJobs'
import { useAuth } from '@/contexts/AuthContext'

export default function JobsPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [filters, setFilters] = useState({ page: 1, limit: 20 })
  const [inputQ, setInputQ] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading, isError } = useJobs(filters)

  const applySearch = useCallback(() => {
    setFilters(f => ({ ...f, q: inputQ || undefined, page: 1 }))
  }, [inputQ])

  const setFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: value || undefined, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({ page: 1, limit: 20 })
    setInputQ('')
  }

  const hasActiveFilters = filters.q || filters.remote || filters.job_type || filters.location || filters.salary_min
  const totalPages = Math.ceil((data?.total ?? 0) / (filters.limit ?? 20))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
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

      {/* Hero search */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 pt-10 pb-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🚀</span>
            <p className="text-indigo-200 text-sm font-medium">
              {data ? `${data.total.toLocaleString()} live jobs` : 'Loading jobs...'}
            </p>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Find your next opportunity
          </h1>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-xl shadow-indigo-900/20">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Role, company, keyword..."
                value={inputQ}
                onChange={e => setInputQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applySearch()}
                className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-400"
              />
              {inputQ && (
                <button onClick={() => { setInputQ(''); setFilter('q', '') }}>
                  <X className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                </button>
              )}
            </div>
            <button
              onClick={applySearch}
              className="px-5 py-3 bg-white text-indigo-700 text-sm font-semibold rounded-2xl hover:bg-indigo-50 transition-colors shadow-xl shadow-indigo-900/20"
            >
              Search
            </button>
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`px-4 py-3 rounded-2xl text-sm font-semibold transition-all shadow-xl shadow-indigo-900/20 ${
                showFilters
                  ? 'bg-indigo-900 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          {showFilters && (
            <div className="flex gap-3 mt-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm cursor-pointer bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white px-3 py-2 rounded-xl transition-colors">
                <input
                  type="checkbox"
                  checked={!!filters.remote}
                  onChange={e => setFilter('remote', e.target.checked)}
                  className="rounded accent-indigo-400"
                />
                🌍 Remote only
              </label>
              <select
                value={filters.job_type || ''}
                onChange={e => setFilter('job_type', e.target.value)}
                className="text-sm bg-white/15 backdrop-blur-sm text-white border-0 rounded-xl px-3 py-2 outline-none appearance-none cursor-pointer hover:bg-white/25 transition-colors"
              >
                <option value="" className="text-slate-900 bg-white">All types</option>
                <option value="full-time" className="text-slate-900 bg-white">Full-time</option>
                <option value="part-time" className="text-slate-900 bg-white">Part-time</option>
                <option value="contract" className="text-slate-900 bg-white">Contract</option>
                <option value="internship" className="text-slate-900 bg-white">Internship</option>
              </select>
              <input
                type="number"
                placeholder="Min salary ($)"
                value={filters.salary_min || ''}
                onChange={e => setFilter('salary_min', e.target.value ? Number(e.target.value) : undefined)}
                className="text-sm bg-white/15 backdrop-blur-sm text-white border-0 rounded-xl px-3 py-2 w-36 outline-none placeholder:text-white/60 hover:bg-white/25 transition-colors"
              />
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-sm text-red-300 hover:text-red-200 bg-red-500/20 px-3 py-2 rounded-xl transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-3xl mx-auto px-4 -mt-6 pb-12">
        {hasActiveFilters && (
          <div className="flex gap-2 flex-wrap mb-4">
            {filters.q && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-indigo-600 text-white rounded-full">
                "{filters.q}"
                <button onClick={() => { setFilter('q', ''); setInputQ('') }}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.remote && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-emerald-600 text-white rounded-full">
                Remote
                <button onClick={() => setFilter('remote', false)}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.job_type && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-violet-600 text-white rounded-full capitalize">
                {filters.job_type}
                <button onClick={() => setFilter('job_type', '')}><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}

        {isLoading && (
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
                  <div className="h-5 w-14 bg-slate-50 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-lg font-semibold text-slate-700">Failed to load jobs</p>
            <p className="text-sm text-slate-400 mt-1">Make sure the jobs service is running on :8082</p>
          </div>
        )}

        {!isLoading && !isError && data?.jobs.length === 0 && (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-lg font-semibold text-slate-700">No jobs found</p>
            <p className="text-sm text-slate-400 mt-1">Try different keywords or clear your filters</p>
          </div>
        )}

        {!isLoading && data && data.jobs.length > 0 && (
          <>
            <p className="text-xs font-medium text-slate-400 mb-3 ml-1">
              {data.total.toLocaleString()} results
              {filters.q && <span> for <strong className="text-slate-600">"{filters.q}"</strong></span>}
            </p>

            <div className="space-y-3">
              {data.jobs.map(job => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) - 1 }))}
                  disabled={(filters.page ?? 1) <= 1}
                  className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl disabled:opacity-40 hover:border-indigo-300 hover:text-indigo-600 transition-colors bg-white"
                >
                  ← Prev
                </button>
                <span className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl">
                  {filters.page ?? 1} / {totalPages}
                </span>
                <button
                  onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))}
                  disabled={(filters.page ?? 1) >= totalPages}
                  className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl disabled:opacity-40 hover:border-indigo-300 hover:text-indigo-600 transition-colors bg-white"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
