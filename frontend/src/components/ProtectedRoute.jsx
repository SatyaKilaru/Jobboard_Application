import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
    </div>
  )
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}
