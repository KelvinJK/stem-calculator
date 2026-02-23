import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    BookMarked, Trash2, Upload, Calendar, Users,
    DollarSign, TrendingUp, FileText, Plus, Search
} from 'lucide-react'
import Toast from '../components/Toast'

function fmt(n) {
    if (!n && n !== 0) return '—'
    return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function fmtDate(dateStr) {
    if (!dateStr) return '—'
    try {
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch { return dateStr }
}

function fmtSaved(isoStr) {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function ProfitBadge({ margin }) {
    const cls = margin < 10 ? 'badge-red' : margin < 25 ? 'badge-yellow' : 'badge-green'
    return <span className={`badge ${cls}`}>{margin}% margin</span>
}

export default function SavedActivities() {
    const [activities, setActivities] = useState([])
    const [search, setSearch] = useState('')
    const [toast, setToast] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const navigate = useNavigate()

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('stem_activities') || '[]')
        setActivities(saved)
    }, [])

    const filtered = activities.filter(a =>
        !search || a.name?.toLowerCase().includes(search.toLowerCase())
    )

    const handleDelete = (id) => {
        const updated = activities.filter(a => a.id !== id)
        setActivities(updated)
        localStorage.setItem('stem_activities', JSON.stringify(updated))
        setDeleteConfirm(null)
        showToast('Activity deleted.', 'success')
    }

    const handleLoad = (act) => {
        // Store the activity to load in sessionStorage, then navigate
        sessionStorage.setItem('load_activity', JSON.stringify(act))
        navigate('/')
        showToast(`"${act.name}" loaded into calculator.`, 'success')
    }

    return (
        <div className="page-container">
            {toast && <Toast msg={toast.msg} type={toast.type} />}

            {/* Delete Confirm Modal */}
            {deleteConfirm && (
                <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">
                            <Trash2 size={20} color="#dc2626" />
                            Delete Activity
                        </div>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>
                            Are you sure you want to delete <strong>"{deleteConfirm.name}"</strong>?
                            This action cannot be undone.
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                            <button
                                className="btn"
                                style={{ background: '#dc2626', color: 'white' }}
                                onClick={() => handleDelete(deleteConfirm.id)}
                            >
                                <Trash2 size={15} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BookMarked size={26} color="#2563eb" />
                        Saved Activities
                    </h1>
                    <p>
                        {activities.length === 0
                            ? 'No saved activities yet. Use the calculator to create and save one.'
                            : `${activities.length} saved activit${activities.length !== 1 ? 'ies' : 'y'} — load any into the calculator.`}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/')}>
                    <Plus size={15} /> New Activity
                </button>
            </div>

            {/* Search */}
            {activities.length > 0 && (
                <div className="card" style={{ marginBottom: '1.25rem' }}>
                    <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                className="form-input"
                                placeholder="Search saved activities..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ paddingLeft: '2.25rem' }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {activities.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <BookMarked />
                        <h3>No Saved Activities</h3>
                        <p>
                            Use the Calculator to plan your STEM session, set costs and profit margin,
                            then click "Save Activity" to store it here as a reusable template.
                        </p>
                        <button className="btn btn-primary" onClick={() => navigate('/')}>
                            <Plus size={15} /> Create First Activity
                        </button>
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Search />
                        <h3>No Results</h3>
                        <p>No activities match your search. Try a different keyword.</p>
                        <button className="btn btn-secondary" onClick={() => setSearch('')}>Clear Search</button>
                    </div>
                </div>
            ) : (
                <div className="activities-grid">
                    {filtered.map(act => (
                        <div key={act.id} className="activity-card">
                            {/* Header */}
                            <div className="activity-card-header">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="activity-card-title" title={act.name}>{act.name}</div>
                                    <ProfitBadge margin={act.profit_margin ?? 0} />
                                </div>
                                <div className="activity-card-meta">
                                    {act.date && (
                                        <span className="meta-item">
                                            <Calendar /> {fmtDate(act.date)}
                                        </span>
                                    )}
                                    {act.student_count > 0 && (
                                        <span className="meta-item">
                                            <Users /> {act.student_count} students
                                        </span>
                                    )}
                                    {act.cost_items?.length > 0 && (
                                        <span className="meta-item">
                                            <FileText /> {act.cost_items.length} cost item{act.cost_items.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Body */}
                            <div className="activity-card-body">
                                <div className="cost-breakdown">
                                    <div className="cost-row">
                                        <span className="label">Total Costs</span>
                                        <span className="value">{fmt(act.total_cost)}</span>
                                    </div>
                                    {act.student_count > 0 && (
                                        <div className="cost-row">
                                            <span className="label">Cost per Student</span>
                                            <span className="value">{fmt((act.total_cost || 0) / act.student_count)}</span>
                                        </div>
                                    )}
                                    <div className="divider" />
                                    <div className="cost-row">
                                        <span className="label" style={{ fontWeight: 600 }}>Suggested Price</span>
                                        <span className="value" style={{ color: '#2563eb', fontSize: '1rem' }}>{fmt(act.suggested_price)}</span>
                                    </div>
                                    {act.student_count > 0 && (
                                        <div className="cost-row">
                                            <span className="label">Price per Student</span>
                                            <span className="value" style={{ color: '#16a34a', fontWeight: 700 }}>{fmt(act.price_per_student)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Notes */}
                                {act.notes && (
                                    <div style={{
                                        background: '#f8fafc',
                                        borderRadius: '8px',
                                        padding: '0.625rem 0.875rem',
                                        fontSize: '0.78rem',
                                        color: '#64748b',
                                        lineHeight: 1.5,
                                        marginTop: '0.75rem',
                                        borderLeft: '3px solid #e2e8f0',
                                    }}>
                                        {act.notes}
                                    </div>
                                )}

                                {act.saved_at && (
                                    <p className="text-xs text-muted" style={{ marginTop: '0.75rem' }}>
                                        Saved {fmtSaved(act.saved_at)}
                                    </p>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="activity-card-footer">
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => setDeleteConfirm(act)}
                                >
                                    <Trash2 size={13} /> Delete
                                </button>
                                <button
                                    className="btn btn-outline btn-sm"
                                    onClick={() => handleLoad(act)}
                                >
                                    <Upload size={13} /> Load
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
