const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const db = require('../db')
const nodemailer = require('nodemailer')

function sign(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body
    if (!name || !email || !password)
        return res.status(400).json({ error: 'name, email and password are required' })
    if (password.length < 8)
        return res.status(400).json({ error: 'Password must be at least 8 characters' })

    try {
        const exists = await db.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()])
        if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' })

        const hash = await bcrypt.hash(password, 10)
        const { rows } = await db.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ($1,$2,$3,'marketing') RETURNING id,name,email,role`,
            [name.trim(), email.toLowerCase(), hash]
        )
        res.status(201).json({ token: sign(rows[0]), user: rows[0] })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'email and password required' })

    try {
        const { rows } = await db.query(
            'SELECT id,name,email,role,password_hash FROM users WHERE email=$1',
            [email.toLowerCase()]
        )
        if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' })

        const ok = await bcrypt.compare(password, rows[0].password_hash)
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

        const { password_hash, ...user } = rows[0]
        res.json({ token: sign(user), user })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body
    try {
        const { rows } = await db.query('SELECT id,name FROM users WHERE email=$1', [email])
        if (!rows.length) return res.json({ message: 'If that email exists, a reset link was sent.' })

        const token = crypto.randomBytes(32).toString('hex')
        const expires = new Date(Date.now() + 3600_000).toISOString()
        await db.query(
            'UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE email=$3',
            [token, expires, email]
        )

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT),
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        })
        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: 'STEM Calculator — Password Reset',
            html: `<p>Hi ${rows[0].name},</p><p><a href="${resetUrl}">Click here to reset your password</a> (expires in 1 hour).</p>`,
        })

        res.json({ message: 'If that email exists, a reset link was sent.' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body
    if (!token || !password || password.length < 8)
        return res.status(400).json({ error: 'Valid token and password (≥8 chars) required' })

    try {
        const { rows } = await db.query(
            'SELECT id FROM users WHERE reset_token=$1 AND reset_token_expires > NOW()',
            [token]
        )
        if (!rows.length) return res.status(400).json({ error: 'Token expired or invalid' })

        const hash = await bcrypt.hash(password, 10)
        await db.query(
            'UPDATE users SET password_hash=$1, reset_token=NULL, reset_token_expires=NULL WHERE id=$2',
            [hash, rows[0].id]
        )
        res.json({ message: 'Password reset successfully.' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// GET /api/auth/me  (verify token + get own profile)
const authMiddleware = require('../middleware/auth')
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id,name,email,role,created_at FROM users WHERE id=$1',
            [req.user.id]
        )
        if (!rows.length) return res.status(404).json({ error: 'User not found' })
        res.json(rows[0])
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

module.exports = router
