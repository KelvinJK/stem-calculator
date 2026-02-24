/**
 * Role-based access control middleware.
 *
 * Usage:
 *   router.post('/materials', auth, requireRole('admin','curator'), handler)
 */
module.exports = function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Unauthenticated' })
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Access denied. Required role: ${roles.join(' or ')}`,
            })
        }
        next()
    }
}
