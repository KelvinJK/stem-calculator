const router = require('express').Router()
const db = require('../db')
const auth = require('../middleware/auth')
const requireRole = require('../middleware/roles')
const { computeSession } = require('../services/costEngine')

// ── Helpers ───────────────────────────────────────────────────
async function buildSessionPayload(sessionId, studentCount, marginPct) {
    const actRows = await db.query(
        `SELECT a.id AS activity_id, a.name AS activity_name
         FROM session_activities sa
         JOIN activities a ON a.id = sa.activity_id
         WHERE sa.session_id = $1 ORDER BY sa.sort_order`,
        [sessionId]
    )

    const activitiesWithMaterials = []
    for (const act of actRows.rows) {
        const matRows = await db.query(
            `SELECT am.*, m.name, m.unit_type, m.pack_size, m.pack_price
             FROM activity_materials am
             JOIN materials m ON m.id = am.material_id
             WHERE am.activity_id = $1 ORDER BY am.sort_order`,
            [act.activity_id]
        )
        activitiesWithMaterials.push({
            activity: { id: act.activity_id, name: act.activity_name },
            materials: matRows.rows.map(r => ({ mat: r, am: r })),
        })
    }
    return computeSession(activitiesWithMaterials, studentCount, marginPct)
}

// GET /api/sessions — own sessions (Marketing); all sessions (Admin)
router.get('/', auth, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin'
        const { status } = req.query
        let sql = `
            SELECT s.*, u.name AS created_by_name
            FROM sessions s
            LEFT JOIN users u ON s.created_by = u.id
            WHERE 1=1`
        const params = []
        if (!isAdmin) { params.push(req.user.id); sql += ` AND s.created_by = $${params.length}` }
        if (status) { params.push(status); sql += ` AND s.status = $${params.length}` }
        sql += ' ORDER BY s.created_at DESC'
        const { rows } = await db.query(sql, params)
        res.json(rows)
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/sessions/:id — detail with cost breakdown
router.get('/:id', auth, async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT s.*, u.name AS created_by_name,
                    iv.invoice_number, iv.id AS invoice_id, iv.pdf_path
             FROM sessions s
             LEFT JOIN users u ON s.created_by = u.id
             LEFT JOIN invoices iv ON iv.session_id = s.id
             WHERE s.id = $1`,
            [req.params.id]
        )
        if (!rows.length) return res.status(404).json({ error: 'Not found' })
        const session = rows[0]

        // Enforce ownership for non-admin
        if (req.user.role !== 'admin' && session.created_by !== req.user.id)
            return res.status(403).json({ error: 'Access denied' })

        const { breakdown, totalCost, price, profit, pricePerStudent } =
            await buildSessionPayload(session.id, session.student_count, session.margin_pct)

        res.json({ ...session, totalCost, price, profit, pricePerStudent, breakdown })
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/sessions — any authenticated user (Marketing creates drafts)
router.post('/', auth, async (req, res) => {
    const { name, client_name, client_contact, student_count, margin_pct, notes, activity_ids } = req.body
    if (!name || !activity_ids?.length)
        return res.status(400).json({ error: 'name and activity_ids[] are required' })

    const client = await db.pool.connect()
    try {
        await client.query('BEGIN')
        const { rows } = await client.query(
            `INSERT INTO sessions (name,client_name,client_contact,student_count,margin_pct,notes,created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [name, client_name || null, client_contact || null,
                student_count || 20, margin_pct || 30, notes || null, req.user.id]
        )
        const session = rows[0]

        for (const [i, aid] of activity_ids.entries()) {
            await client.query(
                `INSERT INTO session_activities (session_id,activity_id,sort_order) VALUES ($1,$2,$3)`,
                [session.id, aid, i]
            )
        }
        await client.query('COMMIT')

        const pricing = await buildSessionPayload(session.id, session.student_count, session.margin_pct)
        res.status(201).json({ ...session, ...pricing })
    } catch (err) {
        await client.query('ROLLBACK')
        res.status(500).json({ error: err.message })
    } finally { client.release() }
})

