import { useState, useEffect } from 'react'
import { activitiesApi, materialsApi } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FlaskConical, Plus, Trash2, Save, Search, ChevronDown } from 'lucide-react'

const CATEGORIES = ['Science', 'Engineering', 'Technology', 'Mathematics']
const CONSUMPTION_MODES = [
    { value: 'per_student', label: 'Per Student' },
    { value: 'per_group', label: 'Per Group' },
    { value: 'per_session', label: 'Per Session (Fixed)' },
]

function MaterialPicker({ onPick }) {
    const [q, setQ] = useState('')
    const [results, setResults] = useState([])
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const t = setTimeout(async () => {
            if (q.length < 1) { setResults([]); return }
            const r = await materialsApi.list({ q })
            setResults(r.slice(0, 10))
            setOpen(true)
        }, 300)
        return () => clearTimeout(t)
    }, [q])

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: 12, color: 'var(--text-muted)' }} />
                <input className="form-input" placeholder="Search price library…" value={q}
                    onChange={e => setQ(e.target.value)} onFocus={() => results.length && setOpen(true)}
                    style={{ paddingLeft: '2.25rem' }} />
            </div>
            {open && results.length > 0 && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    borderRadius: 10, boxShadow: 'var(--card-shadow)', marginTop: 4, maxHeight: 240, overflowY: 'auto'
                }}>
                    {results.map(m => (
                        <div key={m.id} style={{
                            padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.875rem',
                            display: 'flex', justifyContent: 'space-between'
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}
                            onClick={() => { onPick(m); setQ(''); setOpen(false); setResults([]) }}>
                            <span>{m.name}</span>
                            <span style={{ color: 'var(--primary-blue)', fontFamily: 'var(--font-data)', fontSize: '0.8rem' }}>
                                TZS {(Number(m.pack_price) / Number(m.pack_size)).toFixed(2)}/{m.unit_type}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function MaterialRow({ line, onChange, onRemove }) {
    const unitCost = line.material
        ? (line.manual_override ? Number(line.manual_unit_cost || 0) : Number(line.material.pack_price) / Number(line.material.pack_size)) * (1 + Number(line.waste_pct || 0) / 100)
        : 0

    const set = k => e => onChange({ ...line, [k]: e.target.value })

    return (
        <div className="material-row-card">
            <div className="material-row-header">
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {line.material?.name}
                    <span className="badge badge-blue" style={{ marginLeft: 8 }}>{line.material?.unit_type}</span>
                </div>
                <button className="btn btn-sm btn-danger" onClick={onRemove}><Trash2 size={12} /></button>
            </div>
            <div className="material-row-grid">
                <div className="form-group">
                    <label className="form-label">Qty Used</label>
                    <input className="form-input" type="number" min="0" step="any" value={line.qty_used}
                        onChange={set('qty_used')} placeholder="e.g. 2" />
                </div>
                <div className="form-group">
                    <label className="form-label">Consumption Mode</label>
                    <select className="form-input form-select" value={line.consumption_mode} onChange={set('consumption_mode')}>
                        {CONSUMPTION_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>
                {line.consumption_mode === 'per_group' && (
                    <div className="form-group">
                        <label className="form-label">Group Size</label>
                        <input className="form-input" type="number" min="1" value={line.group_size}
                            onChange={set('group_size')} />
                    </div>
                )}
                <div className="form-group">
                    <label className="form-label">Waste % (optional)</label>
                    <input className="form-input" type="number" min="0" max="100" value={line.waste_pct}
                        onChange={set('waste_pct')} placeholder="0" />
                </div>
                <div className="form-group">
                    <label className="form-label">
                        <input type="checkbox" checked={!!line.manual_override}
                            onChange={e => onChange({ ...line, manual_override: e.target.checked })} />
                        {' '}Manual unit cost
                    </label>
                    {line.manual_override && (
                        <input className="form-input" type="number" min="0" step="any"
                            value={line.manual_unit_cost} onChange={set('manual_unit_cost')} placeholder="TZS per unit" />
                    )}
                </div>
                <div className="form-group">
                    <label className="form-label">Unit Cost</label>
                    <div style={{ fontFamily: 'var(--font-data)', fontWeight: 700, color: 'var(--primary-blue)', paddingTop: 8 }}>
                        TZS {unitCost.toFixed(4)}
                    </div>
                    {!line.manual_override && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {Number(line.material?.pack_price).toLocaleString()} ÷ {line.material?.pack_size}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function ActivityEditor() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { canEdit } = useAuth()
    const isEdit = Boolean(id)

    const [form, setForm] = useState({
        name: '', category: 'Science', age_group: '', duration_mins: '', default_students: 20, description: ''
    })
    const [lines, setLines] = useState([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!isEdit) return
        activitiesApi.get(id).then(act => {
            setForm({
                name: act.name, category: act.category, age_group: act.age_group || '',
                duration_mins: act.duration_mins || '', default_students: act.default_students || 20,
                description: act.description || ''
            })
            setLines(act.materials.map(m => ({
                material: { id: m.material_id, name: m.material_name, unit_type: m.unit_type, pack_size: m.pack_size, pack_price: m.pack_price },
                material_id: m.material_id,
                qty_used: m.qty_used, consumption_mode: m.consumption_mode, group_size: m.group_size,
                waste_pct: m.waste_pct, manual_override: m.manual_override, manual_unit_cost: m.manual_unit_cost || '',
            })))
        }).catch(err => toast.error(err.message))
    }, [id, isEdit])

    function addMaterial(m) {
        setLines(l => [...l, {
            material: m, material_id: m.id,
            qty_used: 1, consumption_mode: 'per_student', group_size: 4,
            waste_pct: 0, manual_override: false, manual_unit_cost: '',
        }])
    }

    async function handleSave(e) {
        e.preventDefault()
        if (!form.name) return toast.error('Activity name is required')
        if (!lines.length) return toast.error('Add at least one material')
        setSaving(true)
        try {
            const payload = {
                ...form,
                materials: lines.map(l => ({
                    material_id: l.material_id,
                    qty_used: l.qty_used,
                    consumption_mode: l.consumption_mode,
                    group_size: l.group_size,
                    waste_pct: l.waste_pct,
                    manual_override: l.manual_override,
                    manual_unit_cost: l.manual_override ? l.manual_unit_cost : undefined,
                }))
            }
            if (isEdit) await activitiesApi.update(id, payload)
            else await activitiesApi.create(payload)

            toast.success(isEdit ? 'Activity updated!' : 'Activity created!')
            navigate('/activities')
        } catch (err) { toast.error(err.message) }
        finally { setSaving(false) }
    }

    const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

    if (!canEdit) return (
        <div className="page-container">
            <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
                <p>Only Curators and Admins can create or edit activity templates.</p>
            </div></div>
        </div>
    )

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1><FlaskConical size={22} /> {isEdit ? 'Edit Activity' : 'New Activity Template'}</h1>
                    <p>Define materials with pack-based costs. Unit costs are auto-calculated.</p>
                </div>
            </div>

            <form onSubmit={handleSave}>
                {/* Basic Info */}
                <div className="card" style={{ marginBottom: '1.25rem' }}>
                    <div className="card-header card-header-gradient">
                        <div className="card-title">Activity Details</div>
                    </div>
                    <div className="card-body">
                        <div className="form-grid-2">
                            <div className="form-group">
                                <label className="form-label">Activity Name *</label>
                                <input className="form-input" value={form.name} onChange={set('name')}
                                    placeholder="e.g. Elephant Toothpaste" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select className="form-input form-select" value={form.category} onChange={set('category')}>
                                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Age Group</label>
                                <input className="form-input" value={form.age_group} onChange={set('age_group')} placeholder="e.g. 7–11, Secondary" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Duration (mins)</label>
                                <input className="form-input" type="number" value={form.duration_mins} onChange={set('duration_mins')} placeholder="45" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Default Students</label>
                                <input className="form-input" type="number" value={form.default_students} onChange={set('default_students')} />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Description</label>
                                <textarea className="form-input" rows={2} value={form.description} onChange={set('description')}
                                    placeholder="Brief description of the activity…" style={{ height: 'auto', padding: '0.5rem 0.875rem' }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Materials */}
                <div className="card" style={{ marginBottom: '1.25rem' }}>
                    <div className="card-header card-header-gradient" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div className="card-title">Materials</div>
                        <div style={{ width: '100%', maxWidth: 400 }}>
                            <MaterialPicker onPick={addMaterial} />
                        </div>
                    </div>
                    <div className="card-body">
                        {lines.length === 0 && (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                                Search the price library above to add materials.
                            </p>
                        )}
                        {lines.map((line, i) => (
                            <MaterialRow key={i} line={line}
                                onChange={updated => setLines(l => l.map((x, j) => j === i ? updated : x))}
                                onRemove={() => setLines(l => l.filter((_, j) => j !== i))} />
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/activities')}>Cancel</button>
                    <button className="btn btn-primary" disabled={saving}>
                        <Save size={14} /> {saving ? 'Saving…' : isEdit ? 'Update Activity' : 'Create Activity'}
                    </button>
                </div>
            </form>
        </div>
    )
}
