import { useState, useEffect } from 'react'
import {
    LayoutDashboard, Users, BarChart3, DollarSign, TrendingUp,
    Trash2, Edit3, Search, Shield, User, Star, Calendar, X
} from 'lucide-react'
import {
    collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

function fmt(n) {
    return Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
}

function fmtDate(ts) {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminDashboard() {
    const [users, setUsers] = useState([])
    const [activities, setActivities] = useState([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState('overview') // overview | users | activities
    const [search, setSearch] = useState('')
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const { currentUser } = useAuth()

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        try {
            const [usersSnap, activitiesSnap] = await Promise.all([
                getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'))),
                getDocs(query(collection(db, 'activities'), orderBy('savedAt', 'desc'))),
            ])
            setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })))
            setActivities(activitiesSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        } catch (err) {
            console.error(err)
            toast.error('Failed to load admin data. Check Firestore permissions.')
        } finally {
            setLoading(false)
        }
    }

    async function toggleRole(user) {
        const newRole = user.role === 'admin' ? 'user' : 'admin'
        if (user.id === currentUser.uid) return toast.error("You can't change your own role.")
        try {
            await updateDoc(doc(db, 'users', user.id), { role: newRole })
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u))
            toast.success(`${user.displayName || user.email} is now ${newRole === 'admin' ? 'an admin' : 'a standard user'}.`)
        } catch { toast.error('Failed to update role.') }
    }

    async function deleteActivity(id) {
        try {
            await deleteDoc(doc(db, 'activities', id))
            setActivities(prev => prev.filter(a => a.id !== id))
            setDeleteConfirm(null)
            toast.success('Activity deleted.')
        } catch { toast.error('Failed to delete.') }
    }

    // Stats
    const totalCost = activities.reduce((s, a) => s + (a.baseCost || 0), 0)
    const totalRevenue = activities.reduce((s, a) => s + (a.suggestedPrice || 0), 0)
    const totalProfit = totalRevenue - totalCost
    const invitedCount = activities.filter(a => a.sessionType === 'invited').length

    const filteredActivities = activities.filter(a =>
        !search || a.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.userName?.toLowerCase().includes(search.toLowerCase())
    )

    const filteredUsers = users.filter(u =>
        !search || u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.displayName?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="page-container">
            {deleteConfirm && (
                <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title"><Trash2 size={20} color="#dc2626" /> Delete Activity</div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Delete <strong>"{deleteConfirm.name}"</strong> by {deleteConfirm.userName}? This cannot be undone.
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                            <button className="btn" style={{ background: '#dc2626', color: '#fff' }}
                                onClick={() => deleteActivity(deleteConfirm.id)}>
                                <Trash2 size={15} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', borderRadius: 12, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <LayoutDashboard size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.4rem' }}>Admin Dashboard</h1>
                        <p>Manage users, sessions, and platform usage</p>
                    </div>
                </div>
                <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
                    {loading ? <span className="spinner-sm" /> : '↻'} Refresh
                </button>
            </div>

            {/* Tab bar */}
            <div className="admin-tabs">
                {[
                    { id: 'overview', label: 'Overview', icon: BarChart3 },
                    { id: 'users', label: `Users (${users.length})`, icon: Users },
                    { id: 'activities', label: `Activities (${activities.length})`, icon: DollarSign },
                ].map(t => (
                    <button key={t.id} className={`admin-tab ${tab === t.id ? 'active' : ''}`}
                        onClick={() => { setTab(t.id); setSearch('') }}>
                        <t.icon size={16} /> {t.label}
                    </button>
                ))}
            </div>

            {/* ── Overview ─────────────────────────────── */}
            {tab === 'overview' && (
                <div>
                    <div className="summary-grid" style={{ marginBottom: '1.5rem' }}>
                        {[
                            { label: 'Total Users', value: users.length, icon: Users, color: '#3b82f6' },
                            { label: 'Total Sessions', value: activities.length, icon: BarChart3, color: '#7c3aed' },
                            { label: 'Invited Events', value: invitedCount, icon: Star, color: '#f59e0b' },
                            { label: 'Total Platform Cost', value: fmt(totalCost), icon: DollarSign, color: '#ef4444' },
                            { label: 'Total Revenue Potential', value: fmt(totalRevenue), icon: TrendingUp, color: '#10b981' },
                            { label: 'Estimated Profit', value: fmt(totalProfit), icon: TrendingUp, color: '#16a34a' },
                        ].map(s => (
                            <div key={s.label} className="stat-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <s.icon size={16} color={s.color} />
                                    <span className="stat-label">{s.label}</span>
                                </div>
                                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Recent activities */}
                    <div className="card">
                        <div className="card-header card-header-gradient">
                            <div className="card-title"><BarChart3 /> Recent Sessions (Latest 10)</div>
                        </div>
                        <div className="card-body" style={{ padding: 0 }}>
                            <div className="admin-table-wrapper">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Session</th>
                                            <th>User</th>
                                            <th>Type</th>
                                            <th>Cost</th>
                                            <th>Price</th>
                                            <th>Saved</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activities.slice(0, 10).map(a => (
                                            <tr key={a.id}>
                                                <td style={{ fontWeight: 600 }}>{a.name}</td>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{a.userName}</td>
                                                <td>
                                                    {a.sessionType === 'invited'
                                                        ? <span className="badge badge-blue"><Star size={11} /> Invited</span>
                                                        : <span className="badge badge-gray">Open</span>}
                                                </td>
                                                <td>{fmt(a.baseCost)}</td>
                                                <td style={{ color: '#2563eb', fontWeight: 600 }}>{fmt(a.suggestedPrice)}</td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{fmtDate(a.savedAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Users ────────────────────────────────── */}
            {tab === 'users' && (
                <div className="card">
                    <div className="card-header card-header-gradient">
                        <div className="card-title"><Users /> User Management</div>
                        <div style={{ position: 'relative', width: 240 }}>
                            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input className="form-input" placeholder="Search users…"
                                value={search} onChange={e => setSearch(e.target.value)}
                                style={{ paddingLeft: '2rem', height: 36, fontSize: '0.83rem' }} />
                        </div>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Joined</th>
                                        <th>Sessions</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(u => {
                                        const sessionCount = activities.filter(a => a.userId === u.id).length
                                        const isYou = u.id === currentUser.uid
                                        return (
                                            <tr key={u.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div className="user-avatar" style={{ width: 30, height: 30, fontSize: '0.7rem' }}>
                                                            {(u.displayName || u.email || '?')[0].toUpperCase()}
                                                        </div>
                                                        <span style={{ fontWeight: 600 }}>{u.displayName || '—'}</span>
                                                        {isYou && <span className="badge badge-gray" style={{ fontSize: '0.68rem' }}>You</span>}
                                                    </div>
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.83rem' }}>{u.email}</td>
                                                <td>
                                                    {u.role === 'admin'
                                                        ? <span className="badge badge-purple"><Shield size={11} /> Admin</span>
                                                        : <span className="badge badge-gray"><User size={11} /> User</span>}
                                                </td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{fmtDate(u.createdAt)}</td>
                                                <td>{sessionCount}</td>
                                                <td>
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        disabled={isYou}
                                                        onClick={() => toggleRole(u)}
                                                        title={u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}>
                                                        {u.role === 'admin' ? <User size={13} /> : <Shield size={13} />}
                                                        {u.role === 'admin' ? 'Make User' : 'Make Admin'}
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Activities ───────────────────────────── */}
            {tab === 'activities' && (
                <div className="card">
                    <div className="card-header card-header-gradient">
                        <div className="card-title"><DollarSign /> All Sessions</div>
                        <div style={{ position: 'relative', width: 240 }}>
                            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input className="form-input" placeholder="Search sessions or users…"
                                value={search} onChange={e => setSearch(e.target.value)}
                                style={{ paddingLeft: '2rem', height: 36, fontSize: '0.83rem' }} />
                        </div>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Session</th>
                                        <th>User</th>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>Cost</th>
                                        <th>Price</th>
                                        <th>Margin</th>
                                        <th>Delete</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredActivities.map(a => (
                                        <tr key={a.id}>
                                            <td style={{ fontWeight: 600 }}>{a.name}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{a.userName}</td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{a.date || '—'}</td>
                                            <td>
                                                {a.sessionType === 'invited'
                                                    ? <span className="badge badge-blue"><Star size={11} /> Invited</span>
                                                    : <span className="badge badge-gray">Open</span>}
                                            </td>
                                            <td>{fmt(a.baseCost)}</td>
                                            <td style={{ color: '#2563eb', fontWeight: 600 }}>{fmt(a.suggestedPrice)}</td>
                                            <td>
                                                <span className={`badge ${(a.profitMargin || 0) < 10 ? 'badge-red' : (a.profitMargin || 0) < 25 ? 'badge-yellow' : 'badge-green'}`}>
                                                    {a.profitMargin || 0}%
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(a)}>
                                                    <Trash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
