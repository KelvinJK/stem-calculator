import { useState, useEffect } from 'react'
import { sessionsApi, invoicesApi } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FileText, Plus, Edit3, Send, Download, Trash2, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'

const STATUS_COLORS = {
    draft: { color: '#64748b', bg: '#f1f5f9', label: 'Draft', Icon: Edit3 },
    pending: { color: '#d97706', bg: '#fef3c7', label: 'Pending', Icon: Clock },
    approved: { color: '#16a34a', bg: '#dcfce7', label: 'Approved', Icon: CheckCircle },
    rejected: { color: '#dc2626', bg: '#fef2f2', label: 'Rejected', Icon: XCircle },
}

const fmtTZS = n => 'TZS ' + Number(n || 0).toLocaleString('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function MyQuotes() {
    const { isAdmin } = useAuth()
    const navigate = useNavigate()
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('')

    async function load() {
        setLoading(true)
        try { setSessions(await sessionsApi.list(filter ? { status: filter } : {})) }
        catch (err) { toast.error(err.message) }
        finally { setLoading(false) }
    }
    useEffect(() => { load() }, [filter])

    async function handleDelete(s) {
        if (!confirm(`Delete session "${s.name}"?`)) return
        try { await sessionsApi.delete(s.id); toast.success('Deleted'); load() }
        catch (err) { toast.error(err.message) }
    }

    async function handleSubmit(s) {
        try { await sessionsApi.submit(s.id); toast.success('Submitted for approval!'); load() }
        catch (err) { toast.error(err.message) }
    }

    async function handleApprove(s) {
        try { await sessionsApi.approve(s.id); toast.success('Session approved!'); load() }
        catch (err) { toast.error(err.message) }
    }

    async function handleReject(s) {
        const note = prompt('Rejection reason (optional):')
        try { await sessionsApi.reject(s.id, note); toast.success('Rejected'); load() }
        catch (err) { toast.error(err.message) }
    }

    async function handleGenerateInvoice(s) {
        try {
            const inv = await invoicesApi.generate(s.id)
            toast.success(`Invoice ${inv.invoice_number} generated!`)
            load()
        } catch (err) { toast.error(err.message) }
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1><FileText size={22} /> {isAdmin ? 'All Sessions' : 'My Quotes'}</h1>
                    <p>View, edit, submit and download session quotations.</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/quotation/new')}>
                    <Plus size={15} /> New Quote
                </button>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                {['', 'draft', 'pending', 'approved', 'rejected'].map(s => (
                    <button key={s} className={`activity-tab ${filter === s ? 'active' : ''}`}
                        onClick={() => setFilter(s)}>
                        {s ? (STATUS_COLORS[s]?.label || s) : 'All'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>Loading…</div></div>
            ) : !sessions.length ? (
                <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No sessions found. <button className="btn btn-sm btn-primary" onClick={() => navigate('/quotation/new')}>Create one</button>
                </div></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {sessions.map(s => {
                        const st = STATUS_COLORS[s.status] || STATUS_COLORS.draft
                        return (
                            <div key={s.id} className="card" style={{ transition: 'box-shadow 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'}
                                onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
                                <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div style={{ flex: 1, minWidth: 200 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
                                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{s.name}</span>
                                            <span style={{ background: st.bg, color: st.color, padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <st.Icon size={11} /> {st.label}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            {s.client_name && <span>📋 {s.client_name}</span>}
                                            <span>👥 {s.student_count} students</span>
                                            <span>📅 {new Date(s.created_at).toLocaleDateString()}</span>
                                            {isAdmin && <span>👤 {s.created_by_name}</span>}
                                        </div>
                                        {s.status === 'rejected' && s.rejection_note && (
                                            <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <AlertCircle size={12} /> {s.rejection_note}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        {(s.status === 'draft' || s.status === 'rejected') && (
                                            <>
                                                <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/quotation/${s.id}`)}>
                                                    <Edit3 size={12} /> Edit
                                                </button>
                                                <button className="btn btn-sm btn-primary" onClick={() => handleSubmit(s)}>
                                                    <Send size={12} /> Submit
                                                </button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s)}>
                                                    <Trash2 size={12} />
                                                </button>
                                            </>
                                        )}
                                        {s.status === 'pending' && isAdmin && (
                                            <>
                                                <button className="btn btn-sm btn-success" onClick={() => handleApprove(s)}>
                                                    <CheckCircle size={12} /> Approve
                                                </button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleReject(s)}>
                                                    <XCircle size={12} /> Reject
                                                </button>
                                            </>
                                        )}
                                        {s.status === 'approved' && (
                                            <>
                                                {!s.invoice_id && isAdmin && (
                                                    <button className="btn btn-sm btn-primary" onClick={() => handleGenerateInvoice(s)}>
                                                        <FileText size={12} /> Generate Invoice
                                                    </button>
                                                )}
                                                {s.invoice_id && (
                                                    <a href={invoicesApi.downloadUrl(s.invoice_id)} target="_blank" rel="noreferrer"
                                                        className="btn btn-sm btn-success">
                                                        <Download size={12} /> Download PDF
                                                    </a>
                                                )}
                                            </>
                                        )}
                                        <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/sessions/${s.id}`)}>
                                            View <ChevronRight size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
