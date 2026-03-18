import { Bookmark, BookmarkCheck, ExternalLink, MapPin, Clock, DollarSign } from 'lucide-react'
import { useToggleSave } from '@/hooks/useJobs'
import { useAuth } from '@/contexts/AuthContext'

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function formatSalary(min, max) {
  if (!min && !max) return null
  const fmt = (n) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `${fmt(min)}+`
  if (max) return `up to ${fmt(max)}`
  return null
}

const SOURCE_STYLES = {
  remotive:   { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  remoteok:   { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  adzuna:     { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  themuse:    { bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' },
  arbeitnow:  { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  jobicy:     { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
}

const TAG_COLORS = [
  'bg-indigo-50 text-indigo-700 border-indigo-100',
  'bg-violet-50 text-violet-700 border-violet-100',
  'bg-blue-50 text-blue-700 border-blue-100',
  'bg-cyan-50 text-cyan-700 border-cyan-100',
  'bg-teal-50 text-teal-700 border-teal-100',
  'bg-purple-50 text-purple-700 border-purple-100',
]

export default function JobCard({ job }) {
  const { isAuthenticated } = useAuth()
  const { mutate: toggleSave, isPending } = useToggleSave()

  const salary = formatSalary(job.salary_min, job.salary_max)
  const source = SOURCE_STYLES[job.source] ?? { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50 hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${source.bg} ${source.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${source.dot}`} />
              {job.source}
            </span>
            {job.is_remote && (
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                🌍 Remote
              </span>
            )}
            <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full capitalize">
              {job.job_type}
            </span>
          </div>

          <h3 className="font-bold text-slate-900 text-base leading-snug">{job.title}</h3>
          <p className="text-sm font-medium text-indigo-600 mt-0.5">{job.company_name}</p>

          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {job.location && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="w-3 h-3" />
                {job.location}
              </span>
            )}
            {salary && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <DollarSign className="w-3 h-3" />
                {salary}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              {relativeTime(job.posted_at)}
            </span>
          </div>

          {job.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-3">
              {job.tags.slice(0, 6).map((tag, i) => (
                <span
                  key={tag}
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TAG_COLORS[i % TAG_COLORS.length]}`}
                >
                  {tag}
                </span>
              ))}
              {job.tags.length > 6 && (
                <span className="text-xs text-slate-400 px-1">+{job.tags.length - 6}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {isAuthenticated && (
            <button
              onClick={() => toggleSave({ id: job.id, isSaved: !!job.is_saved })}
              disabled={isPending}
              className="p-2 rounded-xl hover:bg-indigo-50 transition-colors disabled:opacity-50 group"
              title={job.is_saved ? 'Unsave' : 'Save job'}
            >
              {job.is_saved
                ? <BookmarkCheck className="w-4 h-4 text-indigo-600" />
                : <Bookmark className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
              }
            </button>
          )}
          <a
            href={job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-500 hover:to-violet-500 transition-all shadow-sm shadow-indigo-200"
          >
            Apply <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
