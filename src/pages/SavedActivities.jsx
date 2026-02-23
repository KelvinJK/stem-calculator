import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    BookMarked, Trash2, Upload, Calendar, Users,
    DollarSign, TrendingUp, FileText, Plus, Search,
    Download, FileSpreadsheet, Star, Filter
} from 'lucide-react'
import {
    collection, query, where, orderBy, getDocs, deleteDoc, doc
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { exportActivityPDF } from '../utils/exportPDF'
import { exportActivityExcel } from '../utils/exportExcel'
import toast from 'react-hot-toast'

function fmt(n) {
    if (!n && n !== 0) return '—'
    return 'TZS ' + Number(n).toLocaleString('en-TZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(dateStr) {
    if (!dateStr) return '—'
    try { return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
    catch { return dateStr }
}

function fmtSaved(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function ProfitBadge({ margin }) {
    const cls = margin < 10 ? 'badge-red' : margin < 25 ? 'badge-yellow' : 'badge-green'
    return <span className={`badge ${cls}`}>{margin}% margin</span>
}

export default function SavedActivities() {
    const [activities, setActivities] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterType, setFilterType] = useState('all')
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const navigate = useNavigate()
    const { currentUser } = useAuth()

    useEffect(() => {
        fetchActivities()
    }, [currentUser])

    async function fetchActivities() {
        setLoading(true)
        try {
            const q = query(
                collection(db, 'activities'),
                where('userId', '==', currentUser.uid),
                orderBy('savedAt', 'desc')
            )
            const snap = await getDocs(q)
            setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        } catch (err) {
            console.error(err)
            toast.error('Failed to load activities.')
        } finally {
            setLoading(false)
        }
    }

    const filtered = activities.filter(a => {
        const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase())
        const matchType = filterType === 'all' || a.sessionType === filterType
        return matchSearch && matchType
    })

    async function handleDelete(id) {
        try {
            await deleteDoc(doc(db, 'activities', id))
            setActivities(prev => prev.filter(a => a.id !== id))
            setDeleteConfirm(null)
            toast.success('Activity deleted.')
        } catch {
            toast.error('Failed to delete.')
        }
    }

    function handleLoad(act) {
        sessionStorage.setItem('load_activity', JSON.stringify(act))
        navigate('/')
    }

    return (
        <div className="page-container">
            {/* Delete Confirm Modal */}
            {deleteConfirm && (
                <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title"><Trash2 size={20} color="#dc2626" /> Delete Session</div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                            Are you sure you want to delete <strong>"{deleteConfirm.name}"</strong>? This cannot be undone.
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                            <button className="btn" style={{ background: '#dc2626', color: 'white' }}
                                onClick={() => handleDelete(deleteConfirm.id)}>
                                <Trash2 size={15} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BookMarked size={26} color="#2563eb" /> Saved Sessions
                    </h1>
                    <p>
                        {loading ? 'Loading…' : activities.length === 0
                            ? 'No saved sessions yet. Use the calculator to create one.'
                            : `${activities.length} saved session${activities.length !== 1 ? 's' : ''} — load any into the calculator.`}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/')}>
                    <Plus size={15} /> New Session
                </button>
            </div>

            {/* Filters */}
            {activities.length > 0 && (
                <div className="card" style={{ marginBottom: '1.25rem' }}>
                    <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
                        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                                <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input className="form-input" placeholder="Search sessions…"
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    style={{ paddingLeft: '2.25rem' }} />
                            </div>
                            <select className="form-input form-select" value={filterType}
                                onChange={e => setFilterType(e.target.value)}
                                style={{ width: 'auto', minWidth: 160 }}>
                                <option value="all">All Types</option>
                                <option value="open">Open Sessions</option>
                                <option value="invited">Invited Events</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="card">
                    <div className="empty-state">
                        <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 1rem' }} />
                        <p>Loading your sessions…</p>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!loading && activities.length === 0 && (
                <div className="card">
                    <div className="empty-state">
                        <BookMarked />
                        <h3>No Saved Sessions</h3>
                        <p>Use the Calculator to plan your STEM session, set costs and profit margin, then click "Save Session" to store it here.</p>
                        <button className="btn btn-primary" onClick={() => navigate('/')}><Plus size={15} /> Create First Session</button>
                    </div>
                </div>
            )}

            {!loading && activities.length > 0 && filtered.length === 0 && (
                <div className="card">
                    <div className="empty-state">
                        <Search />
                        <h3>No Results</h3>
                        <p>No sessions match your filters. Try a different search or clear the filter.</p>
                        <button className="btn btn-secondary" onClick={() => { setSearch(''); setFilterType('all') }}>Clear Filters</button>
                    </div>
                </div>
            )}

            {/* Grid */}
            {!loading && filtered.length > 0 && (
                <div className="activities-grid">
                    {filtered.map(act => (
                        <div key={act.id} className="activity-card">
                            {/* Header */}
                            <div className="activity-card-header">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="activity-card-title" title={act.name}>{act.name}</div>
                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                        {act.sessionType === 'invited' && (
                                            <span className="badge badge-blue"><Star size={11} /> Invited</span>
                                        )}
                                        <ProfitBadge margin={act.profitMargin ?? 0} />
                                    </div>
                                </div>
                                <div className="activity-card-meta">
                                    {act.date && <span className="meta-item"><Calendar /> {fmtDate(act.date)}</span>}
                                    {act.studentCount > 0 && <span className="meta-item"><Users /> {act.studentCount} students</span>}
                                    {act.activities?.length > 0 && (
                                        <span className="meta-item"><FileText /> {act.activities.length} activit{act.activities.length !== 1 ? 'ies' : 'y'}</span>
                                    )}
                                </div>
                            </div>

                            {/* Body */}
                            <div className="activity-card-body">
                                <div className="cost-breakdown">
                                    <div className="cost-row">
                                        <span className="label">Base Cost</span>
                                        <span className="value">{fmt(act.baseCost || act.total_cost)}</span>
                                    </div>
                                    {act.sessionType === 'invited' && act.adjustedCost && act.adjustedCost !== act.baseCost && (
                                        <div className="cost-row">
                                            <span className="label">Adjusted Cost</span>
                                            <span className="value" style={{ color: '#7c3aed' }}>{fmt(act.adjustedCost)}</span>
                                        </div>
                                    )}
                                    {act.studentCount > 0 && (
                                        <div className="cost-row">
                                            <span className="label">Cost per Student</span>
                                            <span className="value">{fmt((act.adjustedCost || act.baseCost || 0) / act.studentCount)}</span>
                                        </div>
                                    )}
                                    <div className="divider" />
                                    <div className="cost-row">
                                        <span className="label" style={{ fontWeight: 600 }}>Suggested Price</span>
                                        <span className="value" style={{ color: '#2563eb', fontSize: '1rem' }}>{fmt(act.suggestedPrice)}</span>
                                    </div>
                                    {act.studentCount > 0 && (
                                        <div className="cost-row">
                                            <span className="label">Price per Student</span>
                                            <span className="value" style={{ color: 'var(--success)', fontWeight: 700 }}>{fmt(act.pricePerStudent)}</span>
                                        </div>
                                    )}
                                </div>

                                {act.notes && (
                                    <div style={{
                                        background: 'var(--bg-primary)', borderRadius: 8, padding: '0.6rem 0.875rem',
                                        fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5,
                                        marginTop: '0.75rem', borderLeft: '3px solid var(--border-color)',
                                    }}>{act.notes}</div>
                                )}

                                {act.savedAt && (
                                    <p className="text-xs text-muted" style={{ marginTop: '0.75rem' }}>
                                        Saved {fmtSaved(act.savedAt)}
                                    </p>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="activity-card-footer">
                                <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(act)}>
                                    <Trash2 size={13} /> Delete
                                </button>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <button className="btn btn-secondary btn-sm" title="Export PDF"
                                        onClick={() => exportActivityPDF(act)}>
                                        <Download size={13} />
                                    </button>
                                    <button className="btn btn-secondary btn-sm" title="Export Excel"
                                        onClick={() => exportActivityExcel(act)}>
                                        <FileSpreadsheet size={13} />
                                    </button>
                                    <button className="btn btn-outline btn-sm" onClick={() => handleLoad(act)}>
                                        <Upload size={13} /> Load
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
