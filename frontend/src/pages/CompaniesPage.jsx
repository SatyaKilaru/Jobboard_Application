import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Briefcase, Building2, DollarSign, ChevronRight } from 'lucide-react'
import { useCompanies } from '@/hooks/useInsights'
import { useAuth } from '@/contexts/AuthContext'

const fmt = (n) => n ? `$${Math.round(n / 1000)}k` : '\u2014'

const BORDER_COLORS = [
  'border-l-indigo-500',
  'border-l-violet-500',
  'border-l-emerald-500',
  'border-l-pink-500',
  'border-l-cyan-500',
  'border-l-amber-500',
  'border-l-blue-500',
  'border-l-purple-500',
  'border-l-teal-500',
]

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 border-l-4 border-l-slate-200 rounded-2xl p-5 animate-pulse">
      <div className="h-6 bg-slate-100 rounded w-2/3 mb-3" />
      <div className="h-4 bg-slate-50 rounded w-1/3 mb-2" />
      <div className="h-4 bg-slate-50 rounded w-1/2" />
    </div>
  )
}

export default function CompaniesPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useCompanies(page)

  const totalPages = data ? Math.ceil((data.total ?? 0) / 20) : 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/jobs')}
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
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-indigo-200" />
            <p className="text-indigo-200 text-sm font-medium">Company Directory</p>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Companies
          </h1>
          <p className="text-indigo-200 text-sm">
            Explore companies hiring remotely and discover your next employer
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-6 pb-12">
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {isError && (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">&#9888;&#65039;</div>
            <p className="text-lg font-semibold text-slate-700">Failed to load companies</p>
            <p className="text-sm text-slate-400 mt-1">Please try again later</p>
          </div>
        )}

        {!isLoading && !isError && (!data?.companies || data.companies.length === 0) && (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-lg font-semibold text-slate-700">No companies found</p>
            <p className="text-sm text-slate-400 mt-1">Company profiles will appear as jobs are collected</p>
          </div>
        )}

        {!isLoading && data?.companies && data.companies.length > 0 && (
          <>
            <p className="text-xs font-medium text-slate-400 mb-4 ml-1">
              {data.total?.toLocaleString()} companies
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.companies.map((company, idx) => (
                <Link
                  key={company.slug || company.name}
                  to={`/companies/${company.slug}`}
                  className={`bg-white border border-slate-200 border-l-4 ${BORDER_COLORS[idx % BORDER_COLORS.length]} rounded-2xl p-5 hover:shadow-md hover:shadow-indigo-50 hover:-translate-y-0.5 transition-all group`}
                >
                  <div className="flex items-start justify-between">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {company.name}
                    </h3>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 shrink-0 mt-1 transition-colors" />
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                      <Briefcase className="w-3 h-3" />
                      {company.job_count} {company.job_count === 1 ? 'job' : 'jobs'}
                    </span>
                    {(company.avg_salary_min || company.avg_salary_max) && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <DollarSign className="w-3 h-3" />
                        {fmt(company.avg_salary_min)} – {fmt(company.avg_salary_max)}
                      </span>
                    )}
                  </div>
                </Link>
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
