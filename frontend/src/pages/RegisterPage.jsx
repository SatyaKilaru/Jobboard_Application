import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { registerApi } from '@/api/auth'
import { apiHelper } from '@/api/apiHelper'
import { ERROR_MESSAGES } from '@/constants/errors'
import { registerSchema } from '@/lib/validation'
import Snackbar from '@/components/Snackbar'
import { Briefcase, CheckCircle2 } from 'lucide-react'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await registerSchema.validate(form, { abortEarly: false })
    } catch (validationErr) {
      setError(validationErr.errors[0])
      return
    }
    setLoading(true)
    const { data, error: err } = await apiHelper(() => registerApi(form))
    setLoading(false)
    if (err) {
      setError(ERROR_MESSAGES[err.code] || err.message || 'Registration failed')
      return
    }
    login(data.access_token, data.user)
    navigate('/dashboard')
  }

  const perks = [
    'Jobs from Remotive, RemoteOK, Adzuna & HackerNews',
    'AI-powered skill matching (coming soon)',
    'Kanban application tracker',
    'Salary insights & trends',
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left — brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">JobBoard</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Everything you need to land your next role
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Create your free account and start applying in minutes.
          </p>
          <div className="space-y-3">
            {perks.map(p => (
              <div key={p} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-300 shrink-0" />
                <span className="text-white/85 text-sm">{p}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/40 text-xs">© 2026 JobBoard · Free forever</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">JobBoard</span>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-1">Create account</h1>
          <p className="text-slate-500 mb-8">Free forever — no credit card needed</p>

          <Snackbar message={error} onClose={() => setError('')} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition shadow-sm"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition shadow-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition shadow-sm"
                placeholder="Min. 8 characters"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold rounded-xl hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-200 mt-2"
            >
              {loading ? 'Creating account...' : 'Create free account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-600 font-semibold hover:text-fuchsia-600 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
