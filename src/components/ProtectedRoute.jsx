import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute — wraps routes needing auth.
 *
 * Props:
 *   allowedRoles?: string[] — if provided, only these roles can access
 *   redirectTo?: string     — where to send unauthorized users (default '/')
 */
export default function ProtectedRoute({ children, allowedRoles, redirectTo = '/login' }) {
    const { user, loading } = useAuth()

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <div className="spinner" />
        </div>
    )

    if (!user) return <Navigate to={redirectTo} replace />

    if (allowedRoles && !allowedRoles.includes(user.role))
        return <Navigate to="/unauthorized" replace />

    return children
}
