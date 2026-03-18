import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Briefcase, Plus, X, ChevronDown, Trash2, StickyNote,
  Building2, CalendarDays, GripVertical, Inbox
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useApplications, useApplicationStats, useCreateApplication, useUpdateStatus, useUpdateNotes, useDeleteApplication } from '@/hooks/useApplications'

const COLUMNS = [
  { key: 'wishlist', label: 'Wishlist', color: 'violet', bg: 'from-violet-500 to-purple-600', badge: 'bg-violet-100 text-violet-700 border-violet-200', headerBg: 'bg-violet-50', accent: 'border-violet-300' },
  { key: 'applied', label: 'Applied', color: 'indigo', bg: 'from-blue-500 to-indigo-600', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200', headerBg: 'bg-indigo-50', accent: 'border-indigo-300' },
  { key: 'interview', label: 'Interview', color: 'amber', bg: 'from-amber-400 to-yellow-500', badge: 'bg-amber-100 text-amber-700 border-amber-200', headerBg: 'bg-amber-50', accent: 'border-amber-300' },
  { key: 'offer', label: 'Offer', color: 'emerald', bg: 'from-emerald-500 to-green-600', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', headerBg: 'bg-emerald-50', accent: 'border-emerald-300' },
  { key: 'rejected', label: 'Rejected', color: 'rose', bg: 'from-rose-500 to-red-600', badge: 'bg-rose-100 text-rose-700 border-rose-200', headerBg: 'bg-rose-50', accent: 'border-rose-300' },
  { key: 'withdrawn', label: 'Withdrawn', color: 'slate', bg: 'from-slate-400 to-slate-500', badge: 'bg-slate-100 text-slate-600 border-slate-200', headerBg: 'bg-slate-50', accent: 'border-slate-300' },
]

function AddApplicationForm({ onClose }) {
  const createApp = useCreateApplication()
  const [form, setForm] = useState({ company: '', job_title: '', status: 'wishlist', notes: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.company.trim() || !form.job_title.trim()) return
    createApp.mutate(form, { onSuccess: () => onClose() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Add Application</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company *</label>
            <input
              type="text"
              value={form.company}
              onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
              placeholder="e.g. Google"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Job Title *</label>
            <input
              type="text"
              value={form.job_title}
              onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))}
              placeholder="e.g. Senior Software Engineer"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none bg-white"
            >
              {COLUMNS.map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any notes about this application..."
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createApp.isPending}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200"
            >
              {createApp.isPending ? 'Adding...' : 'Add Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ApplicationCard({ app }) {
  const updateStatus = useUpdateStatus()
  const updateNotes = useUpdateNotes()
  const deleteApp = useDeleteApplication()
  const [showNotes, setShowNotes] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(app.notes || '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleStatusChange = (newStatus) => {
    updateStatus.mutate({ id: app.id, status: newStatus })
  }

  const handleSaveNotes = () => {
    updateNotes.mutate({ id: app.id, notes: notesValue })
    setEditingNotes(false)
  }

  const handleDelete = () => {
    if (confirmDelete) {
      deleteApp.mutate(app.id)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  const appliedDate = app.applied_date || app.created_at
  const formattedDate = appliedDate
    ? new Date(appliedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5 transition-all group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-slate-900 truncate">{app.job_title}</h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
            <p className="text-xs font-medium text-slate-500 truncate">{app.company}</p>
          </div>
        </div>
        <div className="relative shrink-0">
          <select
            value={app.status}
            onChange={e => handleStatusChange(e.target.value)}
            disabled={updateStatus.isPending}
            className="text-xs font-medium border border-slate-200 rounded-lg px-2 py-1 outline-none bg-white hover:border-indigo-300 transition-colors cursor-pointer appearance-none pr-6"
          >
            {COLUMNS.map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {formattedDate && (
        <div className="flex items-center gap-1.5 mb-2">
          <CalendarDays className="w-3 h-3 text-slate-300" />
          <span className="text-xs text-slate-400">{formattedDate}</span>
        </div>
      )}

      {app.notes && !showNotes && (
        <button
          onClick={() => setShowNotes(true)}
          className="text-xs text-indigo-500 hover:text-indigo-700 font-medium mb-2 flex items-center gap-1 transition-colors"
        >
          <StickyNote className="w-3 h-3" /> Show notes
        </button>
      )}

      {showNotes && (
        <div className="mb-2">
          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notesValue}
                onChange={e => setNotesValue(e.target.value)}
                rows={3}
                className="w-full px-2.5 py-2 border border-indigo-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNotes}
                  disabled={updateNotes.isPending}
                  className="text-xs font-medium text-white bg-indigo-600 px-3 py-1 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditingNotes(false); setNotesValue(app.notes || '') }}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 leading-relaxed">{app.notes}</p>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowNotes(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
                >
                  Hide
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!app.notes && showNotes && (
        <div className="mb-2">
          <textarea
            value={notesValue}
            onChange={e => setNotesValue(e.target.value)}
            rows={2}
            placeholder="Add notes..."
            className="w-full px-2.5 py-2 border border-indigo-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleSaveNotes}
              disabled={updateNotes.isPending}
              className="text-xs font-medium text-white bg-indigo-600 px-3 py-1 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setShowNotes(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
        {!showNotes && (
          <button
            onClick={() => { setShowNotes(true); if (!app.notes) setEditingNotes(true) }}
            className="text-xs text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-1"
          >
            <StickyNote className="w-3 h-3" />
            {app.notes ? 'Notes' : 'Add note'}
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={handleDelete}
          disabled={deleteApp.isPending}
          className={`text-xs flex items-center gap-1 transition-colors ${
            confirmDelete
              ? 'text-red-600 font-semibold'
              : 'text-slate-300 hover:text-red-500'
          }`}
        >
          <Trash2 className="w-3 h-3" />
          {confirmDelete ? 'Confirm?' : ''}
        </button>
      </div>
    </div>
  )
}

function KanbanColumn({ column, applications }) {
  const items = applications?.filter(a => a.status === column.key) || []

  return (
    <div className="min-w-[280px] w-[280px] flex flex-col bg-slate-50/80 rounded-2xl border border-slate-200 overflow-hidden shrink-0">
      {/* Column header */}
      <div className={`bg-gradient-to-r ${column.bg} px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="w-3.5 h-3.5 text-white/50" />
            <h3 className="text-sm font-bold text-white">{column.label}</h3>
          </div>
          <span className="text-xs font-bold text-white bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
            {items.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)]">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Inbox className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs text-slate-400 font-medium">No applications</p>
            <p className="text-xs text-slate-300 mt-0.5">Cards will appear here</p>
          </div>
        )}
        {items.map(app => (
          <ApplicationCard key={app.id} app={app} />
        ))}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex gap-5 overflow-x-auto pb-4 px-4 sm:px-6 lg:px-8">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="min-w-[280px] w-[280px] shrink-0 bg-slate-50/80 rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
          <div className="h-12 bg-slate-200" />
          <div className="p-3 space-y-3">
            {[...Array(2)].map((_, j) => (
              <div key={j} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-50 rounded w-1/2 mb-3" />
                <div className="h-3 bg-slate-50 rounded w-1/3" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ApplicationsPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { data: applications, isLoading, isError } = useApplications()
  const { data: stats } = useApplicationStats()
  const [showAddForm, setShowAddForm] = useState(false)

  const totalApps = stats
    ? Object.values(stats).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0)
    : applications?.length ?? 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/jobs')}
              className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
            >
              Browse Jobs
            </button>
            {isAuthenticated && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                {(user?.full_name?.[0] || user?.email?.[0] || '?').toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 pt-10 pb-16">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">📋</span>
            <p className="text-indigo-200 text-sm font-medium">
              {totalApps} application{totalApps !== 1 ? 's' : ''} tracked
            </p>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Application Tracker
          </h1>
          <p className="text-indigo-200 text-sm mb-6">
            Track your job applications across every stage of the process.
          </p>

          {/* Stats bar */}
          <div className="flex gap-3 flex-wrap mb-6">
            {COLUMNS.map(col => {
              const count = stats?.[col.key] ?? applications?.filter(a => a.status === col.key).length ?? 0
              return (
                <div key={col.key} className="flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-xs font-medium">
                  <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${col.bg}`} />
                  {col.label}: {count}
                </div>
              )
            })}
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 text-sm font-semibold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-900/20"
          >
            <Plus className="w-4 h-4" /> Add Application
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="max-w-full mx-auto -mt-6 pb-12">
        {isLoading && <LoadingSkeleton />}

        {isError && (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">&#9888;&#65039;</div>
            <p className="text-lg font-semibold text-slate-700">Failed to load applications</p>
            <p className="text-sm text-slate-400 mt-1">Make sure the applications service is running</p>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="flex gap-5 overflow-x-auto pb-4 px-4 sm:px-6 lg:px-8">
            {COLUMNS.map(col => (
              <KanbanColumn key={col.key} column={col} applications={applications || []} />
            ))}
          </div>
        )}
      </div>

      {/* Add form modal */}
      {showAddForm && <AddApplicationForm onClose={() => setShowAddForm(false)} />}
    </div>
  )
}
