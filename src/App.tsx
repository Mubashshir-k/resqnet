import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import { requestBrowserNotificationPermission } from './utils/notifications'
import { useUIStore } from './store/uiStore'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import ReportFormPage from './pages/ReportFormPage'
import MapViewPage from './pages/MapViewPage'
import MyReportsPage from './pages/MyReportsPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import LoadingSpinner from './components/LoadingSpinner'

function ProtectedRoute({ children, requiredRoles }: { children: React.ReactNode; requiredRoles?: string[] }) {
  const { user, loading } = useAuthStore()

  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (requiredRoles && !requiredRoles.includes(user.role)) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}

export default function App() {
  const { user, loading, checkAuth } = useAuthStore()
  const darkMode = useUIStore((s) => s.darkMode)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])


  useEffect(() => {
    requestBrowserNotificationPermission()
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  if (loading) return <LoadingSpinner />

  return (
    <BrowserRouter>
      <Toaster 
        position="top-center" 
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
            fontFamily: 'inherit'
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }} 
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <ReportFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <MapViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-reports"
          element={
            <ProtectedRoute>
              <MyReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRoles={['admin']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
