import { useState, useEffect } from 'react'
import {
    Calculator, Plus, Trash2, Save, RefreshCw,
    Users, Calendar, FileText, DollarSign, TrendingUp,
    BarChart3, Upload, Download, FileSpreadsheet, ChevronDown, ChevronUp,
    Info, Star, X, PlusCircle
} from 'lucide-react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import ImportModal from '../components/ImportModal'
import Tooltip from '../components/Tooltip'
import { exportActivityPDF } from '../utils/exportPDF'
import { exportActivityExcel } from '../utils/exportExcel'
import toast from 'react-hot-toast'

// ─── Constants ───────────────────────────────────────────────────────────────

export const CATEGORIES = [
    { id: 'labor', label: 'Labor', icon: '👷', color: 'cat-labor' },
    { id: 'materials', label: 'Materials', icon: '📦', color: 'cat-materials' },
    { id: 'facilitator', label: 'Facilitator Fees', icon: '🧑‍🏫', color: 'cat-facilitator' },
    { id: 'venue', label: 'Venue', icon: '🏢', color: 'cat-venue' },
    { id: 'transport', label: 'Transport', icon: '🚌', color: 'cat-transport' },
    { id: 'equipment', label: 'Equipment Rental', icon: '⚙️', color: 'cat-equipment' },
    { id: 'refreshments', label: 'Refreshments', icon: '🍎', color: 'cat-refreshments' },
    { id: 'marketing', label: 'Marketing', icon: '📢', color: 'cat-marketing' },
    { id: 'contingency', label: 'Contingency', icon: '🛡️', color: 'cat-contingency' },
    { id: 'miscellaneous', label: 'Miscellaneous', icon: '🔧', color: 'cat-other' },
]

const SESSION_CRITERIA = [
    { id: 'venue_booking', label: 'Requires venue booking', fixedCost: 200 },
    { id: 'travel', label: 'Requires travel', multiplier: 1.1 },
    { id: 'special_speaker', label: 'Special guest speaker', fixedCost: 500 },
    { id: 'high_exclusivity', label: 'High exclusivity event', fixedCost: 300 },
    { id: 'external_guests', label: 'External guests involved', multiplier: 1.15 },
    { id: 'organiser_material', label: 'Materials by organiser', multiplier: 0.85 },
    { id: 'sponsorship', label: 'Sponsorship obligations', multiplier: 0.92 },
]

const DEFAULT_SESSION = {
    name: '',
    date: new Date().toISOString().split('T')[0],
    studentCount: '',
    notes: '',
    sessionType: 'open',
}

const DEFAULT_COST_ITEM = { category: 'materials', description: '', quantity: 1, unit_cost: 0 }

let uid = 1
const mkId = () => `ci-${uid++}`
const mkItem = () => ({ ...DEFAULT_COST_ITEM, id: mkId() })
const mkActivity = (n) => ({ id: `act-${Date.now()}-${n}`, name: `Activity ${n}`, costItems: [mkItem()] })

function fmt(n) {
    return Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function catInfo(id) {
    return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1]
}

