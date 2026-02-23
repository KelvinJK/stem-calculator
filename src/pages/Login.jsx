import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Beaker, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    async function handleSubmit(e) {
        e.preventDefault()
        if (!email || !password) return toast.error('Please fill in all fields.')
        setLoading(true)
        try {
            await login(email, password)
            navigate('/')
        } catch (err) {
            const msg = err.code === 'auth/invalid-credential'
                ? 'Invalid email or password.'
                : err.code === 'auth/user-not-found'
                    ? 'No account found with this email.'
                    : 'Login failed. Please try again.'
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="sidebar-logo" style={{ width: 52, height: 52, borderRadius: 16 }}>
                        <Beaker size={26} color="white" />
                    </div>
                    <h1 className="auth-title">STEM Sessions</h1>
                    <p className="auth-subtitle">Cost Calculator Platform</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <h2 className="auth-heading">Welcome back</h2>
                    <p className="auth-desc">Sign in to your account to continue</p>

                    <div className="form-group">
                        <label className="form-label"><Mail size={14} /> Email address</label>
                        <input
                            className="form-input"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label"><Lock size={14} /> Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="form-input"
                                type={showPw ? 'text' : 'password'}
                                placeholder="Enter your password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                style={{ paddingRight: '2.75rem' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(s => !s)}
                                style={{
                                    position: 'absolute', right: '0.75rem', top: '50%',
                                    transform: 'translateY(-50%)', background: 'none',
                                    border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                                    display: 'flex', alignItems: 'center',
                                }}
                            >
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right', marginTop: '-0.25rem' }}>
                        <Link to="/forgot-password" className="auth-link" style={{ fontSize: '0.8rem' }}>
                            Forgot password?
                        </Link>
                    </div>

                    <button className="btn btn-primary w-full" type="submit" disabled={loading}
                        style={{ marginTop: '0.5rem', height: 48, fontSize: '0.95rem' }}>
                        {loading ? <span className="spinner-sm" /> : <LogIn size={18} />}
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                <p className="auth-footer">
                    Don't have an account?{' '}
                    <Link to="/signup" className="auth-link">Create one</Link>
                </p>
            </div>
        </div>
    )
}
