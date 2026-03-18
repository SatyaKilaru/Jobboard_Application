import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600" />
      <p className="text-slate-500 text-sm animate-pulse">Loading your session...</p>
    </div>
  )

  if (!isAuthenticated) return (
    <Navigate to="/login" state={{ from: location.pathname }} replace />
  )

  return <>{children}</>
}