function itemTotal(item) {
    return (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalculatorPage() {
    const { currentUser } = useAuth()
    const [session, setSession] = useState({ ...DEFAULT_SESSION })
    const [activities, setActivities] = useState([mkActivity(1)])
    const [activeTab, setActiveTab] = useState(0)
    const [profitMargin, setProfitMargin] = useState(30)
    const [selectedCriteria, setSelectedCriteria] = useState([])
    const [saving, setSaving] = useState(false)
    const [showImport, setShowImport] = useState(false)
    const [errors, setErrors] = useState({})

    // Load from sessionStorage when coming from SavedActivities
    useEffect(() => {
        const raw = sessionStorage.getItem('load_activity')
        if (!raw) return
        try {
            const act = JSON.parse(raw)
            sessionStorage.removeItem('load_activity')
            setSession({
                name: act.name || '',
                date: act.date || DEFAULT_SESSION.date,
                studentCount: act.studentCount || act.student_count || '',
                notes: act.notes || '',
                sessionType: act.sessionType || 'open',
            })
            if (act.activities?.length) {
                setActivities(act.activities.map(a => ({
                    ...a,
                    costItems: a.costItems?.length ? a.costItems : [mkItem()],
                })))
            } else if (act.cost_items?.length) {
                // Legacy format
                setActivities([{ id: mkId(), name: 'Activity 1', costItems: act.cost_items }])
            }
            if (act.profitMargin !== undefined) setProfitMargin(act.profitMargin)
            if (act.selectedCriteria?.length) setSelectedCriteria(act.selectedCriteria)
            toast.success(`"${act.name}" loaded into calculator!`)
        } catch { sessionStorage.removeItem('load_activity') }
    }, [])

    // ── Session field update ──────────────────────────────────────
    const setSessionField = (f, v) => {
        setSession(s => ({ ...s, [f]: v }))
        if (errors[f]) setErrors(e => ({ ...e, [f]: '' }))
    }

    // ── Activity tab management ───────────────────────────────────
    const addActivity = () => {
        const newAct = mkActivity(activities.length + 1)
        setActivities(a => [...a, newAct])
        setActiveTab(activities.length)
    }

    const removeActivity = (idx) => {
        if (activities.length === 1) return toast.error('You need at least one activity.')
        setActivities(a => a.filter((_, i) => i !== idx))
        setActiveTab(t => Math.max(0, t > idx ? t - 1 : t === idx ? Math.max(0, idx - 1) : t))
    }

    const renameActivity = (idx, name) => {
        setActivities(a => a.map((act, i) => i === idx ? { ...act, name } : act))
    }

    // ── Cost items for active tab ─────────────────────────────────
    const activeActivity = activities[activeTab] || activities[0]

    const addItem = () => {
        setActivities(a => a.map((act, i) => i === activeTab
            ? { ...act, costItems: [...act.costItems, mkItem()] }
            : act))
    }

    const removeItem = (id) => {
        setActivities(a => a.map((act, i) => {
            if (i !== activeTab) return act
            if (act.costItems.length === 1) return act
            return { ...act, costItems: act.costItems.filter(c => c.id !== id) }
        }))
    }

    const updateItem = (id, field, value) => {
        setActivities(a => a.map((act, i) => i !== activeTab ? act : {
            ...act,
            costItems: act.costItems.map(c => c.id === id ? { ...c, [field]: value } : c),
        }))
    }

    // Import items into active activity tab
    const handleImport = (items) => {
        setActivities(a => a.map((act, i) => i !== activeTab ? act : {
            ...act,
            costItems: [...act.costItems.filter(c => c.description), ...items],
        }))
    }

    // ── Calculations ──────────────────────────────────────────────
    const activityTotals = activities.map(act =>
        act.costItems.reduce((s, c) => s + itemTotal(c), 0)
    )
    const baseCost = activityTotals.reduce((s, t) => s + t, 0)

    // Apply invited-event criteria
    let adjustedCost = baseCost
    if (session.sessionType === 'invited') {
        selectedCriteria.forEach(c => {
            if (c.fixedCost) adjustedCost += c.fixedCost
            if (c.multiplier) adjustedCost *= c.multiplier
        })
    }

    const students = parseInt(session.studentCount) || 0
    const profitAmount = adjustedCost * (profitMargin / 100)
    const suggestedPrice = adjustedCost + profitAmount
    const pricePerStudent = students > 0 ? suggestedPrice / students : 0
    const costPerStudent = students > 0 ? adjustedCost / students : 0
    const profitabilityClass = profitMargin < 10 ? 'profit-bad' : profitMargin < 25 ? 'profit-warning' : 'profit-good'

    // Category breakdown for active tab
    const byCat = CATEGORIES.map(cat => ({
        cat,
        subtotal: (activeActivity?.costItems || [])
            .filter(c => c.category === cat.id)
            .reduce((s, c) => s + itemTotal(c), 0),
    })).filter(c => c.subtotal > 0)

    // ── Criteria toggle ───────────────────────────────────────────
    const toggleCriterion = (criterion) => {
        setSelectedCriteria(s => {
            const exists = s.find(c => c.id === criterion.id)
            return exists ? s.filter(c => c.id !== criterion.id) : [...s, criterion]
        })
    }

    // ── Save ──────────────────────────────────────────────────────
    function validate() {
        const e = {}
        if (!session.name.trim()) e.name = 'Session name is required'
        if (session.studentCount && parseInt(session.studentCount) < 1) e.studentCount = 'Must be at least 1'
        setErrors(e)
        return !Object.keys(e).length
    }

    async function handleSave() {
        if (!validate()) return toast.error('Please fix the highlighted fields.')
        setSaving(true)
        try {
            const data = {
                userId: currentUser.uid,
                userName: currentUser.displayName || currentUser.email,
                name: session.name.trim(),
                date: session.date,
                studentCount: parseInt(session.studentCount) || 0,
                notes: session.notes,
                sessionType: session.sessionType,
                selectedCriteria,
                activities,
                profitMargin,
                baseCost,
                adjustedCost,
                profitAmount,
                suggestedPrice,
                pricePerStudent,
                savedAt: serverTimestamp(),
                version: 1,
            }
            await addDoc(collection(db, 'activities'), data)
            toast.success(`"${session.name}" saved successfully!`)
        } catch (err) {
            console.error(err)
            toast.error('Failed to save. Check your Firebase configuration.')
        } finally {
            setSaving(false)
        }
    }

    // ── Export ────────────────────────────────────────────────────
    const sessionSnapshot = {
        name: session.name || 'Untitled', date: session.date,
        studentCount: students, notes: session.notes,
        sessionType: session.sessionType, selectedCriteria,
        activities, profitMargin, baseCost, adjustedCost,
        profitAmount, suggestedPrice, pricePerStudent,
    }

    function handleExportPDF() {
        if (!session.name.trim()) return toast.error('Please enter a session name first.')
        exportActivityPDF(sessionSnapshot)
    }

    function handleExportExcel() {
        if (!session.name.trim()) return toast.error('Please enter a session name first.')
        exportActivityExcel(sessionSnapshot)
    }

    // ── Reset ─────────────────────────────────────────────────────
    function handleReset() {
        uid = 1
        setSession({ ...DEFAULT_SESSION })
        setActivities([mkActivity(1)])
        setActiveTab(0)
        setProfitMargin(30)
        setSelectedCriteria([])
        setErrors({})
        toast.success('Calculator reset.')
    }

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="page-container">
            {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}

            {/* Page Header */}
            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calculator size={26} color="#2563eb" /> Session Cost Calculator
                    </h1>
                    <p>Plan STEM activities, itemise costs, and price sessions with profit margin analysis.</p>
                </div>
                <div className="flex gap-2" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={() => setShowImport(true)} title="Import cost items from CSV/Excel">
                        <Upload size={15} /> Import
                    </button>
                    <button className="btn btn-secondary" onClick={handleExportPDF} title="Download PDF report">
                        <Download size={15} /> PDF
                    </button>
                    <button className="btn btn-secondary" onClick={handleExportExcel} title="Download Excel report">
                        <FileSpreadsheet size={15} /> Excel
                    </button>
                    <button className="btn btn-secondary" onClick={handleReset}>
                        <RefreshCw size={15} /> Reset
                    </button>
                    <button className="btn btn-success" onClick={handleSave} disabled={saving}>
                        {saving ? <span className="spinner-sm" /> : <Save size={15} />}
                        {saving ? 'Saving…' : 'Save Session'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* ── Session Details ─────────────────────────────────── */}
                <div className="card">
                    <div className="card-header card-header-gradient">
                        <div className="card-title"><FileText /> Session Details</div>
                        {/* Invited / Open toggle */}
                        <div className="session-type-toggle">
                            <button
                                className={`toggle-btn ${session.sessionType === 'open' ? 'active' : ''}`}
                                onClick={() => setSessionField('sessionType', 'open')}>
                                Open Session
                            </button>
                            <button
                                className={`toggle-btn ${session.sessionType === 'invited' ? 'active invited-active' : ''}`}
                                onClick={() => setSessionField('sessionType', 'invited')}>
                                <Star size={13} /> Invited Event
                            </button>
                        </div>
                    </div>
                    <div className="card-body space-y-4">
                        <div className="form-group">
                            <label className="form-label">
                                <FileText size={14} /> Session Name
                                <Tooltip text="Give this session a descriptive name, e.g. 'Q1 Robotics Workshop'">
                                    <Info size={13} style={{ color: 'var(--text-muted)', cursor: 'help' }} />
                                </Tooltip>
                            </label>
                            <input className={`form-input ${errors.name ? 'input-error' : ''}`}
                                placeholder="e.g., Robotics Workshop — March 2026"
                                value={session.name}
                                onChange={e => setSessionField('name', e.target.value)}
                                style={{ fontSize: '1rem', height: 48 }}
                            />
                            {errors.name && <span className="field-error">{errors.name}</span>}
                        </div>

                        <div className="grid-3">
                            <div className="form-group">
                                <label className="form-label"><Calendar size={14} /> Session Date</label>
                                <input className="form-input" type="date"
                                    value={session.date}
                                    onChange={e => setSessionField('date', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">
                                    <Users size={14} /> Number of Students
                                    <Tooltip text="Used to calculate price per student in the summary">
                                        <Info size={13} style={{ color: 'var(--text-muted)', cursor: 'help' }} />
                                    </Tooltip>
                                </label>
                                <input className={`form-input ${errors.studentCount ? 'input-error' : ''}`}
                                    type="number" min="1" placeholder="Enter student count"
                                    value={session.studentCount}
                                    onChange={e => setSessionField('studentCount', e.target.value)} />
                                {errors.studentCount && <span className="field-error">{errors.studentCount}</span>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes (Optional)</label>
                                <input className="form-input" placeholder="Any additional details…"
                                    value={session.notes}
                                    onChange={e => setSessionField('notes', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Invited Event Criteria ──────────────────────────── */}
                {session.sessionType === 'invited' && (
                    <div className="card criteria-card">
                        <div className="card-header card-header-gradient">
                            <div className="card-title"><Star /> Event Criteria</div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Each selected criterion adjusts the final price
                            </span>
                        </div>
                        <div className="card-body">
                            <div className="criteria-grid">
                                {SESSION_CRITERIA.map(c => {
                                    const isOn = selectedCriteria.find(s => s.id === c.id)
                                    const label = c.fixedCost ? `+$${c.fixedCost.toFixed(0)}` : `×${c.multiplier}`
                                    return (
                                        <label key={c.id} className={`criterion-item ${isOn ? 'active' : ''}`}>
                                            <input type="checkbox" checked={!!isOn}
                                                onChange={() => toggleCriterion(c)}
                                                style={{ display: 'none' }} />
                                            <div className="criterion-check">{isOn ? '✓' : ''}</div>
                                            <div>
                                                <div className="criterion-label">{c.label}</div>
                                                <div className="criterion-effect">{label}</div>
                                            </div>
                                        </label>
                                    )
                                })}
                            </div>
                            {selectedCriteria.length > 0 && (
                                <div className="criteria-summary">
                                    Base Cost: {fmt(baseCost)} → Adjusted: <strong>{fmt(adjustedCost)}</strong>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Activity Tabs ───────────────────────────────────── */}
                <div className="card">
                    <div className="card-header card-header-gradient">
                        <div className="card-title" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <DollarSign /> Activities
                            </span>
                            {/* Tabs */}
                            <div className="activity-tabs">
                                {activities.map((act, idx) => (
                                    <div key={act.id}
                                        className={`activity-tab ${idx === activeTab ? 'active' : ''}`}
                                        onClick={() => setActiveTab(idx)}>
                                        <span>{act.name}</span>
                                        <span className="tab-subtotal">{fmt(activityTotals[idx])}</span>
                                        {activities.length > 1 && (
                                            <button onClick={e => { e.stopPropagation(); removeActivity(idx) }}
                                                className="tab-close"><X size={11} /></button>
                                        )}
                                    </div>
                                ))}
                                <button className="tab-add" onClick={addActivity} title="Add another activity">
                                    <PlusCircle size={16} />
                                </button>
                            </div>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={addItem}>
                            <Plus size={14} /> Add Item
                        </button>
                    </div>

                    <div className="card-body">
                        {/* Activity name edit */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Activity Name</label>
                                <input className="form-input" style={{ height: 38 }}
                                    value={activeActivity?.name || ''}
                                    onChange={e => renameActivity(activeTab, e.target.value)}
                                    placeholder="e.g., Robotics Workshop" />
                            </div>
                        </div>

                        {/* Cost items header */}
                        <div className="cost-items-header">
                            <span>Description</span>
                            <span>Category</span>
                            <span>Qty</span>
                            <span>Unit Cost</span>
                            <span style={{ textAlign: 'right' }}>Total</span>
                            <span />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {(activeActivity?.costItems || []).map(item => {
                                const cat = catInfo(item.category)
                                const total = itemTotal(item)
                                return (
                                    <div key={item.id} className="cost-item-row">
                                        <input className="form-input"
                                            placeholder="e.g., Science kit, Facilitator…"
                                            value={item.description}
                                            onChange={e => updateItem(item.id, 'description', e.target.value)} />
                                        <select className="form-input form-select"
                                            value={item.category}
                                            onChange={e => updateItem(item.id, 'category', e.target.value)}
                                            style={{ height: 38, fontSize: '0.82rem' }}>
                                            {CATEGORIES.map(c => (
                                                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                                            ))}
                                        </select>
                                        <input className="form-input" type="number" min="0" step="0.01"
                                            placeholder="1" value={item.quantity}
                                            onChange={e => updateItem(item.id, 'quantity', e.target.value)} />
                                        <input className="form-input" type="number" min="0" step="0.01"
                                            placeholder="0.00" value={item.unit_cost}
                                            onChange={e => updateItem(item.id, 'unit_cost', e.target.value)} />
                                        <div className="cost-item-total">{fmt(total)}</div>
                                        <button className="btn btn-danger btn-icon btn-sm"
                                            onClick={() => removeItem(item.id)}
                                            disabled={(activeActivity?.costItems || []).length === 1}
                                            style={{ opacity: (activeActivity?.costItems || []).length === 1 ? 0.3 : 1 }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Category breakdown */}
                        {byCat.length > 0 && (
                            <>
                                <hr className="section-divider" />
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <span className="text-xs text-muted font-semibold" style={{ marginRight: '0.25rem' }}>By category:</span>
                                    {byCat.map(({ cat, subtotal }) => (
                                        <span key={cat.id} className={`category-tag ${cat.color}`}>
                                            {cat.icon} {cat.label}: {fmt(subtotal)}
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Tab subtotals (if multiple activities) */}
                        {activities.length > 1 && (
                            <>
                                <hr className="section-divider" />
                                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {activities.map((act, idx) => (
                                        <div key={act.id} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            <span style={{ fontWeight: 600 }}>{act.name}:</span> {fmt(activityTotals[idx])}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Total */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.75rem 0 0', borderTop: '2px solid var(--border-color)', marginTop: '0.75rem' }}>
                            <div style={{ textAlign: 'right' }}>
                                <div className="text-xs text-muted">{activities.length > 1 ? 'Combined Total Costs' : 'Total Costs'}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-navy)' }}>{fmt(baseCost)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Profit Margin ───────────────────────────────────── */}
                <div className="card">
                    <div className="card-header card-header-gradient">
                        <div className="card-title"><TrendingUp /> Profit Margin &amp; Pricing</div>
                        <span className={`profit-indicator ${profitabilityClass}`}>
                            {profitMargin < 10 ? '⚠️ Low margin' : profitMargin < 25 ? '📊 Moderate' : '✅ Healthy margin'}
                        </span>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label className="form-label">
                                <BarChart3 size={14} /> Desired Profit Margin
                                <Tooltip text="This % is added on top of your total costs (or adjusted costs for invited events) to reach the suggested price.">
                                    <Info size={13} style={{ color: 'var(--text-muted)', cursor: 'help' }} />
                                </Tooltip>
                            </label>
                            <div className="slider-container">
                                <input type="range" className="slider" min="0" max="100"
                                    value={profitMargin}
                                    onChange={e => setProfitMargin(Number(e.target.value))}
                                    style={{ '--pct': `${profitMargin}%` }} />
                                <span className="slider-value">{profitMargin}%</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                                <span className="text-xs text-muted">0% — Break even</span>
                                <span className="text-xs text-muted">100% — Double your costs</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Pricing Summary ─────────────────────────────────── */}
                <div className="card">
                    <div className="card-header card-header-gradient">
                        <div className="card-title"><DollarSign /> Session Pricing Summary</div>
                    </div>
                    <div className="card-body">
                        <div className="summary-grid">
                            <div className="stat-card">
                                <div className="stat-label">Base Cost</div>
                                <div className="stat-value">{fmt(baseCost)}</div>
                                <div className="stat-sub">{activities.reduce((s, a) => s + a.costItems.length, 0)} line items</div>
                            </div>
                            {session.sessionType === 'invited' && selectedCriteria.length > 0 && (
                                <div className="stat-card" style={{ borderColor: '#a78bfa' }}>
                                    <div className="stat-label">Adjusted Cost</div>
                                    <div className="stat-value" style={{ color: '#7c3aed' }}>{fmt(adjustedCost)}</div>
                                    <div className="stat-sub">{selectedCriteria.length} criteri{selectedCriteria.length !== 1 ? 'a' : 'on'} applied</div>
                                </div>
                            )}
                            <div className="stat-card">
                                <div className="stat-label">Cost Per Student</div>
                                <div className="stat-value">{students > 0 ? fmt(costPerStudent) : '—'}</div>
                                <div className="stat-sub">{students > 0 ? `${students} students` : 'Set student count'}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Profit ({profitMargin}%)</div>
                                <div className="stat-value" style={{ color: 'var(--success)' }}>{fmt(profitAmount)}</div>
                                <div className="stat-sub">On top of costs</div>
                            </div>
                            <div className="stat-card highlight">
                                <div className="stat-label">Suggested Price</div>
                                <div className="stat-value">{fmt(suggestedPrice)}</div>
                                <div className="stat-sub">For entire session</div>
                            </div>
                            <div className="stat-card highlight" style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                                <div className="stat-label">Price Per Student</div>
                                <div className="stat-value">{students > 0 ? fmt(pricePerStudent) : '—'}</div>
                                <div className="stat-sub">Recommended charge</div>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary" onClick={handleExportPDF}>
                                <Download size={15} /> Export PDF
                            </button>
                            <button className="btn btn-secondary" onClick={handleExportExcel}>
                                <FileSpreadsheet size={15} /> Export Excel
                            </button>
                            <button className="btn btn-secondary" onClick={handleReset}>
                                <RefreshCw size={15} /> Reset
                            </button>
                            <button className="btn btn-success" onClick={handleSave} disabled={saving}>
                                {saving ? <span className="spinner-sm" /> : <Save size={15} />}
                                {saving ? 'Saving…' : 'Save Session'}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
