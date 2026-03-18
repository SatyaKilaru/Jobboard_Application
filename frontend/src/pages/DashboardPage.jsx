import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSavedJobs } from '@/hooks/useJobs'
import { useApplicationStats } from '@/hooks/useApplications'
import { Briefcase, BookmarkCheck, Kanban, Sparkles, ArrowRight, LogOut } from 'lucide-react'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { data: savedJobs } = useSavedJobs()
  const { data: appStats } = useApplicationStats()
  const totalApplications = appStats
    ? Object.values(appStats).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0)
    : 0

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const firstName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              JobBoard
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/jobs')}
              className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
            >
              Browse Jobs
            </button>
            <button
              onClick={() => navigate('/applications')}
              className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
            >
              Applications
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
              {firstName[0].toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Hero banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-indigo-200 text-sm font-medium mb-1">Good to see you back 👋</p>
          <h1 className="text-4xl font-bold mb-2">Hello, {firstName}!</h1>
          <p className="text-indigo-200 mb-6">Ready to find your next opportunity?</p>
          <button
            onClick={() => navigate('/jobs')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 text-sm font-semibold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg"
          >
            Browse all jobs <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Saved jobs */}
          <button
            onClick={() => navigate('/jobs')}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-left hover:shadow-md hover:-translate-y-0.5 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                <BookmarkCheck className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{savedJobs?.length ?? 0}</p>
            <p className="text-sm font-medium text-slate-500 mt-0.5">Saved Jobs</p>
          </button>

          {/* Applications */}
          <button
            onClick={() => navigate('/applications')}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-left hover:shadow-md hover:-translate-y-0.5 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                <Kanban className="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalApplications}</p>
            <p className="text-sm font-medium text-slate-500 mt-0.5">Applications</p>
          </button>

          {/* AI Match */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Last Phase</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">—</p>
            <p className="text-sm font-medium text-slate-500 mt-0.5">AI Match Score</p>
          </div>
        </div>

        {/* Roadmap */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Build Progress</h2>
          <div className="flex gap-3 flex-wrap">
            {[
              { label: 'Auth', done: true },
              { label: 'Jobs & Scraping', done: true },
              { label: 'Applications', done: true },
              { label: 'Salary Insights', done: false },
              { label: 'AI Matching', done: false },
            ].map(step => (
              <div
                key={step.label}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                  step.done
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                {step.done ? '✓' : '○'} {step.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
