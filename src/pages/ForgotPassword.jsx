import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../utils/api'
import toast from 'react-hot-toast'
import { BookOpen, Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [sent, setSent] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true)
        try {
            await authApi.forgotPassword({ email })
            setSent(true)
        } catch (err) { toast.error(err.message) }
        finally { setLoading(false) }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo"><BookOpen size={28} color="white" /></div>
                <h1 className="auth-title">Reset Password</h1>
                <p className="auth-sub">
                    {sent ? 'Check your inbox for a reset link.' : 'Enter your email to receive a password reset link.'}
                </p>

                {!sent && (
                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label className="form-label"><Mail size={13} /> Email Address</label>
                            <input className="form-input" type="email" value={email}
                                onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                        </div>
                        <button className="btn btn-primary w-full" disabled={loading}>
                            {loading ? 'Sending…' : 'Send Reset Link'}
                        </button>
                    </form>
                )}

                {sent && (
                    <p style={{ color: 'var(--success)', fontWeight: 600, marginTop: '1rem' }}>
                        ✅ If that email exists, a reset link has been sent.
                    </p>
                )}

                <div className="auth-links">
                    <Link to="/login"><ArrowLeft size={12} /> Back to Sign In</Link>
                </div>
            </div>
        </div>
    )
}
