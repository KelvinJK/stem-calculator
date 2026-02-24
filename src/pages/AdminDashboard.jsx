import { useState, useEffect } from 'react'
import { adminApi, sessionsApi } from '../utils/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import {
    Users, Activity, BarChart3, ShieldCheck, CheckCircle, XCircle, Clock,
    TrendingUp, Package, FlaskConical, UserPlus
} from 'lucide-react'

const ROLES = ['admin', 'curator', 'marketing']

function RoleBadge({ role }) {
    const color = { admin: '#dc2626', curator: '#7c3aed', marketing: '#2563eb' }[role] || '#64748b'
    return <span style={{ color, background: color + '15', padding: '2px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize' }}>{role}</span>
}

function StatCard({ icon: Icon, label, value, sub, color = 'var(--primary-blue)' }) {
    return (
        <div className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
            <div className="stat-icon" style={{ color }}><Icon size={18} /></div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
            {sub && <div className="stat-sub">{sub}</div>}
        </div>
    )
}

export default function AdminDashboard() {
    const navigate = useNavigate()
    const [tab, setTab] = useState('overview')
    const [analytics, setAnalytics] = useState(null)
    const [users, setUsers] = useState([])
    const [pending, setPending] = useState([])
    const [loading, setLoading] = useState(true)

    async function loadAll() {
        setLoading(true)
        try {
            const [a, u, p] = await Promise.all([adminApi.analytics(), adminApi.users(), adminApi.pending()])
            setAnalytics(a); setUsers(u); setPending(p)
        } catch (err) { toast.error(err.message) }
        finally { setLoading(false) }
    }
    useEffect(() => { loadAll() }, [])

    async function changeRole(userId, role) {
        try { await adminApi.changeRole(userId, role); toast.success('Role updated'); loadAll() }
        catch (err) { toast.error(err.message) }
    }

    async function deleteUser(userId, name) {
        if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return
        try { await adminApi.deleteUser(userId); toast.success('User deleted'); loadAll() }
        catch (err) { toast.error(err.message) }
    }

    async function handleApprove(s) {
        try { await sessionsApi.approve(s.id); toast.success('Approved!'); loadAll() }
        catch (err) { toast.error(err.message) }
    }
    async function handleReject(s) {
        const note = prompt('Rejection note:') || ''
        try { await sessionsApi.reject(s.id, note); toast.success('Rejected'); loadAll() }
        catch (err) { toast.error(err.message) }
    }

    const ss = analytics?.sessions || {}
    const tabs = [
        { id: 'overview', label: 'Overview', Icon: BarChart3 },
        { id: 'pending', label: `Pending ${pending.length ? `(${pending.length})` : ''}`, Icon: Clock },
        { id: 'users', label: 'Users', Icon: Users },
    ]

    if (loading) return (
        <div className="page-container"><div className="card"><div className="card-body" style={{ textAlign: 'center', padding: '4rem' }}>Loading…</div></div></div>
    )

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1><ShieldCheck size={22} /> Admin Dashboard</h1>
                    <p>Manage users, review pending sessions, and view analytics.</p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                {tabs.map(t => (
                    <button key={t.id}
                        onClick={() => setTab(t.id)}
                        style={{
                            background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
                            fontWeight: 700, fontSize: '0.875rem', color: tab === t.id ? 'var(--primary-blue)' : 'var(--text-muted)',
                            borderBottom: tab === t.id ? '2px solid var(--primary-blue)' : '2px solid transparent',
                            marginBottom: -2, display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'color 0.2s'
                        }}>
                        <t.Icon size={14} /> {t.label}
                    </button>
                ))}
            </div>

            {/* OVERVIEW */}
            {tab === 'overview' && analytics && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Session stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                        <StatCard icon={Activity} label="Total Sessions" value={ss.total_sessions || 0} />
                        <StatCard icon={CheckCircle} label="Approved" value={ss.approved || 0} color="#16a34a" />
                        <StatCard icon={Clock} label="Pending" value={ss.pending || 0} color="#d97706" />
                        <StatCard icon={XCircle} label="Rejected" value={ss.rejected || 0} color="#dc2626" />
                        <StatCard icon={Users} label="Total Users" value={users.length} />
                    </div>

                    {/* Top activities */}
                    <div className="card">
                        <div className="card-header card-header-gradient">
                            <div className="card-title"><FlaskConical size={15} /> Most-Used Activities</div>
                        </div>
                        <div className="card-body">
                            {analytics.topActivities.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>No sessions yet.</p>
                            ) : analytics.topActivities.map((a, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < analytics.topActivities.length - 1 ? '1px solid var(--border-color)' : '' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{i + 1}. {a.name}</span>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span className="badge badge-blue">{a.category}</span>
                                        <span style={{ fontFamily: 'var(--font-data)', fontWeight: 700, color: 'var(--primary-blue)' }}>{a.usage_count}×</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Monthly activity */}
                    <div className="card">
                        <div className="card-header card-header-gradient">
                            <div className="card-title"><TrendingUp size={15} /> Sessions per Month (last 12)</div>
                        </div>
                        <div className="card-body">
                            {analytics.monthlyActivity.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>No data yet.</p>
                            ) : (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', overflowX: 'auto', paddingBottom: '0.5rem', height: 120 }}>
                                    {analytics.monthlyActivity.map((m, i) => {
                                        const max = Math.max(...analytics.monthlyActivity.map(x => x.count))
                                        const h = max ? (m.count / max) * 80 : 4
                                        return (
                                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: '1 0 40px' }}>
                                                <div style={{ height: h, minHeight: 4, background: 'var(--primary-blue)', borderRadius: 4, width: '100%', opacity: 0.8 }} title={`${m.month}: ${m.count}`} />
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>{m.month.split(' ')[0]}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PENDING SESSIONS */}
            {tab === 'pending' && (
                <div>
                    {!pending.length ? (
                        <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            🎉 No pending sessions — all caught up!
                        </div></div>
                    ) : pending.map(s => (
                        <div key={s.id} className="card" style={{ marginBottom: '0.75rem' }}>
                            <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                        {s.client_name && <>{s.client_name} · </>}
                                        {s.student_count} students · by {s.created_by_name} · {new Date(s.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/sessions/${s.id}`)}>View</button>
                                    <button className="btn btn-sm btn-success" onClick={() => handleApprove(s)}>
                                        <CheckCircle size={12} /> Approve
                                    </button>
                                    <button className="btn btn-sm btn-danger" onClick={() => handleReject(s)}>
                                        <XCircle size={12} /> Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* USER MANAGEMENT */}
            {tab === 'users' && (
                <div className="card">
                    <div className="card-header card-header-gradient" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="card-title"><Users size={15} /> {users.length} users</div>
                        <button className="btn btn-sm btn-primary" onClick={() => navigate('/signup')}>
                            <UserPlus size={13} /> Add User
                        </button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                                    {['Name', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '0.7rem 1rem', fontWeight: 600 }}>{u.name}</td>
                                        <td style={{ padding: '0.7rem 1rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                                        <td style={{ padding: '0.7rem 1rem' }}><RoleBadge role={u.role} /></td>
                                        <td style={{ padding: '0.7rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                            {new Date(u.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '0.7rem 1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                                <select className="form-input form-select" style={{ width: 120, height: 28, padding: '0 0.5rem', fontSize: '0.78rem' }}
                                                    value={u.role} onChange={e => changeRole(u.id, e.target.value)}>
                                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                                <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u.id, u.name)}>
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
