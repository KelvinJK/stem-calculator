const router = require('express').Router()
const db = require('../db')
const auth = require('../middleware/auth')
const requireRole = require('../middleware/roles')

// GET /api/materials — all (authenticated)
router.get('/', auth, async (req, res) => {
    try {
        const { q, category } = req.query
        let sql = `
            SELECT m.*, u.name AS created_by_name,
                   (SELECT json_build_object('pack_price', pv.pack_price, 'pack_size', pv.pack_size, 'effective_from', pv.effective_from)
                    FROM price_versions pv WHERE pv.material_id = m.id ORDER BY pv.effective_from DESC LIMIT 1) AS latest_version
            FROM materials m
            LEFT JOIN users u ON m.created_by = u.id
            WHERE m.is_archived = FALSE`
        const params = []
        if (q) { params.push(`%${q}%`); sql += ` AND m.name ILIKE $${params.length}` }
        if (category) { params.push(category); sql += ` AND m.category = $${params.length}` }
        sql += ' ORDER BY m.category, m.name'
        const { rows } = await db.query(sql, params)
        res.json(rows)
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/materials/:id — single material + full price history
router.get('/:id', auth, async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT m.*,
                    COALESCE(json_agg(pv ORDER BY pv.effective_from DESC) FILTER (WHERE pv.id IS NOT NULL), '[]') AS price_history
             FROM materials m
             LEFT JOIN price_versions pv ON pv.material_id = m.id
             WHERE m.id = $1 GROUP BY m.id`,
            [req.params.id]
        )
        if (!rows.length) return res.status(404).json({ error: 'Not found' })
        res.json(rows[0])
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/materials — Curator/Admin only
router.post('/', auth, requireRole('admin', 'curator'), async (req, res) => {
    const { name, unit_type, pack_size, pack_price, category, notes } = req.body
    if (!name || !pack_size || !pack_price)
        return res.status(400).json({ error: 'name, pack_size, pack_price are required' })
    try {
        const { rows } = await db.query(
            `INSERT INTO materials (name,unit_type,pack_size,pack_price,category,notes,created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [name, unit_type || 'pcs', pack_size, pack_price, category || null, notes || null, req.user.id]
        )
        // Record first price version
        await db.query(
            `INSERT INTO price_versions (material_id,pack_price,pack_size,set_by)
             VALUES ($1,$2,$3,$4)`,
            [rows[0].id, pack_price, pack_size, req.user.id]
        )
        res.status(201).json(rows[0])
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/materials/:id — Curator/Admin only
router.put('/:id', auth, requireRole('admin', 'curator'), async (req, res) => {
    const { name, unit_type, pack_size, pack_price, category, notes } = req.body
    try {
        const before = await db.query('SELECT * FROM materials WHERE id=$1', [req.params.id])
        if (!before.rows.length) return res.status(404).json({ error: 'Not found' })

        const { rows } = await db.query(
            `UPDATE materials SET name=$1,unit_type=$2,pack_size=$3,pack_price=$4,category=$5,notes=$6
             WHERE id=$7 RETURNING *`,
            [
                name ?? before.rows[0].name,
                unit_type ?? before.rows[0].unit_type,
                pack_size ?? before.rows[0].pack_size,
                pack_price ?? before.rows[0].pack_price,
                category ?? before.rows[0].category,
                notes ?? before.rows[0].notes,
                req.params.id,
            ]
        )

        // If price changed, record a version
        if (pack_price && Number(pack_price) !== Number(before.rows[0].pack_price)) {
            await db.query(
                `INSERT INTO price_versions (material_id,pack_price,pack_size,set_by)
                 VALUES ($1,$2,$3,$4)`,
                [req.params.id, pack_price, pack_size ?? before.rows[0].pack_size, req.user.id]
            )
        }
        res.json(rows[0])
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/materials/:id — Admin only (archive, not hard delete)
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
    try {
        await db.query('UPDATE materials SET is_archived=TRUE WHERE id=$1', [req.params.id])
        res.json({ message: 'Material archived' })
    } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
