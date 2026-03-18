import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Briefcase, TrendingUp, BarChart3, Trophy, DollarSign, MapPin, ExternalLink } from 'lucide-react'
import { useSalaryInsights, useSalaryBySource, useTopPayingJobs } from '@/hooks/useInsights'
import { useAuth } from '@/contexts/AuthContext'

const fmt = (n) => n ? `$${Math.round(n / 1000)}k` : '\u2014'

const JOB_TYPE_COLORS = {
  'full-time':  { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', accent: 'from-indigo-500 to-indigo-600' },
  'contract':   { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', accent: 'from-emerald-500 to-emerald-600' },
  'part-time':  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', accent: 'from-amber-500 to-amber-600' },
  'internship': { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', accent: 'from-violet-500 to-violet-600' },
}

const SOURCE_STYLES = {
  remotive:   { bg: 'bg-violet-100', text: 'text-violet-700', bar: 'from-violet-500 to-violet-600' },
  remoteok:   { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'from-emerald-500 to-emerald-600' },
  adzuna:     { bg: 'bg-blue-100', text: 'text-blue-700', bar: 'from-blue-500 to-blue-600' },
  themuse:    { bg: 'bg-pink-100', text: 'text-pink-700', bar: 'from-pink-500 to-pink-600' },
  arbeitnow:  { bg: 'bg-cyan-100', text: 'text-cyan-700', bar: 'from-cyan-500 to-cyan-600' },
  jobicy:     { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'from-amber-500 to-amber-600' },
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
      <div className="h-5 w-24 bg-slate-100 rounded-full mb-3" />
      <div className="h-6 bg-slate-100 rounded w-2/3 mb-2" />
      <div className="h-4 bg-slate-50 rounded w-1/2 mb-2" />
      <div className="h-4 bg-slate-50 rounded w-1/3" />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse flex items-center gap-4">
      <div className="h-5 w-8 bg-slate-100 rounded" />
      <div className="flex-1">
        <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" />
        <div className="h-3 bg-slate-50 rounded w-1/3" />
      </div>
      <div className="h-5 w-24 bg-slate-100 rounded" />
    </div>
  )
}

export default function SalaryInsightsPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { data: insights, isLoading: insightsLoading } = useSalaryInsights()
  const { data: sources, isLoading: sourcesLoading } = useSalaryBySource()
  const { data: topJobs, isLoading: topLoading } = useTopPayingJobs(20)

  const totalListings = insights?.reduce((sum, i) => sum + (i.count || 0), 0) || 0
  const totalSources = sources?.length || 0

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
            <TrendingUp className="w-5 h-5 text-indigo-200" />
            <p className="text-indigo-200 text-sm font-medium">Market Intelligence</p>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Salary Insights
          </h1>
          <p className="text-indigo-200 text-sm">
            Real salary data from {totalListings.toLocaleString()} job listings across {totalSources} platforms
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-6 pb-12 space-y-10">

        {/* Section 1: Salary by Job Type */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Salary by Job Type</h2>
          </div>

          {insightsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : !insights || insights.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">No salary data available yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {insights.map((item) => {
                const colors = JOB_TYPE_COLORS[item.job_type] || JOB_TYPE_COLORS['full-time']
                return (
                  <div key={item.job_type} className={`${colors.bg} border ${colors.border} rounded-2xl p-5 hover:shadow-md transition-all`}>
                    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r ${colors.accent} text-white mb-3`}>
                      {item.job_type}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Avg Range</p>
                        <p className={`text-lg font-bold ${colors.text}`}>
                          {fmt(item.avg_min)} – {fmt(item.avg_max)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Median Range</p>
                        <p className={`text-sm font-semibold ${colors.text}`}>
                          {fmt(item.median_min)} – {fmt(item.median_max)}
                        </p>
                      </div>
                      <div className="pt-1 border-t border-slate-200/60">
                        <p className="text-xs text-slate-500">
                          <span className="font-semibold">{item.count?.toLocaleString()}</span> listings
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Section 2: Salary by Source */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-violet-600" />
            <h2 className="text-lg font-bold text-slate-800">Salary by Source</h2>
          </div>

          {sourcesLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : !sources || sources.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">No source data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((src) => {
                const style = SOURCE_STYLES[src.source] || { bg: 'bg-slate-100', text: 'text-slate-700', bar: 'from-slate-400 to-slate-500' }
                const maxSalary = Math.max(...sources.map(s => s.avg_max || 0))
                const barWidth = maxSalary > 0 ? Math.max(((src.avg_max || 0) / maxSalary) * 100, 8) : 8

                return (
                  <div key={src.source} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
                        {src.source}
                      </span>
                      <span className="text-sm font-bold text-slate-700">
                        {fmt(src.avg_min)} – {fmt(src.avg_max)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${style.bar} rounded-full transition-all duration-500`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      <span className="font-semibold">{src.count?.toLocaleString()}</span> listings with salary data
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Section 3: Top Paying Jobs */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-800">Top 20 Highest-Paying Jobs</h2>
          </div>

          {topLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : !topJobs || topJobs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">No top-paying jobs data available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topJobs.map((job, index) => {
                const sourceStyle = SOURCE_STYLES[job.source] || { bg: 'bg-slate-100', text: 'text-slate-600' }
                return (
                  <div key={job.id || index} className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all flex items-center gap-4">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                      index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white' :
                      index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {index + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{job.title}</h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs font-medium text-indigo-600">{job.company_name}</p>
                        {job.location && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sourceStyle.bg} ${sourceStyle.text}`}>
                        {job.source}
                      </span>
                      <span className="text-sm font-bold text-emerald-600">
                        {fmt(job.salary_min)} – {fmt(job.salary_max)}
                      </span>
                      {job.source_url && (
                        <a
                          href={job.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-500 hover:to-violet-500 transition-all shadow-sm shadow-indigo-200"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
