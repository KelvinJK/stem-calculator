const router = require('express').Router()
const db = require('../db')
const auth = require('../middleware/auth')
const requireRole = require('../middleware/roles')

// All admin routes require Admin role
router.use(auth, requireRole('admin'))

// ── Users ─────────────────────────────────────────────────────
// GET /api/admin/users
router.get('/users', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC'
        )
        res.json(rows)
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// PATCH /api/admin/users/:id/role — change user role
router.patch('/users/:id/role', async (req, res) => {
    const { role } = req.body
    if (!['admin', 'curator', 'marketing'].includes(role))
        return res.status(400).json({ error: 'role must be admin, curator, or marketing' })
    if (req.params.id === req.user.id)
        return res.status(400).json({ error: 'Cannot change your own role' })
    try {
        await db.query('UPDATE users SET role=$1 WHERE id=$2', [role, req.params.id])
        res.json({ message: `User role updated to ${role}` })
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
    if (req.params.id === req.user.id)
        return res.status(400).json({ error: 'Cannot delete yourself' })
    try {
        await db.query('DELETE FROM users WHERE id=$1', [req.params.id])
        res.json({ message: 'User deleted' })
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Sessions (admin view of all) ──────────────────────────────
// GET /api/admin/sessions/pending
router.get('/sessions/pending', async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT s.*, u.name AS created_by_name FROM sessions s
             LEFT JOIN users u ON u.id = s.created_by
             WHERE s.status = 'pending' ORDER BY s.created_at ASC`
        )
        res.json(rows)
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Analytics ─────────────────────────────────────────────────
// GET /api/admin/analytics
router.get('/analytics', async (req, res) => {
    try {
        const [userStats, sessionStats, topActivities, monthlyBreakdown] = await Promise.all([
            // User counts by role
            db.query(`SELECT role, COUNT(*)::int AS count FROM users GROUP BY role`),

            // Session stats
            db.query(`
                SELECT
                    COUNT(*)::int AS total_sessions,
                    COUNT(*) FILTER (WHERE status='approved')::int AS approved,
                    COUNT(*) FILTER (WHERE status='pending')::int AS pending,
                    COUNT(*) FILTER (WHERE status='rejected')::int AS rejected,
                    COUNT(*) FILTER (WHERE status='draft')::int AS draft
                FROM sessions`),

            // Most-used activities (by session count)
            db.query(`
                SELECT a.name, a.category, COUNT(sa.id)::int AS usage_count
                FROM session_activities sa
                JOIN activities a ON a.id = sa.activity_id
                GROUP BY a.id, a.name, a.category
                ORDER BY usage_count DESC LIMIT 10`),

            // Sessions created per month (last 12)
            db.query(`
                SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
                       COUNT(*)::int AS count
                FROM sessions
                WHERE created_at >= NOW() - INTERVAL '12 months'
                GROUP BY DATE_TRUNC('month', created_at)
                ORDER BY DATE_TRUNC('month', created_at) ASC`),
        ])

        res.json({
            users: userStats.rows,
            sessions: sessionStats.rows[0],
            topActivities: topActivities.rows,
            monthlyActivity: monthlyBreakdown.rows,
        })
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/admin/materials/categories
router.get('/materials/categories', async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT DISTINCT category FROM materials WHERE is_archived=FALSE AND category IS NOT NULL ORDER BY category`
        )
        res.json(rows.map(r => r.category))
    } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
