import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { warmupServices } from '@/lib/warmup'
import ProtectedRoute from '@/components/ProtectedRoute'
import ErrorBoundary from '@/components/ErrorBoundary'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import JobsPage from '@/pages/JobsPage'
import ApplicationsPage from '@/pages/ApplicationsPage'
import SalaryInsightsPage from '@/pages/SalaryInsightsPage'
import CompaniesPage from '@/pages/CompaniesPage'
import CompanyDetailPage from '@/pages/CompanyDetailPage'

const queryClient = new QueryClient()

export default function App() {
  useEffect(() => { warmupServices() }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/insights" element={<SalaryInsightsPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/companies/:slug" element={<CompanyDetailPage />} />
            <Route path="/applications" element={
              <ProtectedRoute>
                <ApplicationsPage />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