// PUT /api/sessions/:id — update (only owner can edit draft/rejected)
router.put('/:id', auth, async (req, res) => {
    const { name, client_name, client_contact, student_count, margin_pct, notes, activity_ids } = req.body
    const client = await db.pool.connect()
    try {
        const existing = await client.query('SELECT * FROM sessions WHERE id=$1', [req.params.id])
        if (!existing.rows.length) return res.status(404).json({ error: 'Not found' })
        const s = existing.rows[0]

        if (req.user.role !== 'admin' && s.created_by !== req.user.id)
            return res.status(403).json({ error: 'Access denied' })
        if (!['draft', 'rejected'].includes(s.status) && req.user.role !== 'admin')
            return res.status(400).json({ error: 'Cannot edit a submitted or approved session' })

        await client.query('BEGIN')
        const { rows } = await client.query(
            `UPDATE sessions SET name=$1,client_name=$2,client_contact=$3,student_count=$4,
             margin_pct=$5,notes=$6 WHERE id=$7 RETURNING *`,
            [name ?? s.name, client_name ?? s.client_name, client_contact ?? s.client_contact,
            student_count ?? s.student_count, margin_pct ?? s.margin_pct, notes ?? s.notes, s.id]
        )

        if (activity_ids) {
            await client.query('DELETE FROM session_activities WHERE session_id=$1', [s.id])
            for (const [i, aid] of activity_ids.entries()) {
                await client.query(
                    'INSERT INTO session_activities (session_id,activity_id,sort_order) VALUES ($1,$2,$3)',
                    [s.id, aid, i]
                )
            }
        }
        await client.query('COMMIT')
        const pricing = await buildSessionPayload(rows[0].id, rows[0].student_count, rows[0].margin_pct)
        res.json({ ...rows[0], ...pricing })
    } catch (err) {
        await client.query('ROLLBACK')
        res.status(500).json({ error: err.message })
    } finally { client.release() }
})

// PATCH /api/sessions/:id/submit — Marketing submits draft for approval
router.patch('/:id/submit', auth, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM sessions WHERE id=$1', [req.params.id])
        if (!rows.length) return res.status(404).json({ error: 'Not found' })
        if (rows[0].created_by !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ error: 'Access denied' })
        if (rows[0].status !== 'draft' && rows[0].status !== 'rejected')
            return res.status(400).json({ error: 'Only draft or rejected sessions can be submitted' })

        await db.query("UPDATE sessions SET status='pending' WHERE id=$1", [req.params.id])
        res.json({ message: 'Session submitted for approval' })
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// PATCH /api/sessions/:id/approve — Admin only
router.patch('/:id/approve', auth, requireRole('admin'), async (req, res) => {
    try {
        await db.query(
            `UPDATE sessions SET status='approved', approved_by=$1, approved_at=NOW() WHERE id=$2`,
            [req.user.id, req.params.id]
        )
        res.json({ message: 'Session approved' })
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// PATCH /api/sessions/:id/reject — Admin only
router.patch('/:id/reject', auth, requireRole('admin'), async (req, res) => {
    try {
        const { note } = req.body
        await db.query(
            `UPDATE sessions SET status='rejected', rejection_note=$1 WHERE id=$2`,
            [note || null, req.params.id]
        )
        res.json({ message: 'Session rejected' })
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/sessions/:id — owner can delete draft; Admin can delete any
router.delete('/:id', auth, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM sessions WHERE id=$1', [req.params.id])
        if (!rows.length) return res.status(404).json({ error: 'Not found' })
        if (req.user.role !== 'admin' && rows[0].created_by !== req.user.id)
            return res.status(403).json({ error: 'Access denied' })
        await db.query('DELETE FROM sessions WHERE id=$1', [req.params.id])
        res.json({ message: 'Session deleted' })
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/sessions/:id/quote — live cost preview (doesn't save)
router.get('/:id/quote', auth, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM sessions WHERE id=$1', [req.params.id])
        if (!rows.length) return res.status(404).json({ error: 'Not found' })
        const s = rows[0]
        const override = {
            studentCount: req.query.students ? Number(req.query.students) : s.student_count,
            margin: req.query.margin ? Number(req.query.margin) : s.margin_pct,
        }
        const result = await buildSessionPayload(s.id, override.studentCount, override.margin)
        res.json(result)
    } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
