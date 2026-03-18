import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { loginApi } from '@/api/auth'
import { apiHelper } from '@/api/apiHelper'
import { ERROR_MESSAGES } from '@/constants/errors'
import { loginSchema } from '@/lib/validation'
import Snackbar from '@/components/Snackbar'
import { Briefcase, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await loginSchema.validate(form, { abortEarly: false })
    } catch (validationErr) {
      setError(validationErr.errors[0])
      return
    }
    setLoading(true)
    const { data, error: err } = await apiHelper(() => loginApi(form))
    setLoading(false)
    if (err) {
      setError(ERROR_MESSAGES[err.code] || err.message || 'Login failed')
      return
    }
    login(data.access_token, data.user)
    const redirectTo = location.state?.from || '/dashboard'
    navigate(redirectTo)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">JobBoard</span>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <span className="text-sm font-medium text-white/80">AI-powered job matching</span>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Find your dream job faster than ever
          </h2>
          <p className="text-white/70 text-lg">
            Aggregated from 4 sources. Matched to your skills. Applied in one click.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {[['10k+', 'Live Jobs'], ['4', 'Job Sources'], ['AI', 'Matching']].map(([v, l]) => (
              <div key={l} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-2xl font-bold">{v}</p>
                <p className="text-white/70 text-sm">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/40 text-xs">© 2026 JobBoard</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">JobBoard</span>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-1">Welcome back</h1>
          <p className="text-slate-500 mb-8">Sign in to continue your job search</p>

          <Snackbar message={error} onClose={() => setError('')} />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
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
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-600 font-semibold hover:text-violet-600 transition-colors">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
