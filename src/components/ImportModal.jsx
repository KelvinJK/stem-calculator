import { useState, useRef, useCallback } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Upload, X, Check, AlertCircle, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORY_IDS = ['labor', 'materials', 'facilitator', 'venue', 'transport', 'equipment', 'refreshments', 'marketing', 'contingency', 'miscellaneous']

function normalizeCategory(val) {
    if (!val) return 'miscellaneous'
    const v = val.toString().toLowerCase().trim()
    return CATEGORY_IDS.find(c => c.startsWith(v) || v.includes(c)) || 'miscellaneous'
}

export default function ImportModal({ onClose, onImport }) {
    const [rows, setRows] = useState(null)
    const [error, setError] = useState(null)
    const [fileName, setFileName] = useState('')
    const [dragging, setDragging] = useState(false)
    const inputRef = useRef()

    const parseFile = useCallback((file) => {
        setError(null)
        setFileName(file.name)
        const ext = file.name.split('.').pop().toLowerCase()

        if (ext === 'csv') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete(results) { processRows(results.data) },
                error(err) { setError('Failed to parse CSV: ' + err.message) },
            })
        } else if (['xlsx', 'xls'].includes(ext)) {
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const wb = XLSX.read(e.target.result, { type: 'array' })
                    const ws = wb.Sheets[wb.SheetNames[0]]
                    const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
                    processRows(data)
                } catch { setError('Failed to parse Excel file.') }
            }
            reader.readAsArrayBuffer(file)
        } else {
            setError('Unsupported file type. Upload a .csv or .xlsx file.')
        }
    }, [])

    function processRows(rawRows) {
        if (!rawRows.length) return setError('The file appears to be empty.')
        const normalized = rawRows.map(r => {
            const get = (field) => {
                const key = Object.keys(r).find(k => k.toLowerCase().trim() === field)
                return key ? r[key] : ''
            }
            return {
                id: `import-${Math.random().toString(36).slice(2)}`,
                description: get('description') || get('name') || get('item') || '',
                category: normalizeCategory(get('category') || get('type') || ''),
                quantity: parseFloat(get('quantity') || get('qty') || 1) || 1,
                unit_cost: parseFloat(get('unit_cost') || get('cost') || get('price') || 0) || 0,
            }
        }).filter(r => r.description)

        if (!normalized.length) return setError('No valid rows found. Ensure your file has a "description" column.')
        setRows(normalized)
    }

    function handleDragOver(e) { e.preventDefault(); setDragging(true) }
    function handleDragLeave() { setDragging(false) }
    function handleDrop(e) {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) parseFile(file)
    }
    function handleFileInput(e) {
        const file = e.target.files[0]
        if (file) parseFile(file)
    }

    function handleConfirm() {
        if (!rows?.length) return
        onImport(rows)
        toast.success(`Imported ${rows.length} cost item${rows.length !== 1 ? 's' : ''}!`)
        onClose()
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
                <div className="modal-title">
                    <FileSpreadsheet size={20} color="#2563eb" />
                    Import Cost Items
                    <button onClick={onClose} className="ctrl-btn" style={{ marginLeft: 'auto' }}><X size={18} /></button>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file. Supported columns:&nbsp;
                    <span className="code-pill">description</span>
                    <span className="code-pill">category</span>
                    <span className="code-pill">quantity</span>
                    <span className="code-pill">unit_cost</span>
                </p>

                {!rows ? (
                    <div
                        className={`dropzone ${dragging ? 'dropzone-active' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                    >
                        <input ref={inputRef} type="file" accept=".csv,.xls,.xlsx"
                            style={{ display: 'none' }} onChange={handleFileInput} />
                        <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {dragging ? 'Drop your file here…' : 'Drag & drop or click to browse'}
                        </p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>CSV, XLS, or XLSX</p>
                    </div>
                ) : (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <Check size={16} color="#16a34a" />
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#16a34a' }}>{fileName}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>— {rows.length} items</span>
                            <button onClick={() => { setRows(null); setFileName('') }}
                                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={15} />
                            </button>
                        </div>
                        <div style={{ maxHeight: 220, overflowY: 'auto', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-primary)' }}>
                                        {['Description', 'Category', 'Qty', 'Unit Cost'].map(h => (
                                            <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(r => (
                                        <tr key={r.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-primary)' }}>{r.description}</td>
                                            <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-secondary)' }}>{r.category}</td>
                                            <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-secondary)' }}>{r.quantity}</td>
                                            <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-secondary)' }}>TZS {r.unit_cost}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', color: '#dc2626', fontSize: '0.85rem' }}>
                        <AlertCircle size={15} /> {error}
                    </div>
                )}

                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleConfirm} disabled={!rows?.length}>
                        <Check size={15} /> Add {rows?.length || 0} Items
                    </button>
                </div>
            </div>
        </div>
    )
}
