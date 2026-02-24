const router = require('express').Router()
const db = require('../db')
const auth = require('../middleware/auth')
const requireRole = require('../middleware/roles')

// ── Helpers ───────────────────────────────────────────────────
async function getActivityWithMaterials(id) {
    const act = await db.query('SELECT * FROM activities WHERE id=$1', [id])
    if (!act.rows.length) return null

    const mats = await db.query(
        `SELECT am.*, m.name AS material_name, m.unit_type, m.pack_size, m.pack_price
         FROM activity_materials am
         JOIN materials m ON m.id = am.material_id
         WHERE am.activity_id = $1
         ORDER BY am.sort_order, am.id`,
        [id]
    )
    return { ...act.rows[0], materials: mats.rows }
}

// GET /api/activities — all visible activities
router.get('/', auth, async (req, res) => {
    try {
        const { category, q } = req.query
        let sql = `
            SELECT a.*, u.name AS created_by_name,
                   COUNT(am.id)::int AS material_count
            FROM activities a
            LEFT JOIN users u ON a.created_by = u.id
            LEFT JOIN activity_materials am ON am.activity_id = a.id
            WHERE a.is_archived = FALSE`
        const params = []
        if (category) { params.push(category); sql += ` AND a.category = $${params.length}` }
        if (q) { params.push(`%${q}%`); sql += ` AND a.name ILIKE $${params.length}` }
        sql += ' GROUP BY a.id, u.name ORDER BY a.category, a.name'
        const { rows } = await db.query(sql, params)
        res.json(rows)
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/activities/:id — full detail with materials
router.get('/:id', auth, async (req, res) => {
    try {
        const activity = await getActivityWithMaterials(req.params.id)
        if (!activity) return res.status(404).json({ error: 'Not found' })
        res.json(activity)
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/activities — Curator/Admin
router.post('/', auth, requireRole('admin', 'curator'), async (req, res) => {
    const { name, category, age_group, duration_mins, default_students, description, materials } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })

    const client = await db.pool.connect()
    try {
        await client.query('BEGIN')
        const { rows } = await client.query(
            `INSERT INTO activities (name,category,age_group,duration_mins,default_students,description,created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [name, category || 'Science', age_group || null, duration_mins || null,
                default_students || 20, description || null, req.user.id]
        )
        const activity = rows[0]

        if (materials && materials.length) {
            for (const [i, m] of materials.entries()) {
                await client.query(
                    `INSERT INTO activity_materials
                     (activity_id,material_id,qty_used,consumption_mode,group_size,waste_pct,manual_override,manual_unit_cost,sort_order)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                    [activity.id, m.material_id, m.qty_used, m.consumption_mode || 'per_student',
                    m.group_size || 1, m.waste_pct || 0, !!m.manual_override,
                    m.manual_unit_cost || null, i]
                )
            }
        }
        await client.query('COMMIT')
        res.status(201).json(await getActivityWithMaterials(activity.id))
    } catch (err) {
        await client.query('ROLLBACK')
        res.status(500).json({ error: err.message })
    } finally { client.release() }
})

// PUT /api/activities/:id — Curator/Admin (cannot modify locked activities unless Admin)
router.put('/:id', auth, requireRole('admin', 'curator'), async (req, res) => {
    const { name, category, age_group, duration_mins, default_students, description, materials } = req.body
    const client = await db.pool.connect()
    try {
        const existing = await client.query('SELECT * FROM activities WHERE id=$1', [req.params.id])
        if (!existing.rows.length) return res.status(404).json({ error: 'Not found' })
        if (existing.rows[0].is_locked && req.user.role !== 'admin')
            return res.status(403).json({ error: 'Activity is locked. Only Admin can edit.' })

        await client.query('BEGIN')
        await client.query(
            `UPDATE activities SET name=$1,category=$2,age_group=$3,duration_mins=$4,
             default_students=$5,description=$6 WHERE id=$7`,
            [name ?? existing.rows[0].name, category ?? existing.rows[0].category,
            age_group ?? existing.rows[0].age_group, duration_mins ?? existing.rows[0].duration_mins,
            default_students ?? existing.rows[0].default_students,
            description ?? existing.rows[0].description, req.params.id]
        )

        if (materials) {
            await client.query('DELETE FROM activity_materials WHERE activity_id=$1', [req.params.id])
            for (const [i, m] of materials.entries()) {
                await client.query(
                    `INSERT INTO activity_materials
                     (activity_id,material_id,qty_used,consumption_mode,group_size,waste_pct,manual_override,manual_unit_cost,sort_order)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                    [req.params.id, m.material_id, m.qty_used, m.consumption_mode || 'per_student',
                    m.group_size || 1, m.waste_pct || 0, !!m.manual_override,
                    m.manual_unit_cost || null, i]
                )
            }
        }
        await client.query('COMMIT')
        res.json(await getActivityWithMaterials(req.params.id))
    } catch (err) {
        await client.query('ROLLBACK')
        res.status(500).json({ error: err.message })
    } finally { client.release() }
})

// PATCH /api/activities/:id/lock — Admin only
router.patch('/:id/lock', auth, requireRole('admin'), async (req, res) => {
    try {
        const { locked } = req.body
        await db.query('UPDATE activities SET is_locked=$1 WHERE id=$2', [!!locked, req.params.id])
        res.json({ message: locked ? 'Activity locked' : 'Activity unlocked' })
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/activities/:id — Admin only (archive)
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
    try {
        await db.query('UPDATE activities SET is_archived=TRUE WHERE id=$1', [req.params.id])
        res.json({ message: 'Activity archived' })
    } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
