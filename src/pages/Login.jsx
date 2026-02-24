import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { BookOpen, Mail, Lock, LogIn } from 'lucide-react'

export default function Login() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [form, setForm] = useState({ email: '', password: '' })
    const [loading, setLoading] = useState(false)

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true)
        try {
            const user = await login(form.email, form.password)
            toast.success(`Welcome back, ${user.name}!`)
            navigate('/')
        } catch (err) {
            toast.error(err.message || 'Login failed')
        } finally { setLoading(false) }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <BookOpen size={28} color="white" />
                </div>
                <h1 className="auth-title">STEM Calculator</h1>
                <p className="auth-sub">Sign in to your account</p>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label className="form-label"><Mail size={13} /> Email</label>
                        <input className="form-input" type="email" value={form.email}
                            onChange={set('email')} placeholder="you@example.com" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label"><Lock size={13} /> Password</label>
                        <input className="form-input" type="password" value={form.password}
                            onChange={set('password')} placeholder="••••••••" required />
                    </div>
                    <button className="btn btn-primary w-full" disabled={loading}>
                        {loading ? 'Signing in…' : <><LogIn size={15} /> Sign In</>}
                    </button>
                </form>

                <div className="auth-links">
                    <Link to="/forgot-password">Forgot password?</Link>
                    <span>·</span>
                    <Link to="/signup">Create account</Link>
                </div>
            </div>
        </div>
    )
}
