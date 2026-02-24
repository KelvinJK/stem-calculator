import { useState, useEffect, useCallback } from 'react'
import { materialsApi } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import {
    Package, Plus, Edit3, Trash2, Search, ChevronDown, ChevronUp, X, Save
} from 'lucide-react'

const UNIT_TYPES = ['pcs', 'g', 'ml', 'm', 'hrs']
const CATEGORIES = ['Consumables', 'Chemicals', 'Safety', 'Equipment', 'Stationery', 'Labour', 'Other']

function MaterialModal({ material, onClose, onSaved }) {
    const [form, setForm] = useState(material || {
        name: '', unit_type: 'pcs', pack_size: '', pack_price: '', category: 'Consumables', notes: ''
    })
    const [saving, setSaving] = useState(false)
    const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

    async function save(e) {
        e.preventDefault()
        if (!form.name || !form.pack_size || !form.pack_price)
            return toast.error('Name, pack size and pack price are required')
        setSaving(true)
        try {
            const saved = material
                ? await materialsApi.update(material.id, form)
                : await materialsApi.create(form)
            toast.success(material ? 'Material updated' : 'Material created')
            onSaved(saved)
        } catch (err) { toast.error(err.message) }
        finally { setSaving(false) }
    }

    // Live preview
    const unitCost = form.pack_price && form.pack_size
        ? (Number(form.pack_price) / Number(form.pack_size)).toFixed(4)
        : '—'

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 520 }}>
                <div className="modal-header">
                    <h3 className="card-title"><Package size={16} /> {material ? 'Edit' : 'New'} Material</h3>
                    <button className="ctrl-btn" onClick={onClose}><X size={16} /></button>
                </div>
                <form onSubmit={save} className="modal-body">
                    <div className="form-grid-2">
                        <div className="form-group">
                            <label className="form-label">Item Name *</label>
                            <input className="form-input" value={form.name} onChange={set('name')} placeholder="e.g. Plastic Cups" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <select className="form-input form-select" value={form.category} onChange={set('category')}>
                                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Unit Type</label>
                            <select className="form-input form-select" value={form.unit_type} onChange={set('unit_type')}>
                                {UNIT_TYPES.map(u => <option key={u}>{u}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Pack Size *</label>
                            <input className="form-input" type="number" min="0" step="any" value={form.pack_size}
                                onChange={set('pack_size')} placeholder="e.g. 50" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Pack Price (TZS) *</label>
                            <input className="form-input" type="number" min="0" step="any" value={form.pack_price}
                                onChange={set('pack_price')} placeholder="e.g. 5000" required />
                        </div>
                        <div className="form-group" style={{ alignSelf: 'center' }}>
                            <label className="form-label">Unit Cost (auto)</label>
                            <div className="stat-value" style={{ fontSize: '1rem', color: 'var(--primary-blue)' }}>
                                TZS {unitCost}
                            </div>
                            <div className="stat-sub">per {form.unit_type || 'unit'}</div>
                        </div>
                    </div>
                    <div className="form-group" style={{ marginTop: 8 }}>
                        <label className="form-label">Notes (optional)</label>
                        <textarea className="form-input" rows={2} value={form.notes} onChange={set('notes')}
                            placeholder="Supplier info, storage notes…" style={{ height: 'auto', padding: '0.5rem 0.875rem' }} />
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary" disabled={saving}>
                            <Save size={14} /> {saving ? 'Saving…' : 'Save Material'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function MaterialLibrary() {
    const { canEdit } = useAuth()
    const [materials, setMaterials] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [catFilter, setCatFilter] = useState('')
    const [modal, setModal] = useState(null)   // null | 'new' | material object
    const [expanded, setExpanded] = useState({})     // id → bool (price history)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params = {}
            if (search) params.q = search
            if (catFilter) params.category = catFilter
            setMaterials(await materialsApi.list(params))
        } catch (err) { toast.error(err.message) }
        finally { setLoading(false) }
    }, [search, catFilter])

    useEffect(() => { load() }, [load])

    async function handleDelete(m) {
        if (!confirm(`Archive "${m.name}"? It will no longer appear in new activities.`)) return
        try { await materialsApi.delete(m.id); toast.success('Archived'); load() }
        catch (err) { toast.error(err.message) }
    }

    function onSaved(saved) {
        setModal(null)
        load()
    }

    const unitCost = m => (Number(m.pack_price) / Number(m.pack_size)).toFixed(2)

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1><Package size={22} /> Price Library</h1>
                    <p>Reusable materials with pack-based pricing. Used across all activity templates.</p>
                </div>
                {canEdit && (
                    <button className="btn btn-primary" onClick={() => setModal('new')}>
                        <Plus size={15} /> Add Material
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.25rem' }}>
                <div className="card-body" style={{ padding: '0.875rem 1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                        <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="form-input" placeholder="Search materials…"
                            value={search} onChange={e => setSearch(e.target.value)}
                            style={{ paddingLeft: '2.25rem' }} />
                    </div>
                    <select className="form-input form-select" value={catFilter}
                        onChange={e => setCatFilter(e.target.value)} style={{ width: 180 }}>
                        <option value="">All categories</option>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="card">
                <div className="card-header card-header-gradient">
                    <div className="card-title"><Package size={15} /> {materials.length} materials</div>
                </div>
                {loading ? (
                    <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>Loading…</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                                    {['Name', 'Category', 'Pack Size', 'Pack Price (TZS)', 'Unit Cost', 'Unit', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {materials.map(m => (
                                    <>
                                        <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{m.name}</td>
                                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                                                <span className="badge badge-blue">{m.category || '—'}</span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>{m.pack_size}</td>
                                            <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-data)' }}>
                                                TZS {Number(m.pack_price).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-data)', color: 'var(--primary-blue)', fontWeight: 700 }}>
                                                TZS {unitCost(m)}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>per {m.unit_type}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                                    <button className="btn btn-sm btn-secondary"
                                                        onClick={() => setExpanded(x => ({ ...x, [m.id]: !x[m.id] }))}>
                                                        {expanded[m.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />} History
                                                    </button>
                                                    {canEdit && <>
                                                        <button className="btn btn-sm btn-secondary" onClick={() => setModal(m)}>
                                                            <Edit3 size={12} />
                                                        </button>
                                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(m)}>
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </>}
                                                </div>
                                            </td>
                                        </tr>
                                        {expanded[m.id] && m.price_history?.length > 0 && (
                                            <tr key={m.id + '-hist'}>
                                                <td colSpan={7} style={{ padding: '0 1rem 0.75rem 2.5rem', background: 'var(--bg-secondary)' }}>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>Price History</div>
                                                    {m.price_history?.map((v, i) => (
                                                        <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                                            TZS {Number(v.pack_price).toLocaleString()} / {v.pack_size} {m.unit_type} — {new Date(v.effective_from).toLocaleDateString()}
                                                        </div>
                                                    ))}
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                                {!materials.length && (
                                    <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No materials found. {canEdit && 'Click "Add Material" to create one.'}
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {modal && <MaterialModal material={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={onSaved} />}
        </div>
    )
}
