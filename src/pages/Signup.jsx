import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Beaker, Mail, Lock, User, Eye, EyeOff, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Signup() {
    const [form, setForm] = useState({ displayName: '', email: '', password: '', confirm: '' })
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const { signup } = useAuth()
    const navigate = useNavigate()

    function validate() {
        const e = {}
        if (!form.displayName.trim()) e.displayName = 'Name is required'
        if (!form.email) e.email = 'Email is required'
        if (form.password.length < 6) e.password = 'Password must be at least 6 characters'
        if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    function set(field, val) {
        setForm(f => ({ ...f, [field]: val }))
        if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!validate()) return
        setLoading(true)
        try {
            await signup(form.email, form.password, form.displayName.trim())
            toast.success('Account created! Welcome!')
            navigate('/')
        } catch (err) {
            const msg = err.code === 'auth/email-already-in-use'
                ? 'An account with this email already exists.'
                : 'Sign up failed. Please try again.'
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
                    <h2 className="auth-heading">Create your account</h2>
                    <p className="auth-desc">Get started with the STEM Cost Calculator</p>

                    <div className="form-group">
                        <label className="form-label"><User size={14} /> Full Name</label>
                        <input className={`form-input ${errors.displayName ? 'input-error' : ''}`}
                            type="text" placeholder="Your full name"
                            value={form.displayName} onChange={e => set('displayName', e.target.value)} />
                        {errors.displayName && <span className="field-error">{errors.displayName}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label"><Mail size={14} /> Email address</label>
                        <input className={`form-input ${errors.email ? 'input-error' : ''}`}
                            type="email" placeholder="you@example.com"
                            value={form.email} onChange={e => set('email', e.target.value)} />
                        {errors.email && <span className="field-error">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label"><Lock size={14} /> Password</label>
                        <div style={{ position: 'relative' }}>
                            <input className={`form-input ${errors.password ? 'input-error' : ''}`}
                                type={showPw ? 'text' : 'password'}
                                placeholder="At least 6 characters"
                                value={form.password} onChange={e => set('password', e.target.value)}
                                style={{ paddingRight: '2.75rem' }} />
                            <button type="button" onClick={() => setShowPw(s => !s)}
                                style={{
                                    position: 'absolute', right: '0.75rem', top: '50%',
                                    transform: 'translateY(-50%)', background: 'none',
                                    border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex'
                                }}>
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {errors.password && <span className="field-error">{errors.password}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label"><Lock size={14} /> Confirm Password</label>
                        <input className={`form-input ${errors.confirm ? 'input-error' : ''}`}
                            type={showPw ? 'text' : 'password'}
                            placeholder="Re-enter your password"
                            value={form.confirm} onChange={e => set('confirm', e.target.value)} />
                        {errors.confirm && <span className="field-error">{errors.confirm}</span>}
                    </div>

                    <button className="btn btn-primary w-full" type="submit" disabled={loading}
                        style={{ marginTop: '0.5rem', height: 48, fontSize: '0.95rem' }}>
                        {loading ? <span className="spinner-sm" /> : <UserPlus size={18} />}
                        {loading ? 'Creating account…' : 'Create Account'}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account?{' '}
                    <Link to="/login" className="auth-link">Sign in</Link>
                </p>
            </div>
        </div>
    )
}
