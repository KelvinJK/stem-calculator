import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

// Pages
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import AdminDashboard from './pages/AdminDashboard'
import MaterialLibrary from './pages/MaterialLibrary'
import ActivityEditor from './pages/ActivityEditor'
import QuotationBuilder from './pages/QuotationBuilder'
import MyQuotes from './pages/MyQuotes'

function Unauthorized() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ color: 'var(--text-primary)' }}>403 — Access Denied</h2>
      <p style={{ color: 'var(--text-muted)' }}>You don't have permission to view this page.</p>
    </div>
  )
}

function PageNotFound() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ color: 'var(--text-primary)' }}>404 — Page Not Found</h2>
    </div>
  )
}

// Wrap authenticated pages with sidebar Layout
function AppLayout({ children, allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        <Routes>
          {/* Public auth pages — no sidebar */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Authenticated pages — all wrapped in sidebar Layout */}
          <Route path="/" element={
            <AppLayout><MyQuotes /></AppLayout>
          } />
          <Route path="/sessions" element={
            <AppLayout><MyQuotes /></AppLayout>
          } />
          <Route path="/quotation/new" element={
            <AppLayout><QuotationBuilder /></AppLayout>
          } />
          <Route path="/quotation/:id" element={
            <AppLayout><QuotationBuilder /></AppLayout>
          } />
          <Route path="/materials" element={
            <AppLayout><MaterialLibrary /></AppLayout>
          } />
          <Route path="/activities" element={
            <AppLayout><MaterialLibrary /></AppLayout>
          } />
          <Route path="/activities/new" element={
            <AppLayout allowedRoles={['admin', 'curator']}><ActivityEditor /></AppLayout>
          } />
          <Route path="/activities/:id/edit" element={
            <AppLayout allowedRoles={['admin', 'curator']}><ActivityEditor /></AppLayout>
          } />

          {/* Admin only */}
          <Route path="/admin" element={
            <AppLayout allowedRoles={['admin']}><AdminDashboard /></AppLayout>
          } />

          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
