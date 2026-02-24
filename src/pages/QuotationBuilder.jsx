import { useState, useEffect, useCallback } from 'react'
import { activitiesApi, sessionsApi } from '../utils/api'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
    Calculator, Plus, X, Search, Users, TrendingUp, Save, Send, ChevronRight
} from 'lucide-react'

const fmtTZS = n => 'TZS ' + Number(n || 0).toLocaleString('en-TZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function ActivitySearch({ onAdd }) {
    const [q, setQ] = useState('')
    const [results, setResults] = useState([])

    useEffect(() => {
        const t = setTimeout(async () => {
            if (!q.trim()) { setResults([]); return }
            setResults(await activitiesApi.list({ q }))
        }, 300)
        return () => clearTimeout(t)
    }, [q])

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: 12, color: 'var(--text-muted)' }} />
                <input className="form-input" value={q} onChange={e => setQ(e.target.value)}
                    placeholder="Search and add activities…" style={{ paddingLeft: '2.25rem' }} />
            </div>
            {results.length > 0 && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    borderRadius: 10, boxShadow: 'var(--card-shadow)', marginTop: 4, maxHeight: 260, overflowY: 'auto'
                }}>
                    {results.map(a => (
                        <div key={a.id} style={{ padding: '0.65rem 1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}
                            onClick={() => { onAdd(a); setQ(''); setResults([]) }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{a.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.category} · {a.material_count} materials</div>
                            </div>
                            <Plus size={16} style={{ color: 'var(--primary-blue)' }} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function QuotationBuilder() {
    const navigate = useNavigate()
    const { id } = useParams()

    const [form, setForm] = useState({ name: '', client_name: '', client_contact: '', student_count: 20, margin_pct: 30, notes: '' })
    const [selectedActivities, setSelectedActivities] = useState([])
    const [quote, setQuote] = useState(null)
    const [saving, setSaving] = useState(false)

    const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

    // Load existing session if editing
    useEffect(() => {
        if (!id) return
        sessionsApi.get(id).then(s => {
            setForm({
                name: s.name, client_name: s.client_name || '', client_contact: s.client_contact || '',
                student_count: s.student_count, margin_pct: s.margin_pct, notes: s.notes || ''
            })
            if (s.breakdown) {
                setSelectedActivities(s.breakdown.map(b => ({ id: b.activityId, name: b.activityName })))
                setQuote(s)
            }
        }).catch(err => toast.error(err.message))
    }, [id])

    // Recompute quote whenever form/activities change
    const preview = useCallback(async () => {
        if (!selectedActivities.length || !id) { setQuote(null); return }
        try {
            const result = await sessionsApi.quote(id, { students: form.student_count, margin: form.margin_pct })
            setQuote(result)
        } catch { /* ignore */ }
    }, [id, selectedActivities.length, form.student_count, form.margin_pct])

    useEffect(() => { preview() }, [preview])

    function removeActivity(idx) { setSelectedActivities(a => a.filter((_, i) => i !== idx)) }

    async function handleSave(e) {
        e.preventDefault()
        if (!form.name) return toast.error('Session name is required')
        if (!selectedActivities.length) return toast.error('Add at least one activity')
        setSaving(true)
        try {
            const payload = { ...form, activity_ids: selectedActivities.map(a => a.id) }
            const s = id ? await sessionsApi.update(id, payload) : await sessionsApi.create(payload)
            toast.success('Session saved as draft!')
            navigate(`/sessions/${s.id}`)
        } catch (err) { toast.error(err.message) }
        finally { setSaving(false) }
    }

    async function handleSubmit() {
        if (!id) return toast.error('Save draft first')
        try { await sessionsApi.submit(id); toast.success('Submitted for approval!'); navigate('/sessions') }
        catch (err) { toast.error(err.message) }
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1><Calculator size={22} /> Quotation Builder</h1>
                    <p>Build multi-activity session quotes with automatic TZS cost calculation.</p>
                </div>
            </div>

            <form onSubmit={handleSave}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem', alignItems: 'start' }}>
                    {/* Left column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Session Info */}
                        <div className="card">
                            <div className="card-header card-header-gradient">
                                <div className="card-title">Session Info</div>
                            </div>
                            <div className="card-body">
                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Session Name *</label>
                                        <input className="form-input" value={form.name} onChange={set('name')}
                                            placeholder="e.g. Elephant Toothpaste – St. Joseph's" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Client Name</label>
                                        <input className="form-input" value={form.client_name} onChange={set('client_name')} placeholder="School / Organisation" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Client Contact</label>
                                        <input className="form-input" value={form.client_contact} onChange={set('client_contact')} placeholder="Email or phone" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label"><Users size={13} /> Number of Students</label>
                                        <input className="form-input" type="number" min="1" value={form.student_count} onChange={set('student_count')} />
                                    </div>
                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Notes</label>
                                        <textarea className="form-input" rows={2} value={form.notes} onChange={set('notes')}
                                            placeholder="Any notes for the client or admin…" style={{ height: 'auto', padding: '0.5rem 0.875rem' }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Activities */}
                        <div className="card">
                            <div className="card-header card-header-gradient" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <div className="card-title">Activities ({selectedActivities.length})</div>
                                <div style={{ width: '100%' }}>
                                    <ActivitySearch onAdd={a => setSelectedActivities(prev =>
                                        prev.find(x => x.id === a.id) ? prev : [...prev, a])} />
                                </div>
                            </div>
                            <div className="card-body">
                                {!selectedActivities.length && (
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
                                        Search above to add activities to this session.
                                    </p>
                                )}
                                {selectedActivities.map((a, i) => {
                                    const actBreakdown = quote?.breakdown?.find(b => b.activityId === a.id)
                                    return (
                                        <div key={a.id} className="activity-quote-row">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 700 }}>{i + 1}. {a.name}</span>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    {actBreakdown && (
                                                        <span style={{ fontFamily: 'var(--font-data)', color: 'var(--primary-blue)', fontWeight: 700 }}>
                                                            {fmtTZS(actBreakdown.activityTotal)}
                                                        </span>
                                                    )}
                                                    <button type="button" className="btn btn-sm btn-danger" onClick={() => removeActivity(i)}>
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                            {actBreakdown && actBreakdown.lines.map((l, j) => (
                                                <div key={j} style={{ marginLeft: '1rem', marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>{l.materialName} ({l.qtyUsed} {l.unitType} × {l.multiplier})</span>
                                                    <span style={{ fontFamily: 'var(--font-data)' }}>{fmtTZS(l.itemTotal)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right: Pricing Panel */}
                    <div className="card" style={{ position: 'sticky', top: '1rem' }}>
                        <div className="card-header card-header-gradient">
                            <div className="card-title"><TrendingUp size={15} /> Pricing Summary</div>
                        </div>
                        <div className="card-body">
                            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                <label className="form-label">Profit Margin: <strong>{form.margin_pct}%</strong></label>
                                <input type="range" min="5" max="80" step="1" value={form.margin_pct}
                                    onChange={set('margin_pct')} style={{ width: '100%', accentColor: 'var(--primary-blue)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                    <span>5%</span><span>80%</span>
                                </div>
                            </div>

                            {quote ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {[
                                        ['Material Cost', quote.totalCost],
                                        ['Profit Amount', quote.profit],
                                        ['Price per Student', quote.pricePerStudent],
                                    ].map(([label, val]) => (
                                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{label}</span>
                                            <span style={{ fontFamily: 'var(--font-data)', fontWeight: 700 }}>{fmtTZS(val)}</span>
                                        </div>
                                    ))}
                                    <div style={{
                                        borderTop: '2px solid var(--border-color)', paddingTop: '0.75rem',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <span style={{ fontWeight: 700 }}>Total Price</span>
                                        <span style={{ fontFamily: 'var(--font-data)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
                                            {fmtTZS(quote.price)}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.875rem', padding: '1.5rem 0' }}>
                                    Add activities to see pricing
                                </p>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.25rem' }}>
                                <button className="btn btn-primary w-full" disabled={saving}>
                                    <Save size={14} /> {saving ? 'Saving…' : 'Save Draft'}
                                </button>
                                {id && (
                                    <button type="button" className="btn btn-success w-full" onClick={handleSubmit}>
                                        <Send size={14} /> Submit for Approval
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
