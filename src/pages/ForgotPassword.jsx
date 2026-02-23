import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Beaker, Mail, ArrowLeft, Send } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const { resetPassword } = useAuth()

    async function handleSubmit(e) {
        e.preventDefault()
        if (!email) return toast.error('Please enter your email address.')
        setLoading(true)
        try {
            await resetPassword(email)
            setSent(true)
        } catch (err) {
            toast.error('Failed to send reset email. Check that your email is correct.')
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
                </div>

                {sent ? (
                    <div className="auth-form" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: '1rem' }}>📬</div>
                        <h2 className="auth-heading">Check your email</h2>
                        <p className="auth-desc" style={{ marginBottom: '1.5rem' }}>
                            We sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the link.
                        </p>
                        <Link to="/login" className="btn btn-primary w-full" style={{ height: 48, display: 'flex', justifyContent: 'center' }}>
                            <ArrowLeft size={18} /> Back to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="auth-form">
                        <h2 className="auth-heading">Reset your password</h2>
                        <p className="auth-desc">Enter your email and we'll send you a reset link.</p>

                        <div className="form-group">
                            <label className="form-label"><Mail size={14} /> Email address</label>
                            <input className="form-input" type="email" placeholder="you@example.com"
                                value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>

                        <button className="btn btn-primary w-full" type="submit" disabled={loading}
                            style={{ marginTop: '0.5rem', height: 48 }}>
                            {loading ? <span className="spinner-sm" /> : <Send size={18} />}
                            {loading ? 'Sending…' : 'Send Reset Link'}
                        </button>
                    </form>
                )}

                <p className="auth-footer">
                    <Link to="/login" className="auth-link">
                        <ArrowLeft size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Back to Login
                    </Link>
                </p>
            </div>
        </div>
    )
}
