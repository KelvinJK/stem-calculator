import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { BookOpen, User, Mail, Lock, UserPlus } from 'lucide-react'

export default function Signup() {
    const { register } = useAuth()
    const navigate = useNavigate()
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
    const [loading, setLoading] = useState(false)
    const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

    async function handleSubmit(e) {
        e.preventDefault()
        if (form.password !== form.confirm) return toast.error('Passwords do not match')
        if (form.password.length < 8) return toast.error('Password must be at least 8 characters')
        setLoading(true)
        try {
            await register(form.name, form.email, form.password)
            toast.success('Account created! Welcome aboard 🎉')
            navigate('/')
        } catch (err) { toast.error(err.message) }
        finally { setLoading(false) }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo"><BookOpen size={28} color="white" /></div>
                <h1 className="auth-title">Create Account</h1>
                <p className="auth-sub">Join the STEM Calculator team</p>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label className="form-label"><User size={13} /> Full Name</label>
                        <input className="form-input" value={form.name} onChange={set('name')} placeholder="Jane Doe" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label"><Mail size={13} /> Email</label>
                        <input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label"><Lock size={13} /> Password</label>
                        <input className="form-input" type="password" value={form.password} onChange={set('password')} placeholder="At least 8 characters" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label"><Lock size={13} /> Confirm Password</label>
                        <input className="form-input" type="password" value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" required />
                    </div>
                    <button className="btn btn-primary w-full" disabled={loading}>
                        {loading ? 'Creating…' : <><UserPlus size={15} /> Create Account</>}
                    </button>
                </form>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                    New accounts are given <strong>Marketing</strong> role by default. Ask an Admin to upgrade.
                </p>
                <div className="auth-links">
                    <Link to="/login">Already have an account? Sign in</Link>
                </div>
            </div>
        </div>
    )
}
