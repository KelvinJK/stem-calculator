import { useState, useEffect } from 'react'
import {
    Calculator, Plus, Trash2, Save, RefreshCw,
    Users, Calendar, FileText, DollarSign,
    TrendingUp, Package, Zap, BarChart3
} from 'lucide-react'
import Toast from '../components/Toast'

const CATEGORIES = ['labor', 'materials', 'overhead', 'other']

const DEFAULT_ACTIVITY = {
    name: '',
    date: new Date().toISOString().split('T')[0],
    student_count: '',
    notes: '',
}

const DEFAULT_COST_ITEM = {
    category: 'materials',
    description: '',
    quantity: 1,
    unit_cost: 0,
}

let nextId = 1
const makeId = () => `item-${nextId++}`

const makeCostItem = () => ({ ...DEFAULT_COST_ITEM, id: makeId() })

const categoryClass = (cat) => {
    const m = { labor: 'cat-labor', materials: 'cat-materials', overhead: 'cat-overhead', other: 'cat-other' }
    return m[cat] || 'cat-other'
}

const categoryIcon = (cat) => {
    if (cat === 'labor') return '👷'
    if (cat === 'materials') return '📦'
    if (cat === 'overhead') return '⚡'
    return '🔧'
}

function fmt(n) {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

export default function CalculatorPage() {
    const [activity, setActivity] = useState({ ...DEFAULT_ACTIVITY })
    const [costItems, setCostItems] = useState([makeCostItem()])
    const [profitMargin, setProfitMargin] = useState(30)
    const [toast, setToast] = useState(null)

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    // Load a saved activity from sessionStorage (set by SavedActivities page)
    useEffect(() => {
        const raw = sessionStorage.getItem('load_activity')
        if (raw) {
            try {
                const act = JSON.parse(raw)
                setActivity({
                    name: act.name || '',
                    date: act.date || new Date().toISOString().split('T')[0],
                    student_count: act.student_count || '',
                    notes: act.notes || '',
                })
                if (act.cost_items && act.cost_items.length > 0) {
                    setCostItems(act.cost_items)
                }
                if (act.profit_margin !== undefined) {
                    setProfitMargin(act.profit_margin)
                }
                sessionStorage.removeItem('load_activity')
                setToast({ msg: `"${act.name}" loaded successfully!`, type: 'success' })
                setTimeout(() => setToast(null), 3000)
            } catch (e) {
                sessionStorage.removeItem('load_activity')
            }
        }
    }, [])


    const updateActivity = (field, value) => setActivity(prev => ({ ...prev, [field]: value }))

    const addCostItem = () => setCostItems(prev => [...prev, makeCostItem()])

    const removeCostItem = (id) => {
        setCostItems(prev => {
            if (prev.length === 1) return prev
            return prev.filter(item => item.id !== id)
        })
    }

    const updateCostItem = (id, field, value) => {
        setCostItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ))
    }

    // Calculations
    const totalCost = costItems.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0
        const unit = parseFloat(item.unit_cost) || 0
        return sum + qty * unit
    }, 0)

    const students = parseInt(activity.student_count) || 0
    const costPerStudent = students > 0 ? totalCost / students : 0
    const profitAmount = totalCost * (profitMargin / 100)
    const suggestedPrice = totalCost + profitAmount
    const pricePerStudent = students > 0 ? suggestedPrice / students : 0
    const profitabilityClass = profitMargin < 10 ? 'profit-bad' : profitMargin < 25 ? 'profit-warning' : 'profit-good'

    // Cost breakdown by category
    const byCat = CATEGORIES.map(cat => {
        const subtotal = costItems
            .filter(i => i.category === cat)
            .reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_cost) || 0), 0)
        return { cat, subtotal }
    }).filter(c => c.subtotal > 0)

    const handleSave = () => {
        if (!activity.name.trim()) {
            showToast('Please enter an activity name before saving.', 'error')
            return
        }
        const saved = JSON.parse(localStorage.getItem('stem_activities') || '[]')
        const newActivity = {
            id: Date.now(),
            ...activity,
            cost_items: costItems,
            profit_margin: profitMargin,
            total_cost: totalCost,
            suggested_price: suggestedPrice,
            price_per_student: pricePerStudent,
            saved_at: new Date().toISOString(),
        }
        localStorage.setItem('stem_activities', JSON.stringify([newActivity, ...saved]))
        showToast(`"${activity.name}" saved successfully!`, 'success')
    }

    const handleReset = () => {
        setActivity({ ...DEFAULT_ACTIVITY })
        setCostItems([makeCostItem()])
        setProfitMargin(30)
        showToast('Calculator reset.', 'success')
    }

    return (
        <div className="page-container">
            {toast && <Toast msg={toast.msg} type={toast.type} />}

            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calculator size={26} color="#2563eb" />
                        Session Cost Calculator
                    </h1>
                    <p>Plan your STEM activities and calculate session pricing with profit margin analysis.</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={handleReset}>
                        <RefreshCw size={15} /> Reset
                    </button>
                    <button className="btn btn-success" onClick={handleSave}>
                        <Save size={15} /> Save Activity
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', grid: '1fr', gap: '1.25rem' }}>

                {/* Activity Details */}
                <div className="card">
                    <div className="card-header card-header-gradient">
                        <div className="card-title">
                            <FileText />
                            Activity Details
                        </div>
                    </div>
                    <div className="card-body space-y-4">
                        <div className="form-group">
                            <label className="form-label"><FileText size={14} /> Activity Name</label>
                            <input
                                className="form-input"
                                placeholder="e.g., Robotics Workshop, Chemistry Lab..."
                                value={activity.name}
                                onChange={e => updateActivity('name', e.target.value)}
                                style={{ fontSize: '1rem', height: '48px' }}
                            />
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label"><Calendar size={14} /> Session Date</label>
                                <input
                                    className="form-input"
                                    type="date"
                                    value={activity.date}
                                    onChange={e => updateActivity('date', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label"><Users size={14} /> Number of Students</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    min="1"
                                    placeholder="Enter student count"
                                    value={activity.student_count}
                                    onChange={e => updateActivity('student_count', e.target.value)}
                                    style={{ fontSize: '1rem' }}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes (Optional)</label>
                            <textarea
                                className="form-textarea"
                                placeholder="Any additional notes about this session..."
                                value={activity.notes}
                                onChange={e => updateActivity('notes', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Cost Items */}
                <div className="card">
                    <div className="card-header card-header-gradient">
                        <div className="card-title">
                            <Package />
                            Cost Items
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={addCostItem}>
                            <Plus size={14} /> Add Item
                        </button>
                    </div>
                    <div className="card-body">
                        <div className="cost-items-header">
                            <span>Description</span>
                            <span>Category</span>
                            <span>Qty</span>
                            <span>Unit Cost</span>
                            <span style={{ textAlign: 'right' }}>Total</span>
                            <span></span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {costItems.map(item => {
                                const total = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)
                                return (
                                    <div key={item.id} className="cost-item-row">
                                        <input
                                            className="form-input"
                                            placeholder="e.g., Science kit, Facilitator..."
                                            value={item.description}
                                            onChange={e => updateCostItem(item.id, 'description', e.target.value)}
                                        />
                                        <select
                                            className="form-input form-select"
                                            value={item.category}
                                            onChange={e => updateCostItem(item.id, 'category', e.target.value)}
                                            style={{ height: '38px', fontSize: '0.85rem' }}
                                        >
                                            {CATEGORIES.map(cat => (
                                                <option key={cat} value={cat}>{categoryIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                            ))}
                                        </select>
                                        <input
                                            className="form-input"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="1"
                                            value={item.quantity}
                                            onChange={e => updateCostItem(item.id, 'quantity', e.target.value)}
                                        />
                                        <input
                                            className="form-input"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={item.unit_cost}
                                            onChange={e => updateCostItem(item.id, 'unit_cost', e.target.value)}
                                        />
                                        <div className="cost-item-total">{fmt(total)}</div>
                                        <button
                                            className="btn btn-danger btn-icon btn-sm"
                                            onClick={() => removeCostItem(item.id)}
                                            title="Remove item"
                                            style={{ opacity: costItems.length === 1 ? 0.3 : 1 }}
                                            disabled={costItems.length === 1}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>

                        {byCat.length > 0 && (
                            <>
                                <hr className="section-divider" />
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <span className="text-xs text-muted font-semibold" style={{ marginRight: '0.25rem' }}>By category:</span>
                                    {byCat.map(({ cat, subtotal }) => (
                                        <span key={cat} className={`category-tag ${categoryClass(cat)}`}>
                                            {categoryIcon(cat)} {cat}: {fmt(subtotal)}
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}

                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            padding: '0.75rem 0 0',
                            borderTop: '2px solid #e2e8f0',
                            marginTop: '0.75rem',
                        }}>
                            <div style={{ textAlign: 'right' }}>
                                <div className="text-xs text-muted">Total Costs</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a5f' }}>{fmt(totalCost)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profit Margin */}
                <div className="card">
                    <div className="card-header card-header-gradient">
                        <div className="card-title">
                            <TrendingUp />
                            Profit Margin & Pricing
                        </div>
                        <span className={`profit-indicator ${profitabilityClass}`}>
                            {profitMargin < 10 ? '⚠️' : profitMargin < 25 ? '📊' : '✅'}
                            {profitMargin < 10 ? 'Low margin' : profitMargin < 25 ? 'Moderate' : 'Healthy margin'}
                        </span>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label className="form-label"><BarChart3 size={14} /> Desired Profit Margin</label>
                            <div className="slider-container">
                                <input
                                    type="range"
                                    className="slider"
                                    min="0"
                                    max="100"
                                    value={profitMargin}
                                    onChange={e => setProfitMargin(Number(e.target.value))}
                                    style={{ '--pct': `${profitMargin}%` }}
                                />
                                <span className="slider-value">{profitMargin}%</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                                <span className="text-xs text-muted">0% — Break even</span>
                                <span className="text-xs text-muted">100% — Double your costs</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="card">
                    <div className="card-header card-header-gradient">
                        <div className="card-title">
                            <DollarSign />
                            Session Pricing Summary
                        </div>
                    </div>
                    <div className="card-body">
                        <div className="summary-grid">
                            <div className="stat-card">
                                <div className="stat-label">Total Costs</div>
                                <div className="stat-value">{fmt(totalCost)}</div>
                                <div className="stat-sub">{costItems.length} line item{costItems.length !== 1 ? 's' : ''}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Cost Per Student</div>
                                <div className="stat-value">{students > 0 ? fmt(costPerStudent) : '—'}</div>
                                <div className="stat-sub">{students > 0 ? `${students} students` : 'Set student count'}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Profit ({profitMargin}%)</div>
                                <div className="stat-value" style={{ color: '#16a34a' }}>{fmt(profitAmount)}</div>
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

                        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button className="btn btn-secondary" onClick={handleReset}>
                                <RefreshCw size={15} /> Reset
                            </button>
                            <button className="btn btn-success" onClick={handleSave}>
                                <Save size={15} /> Save This Activity
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
