require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')

const app = express()

// ── CORS ────────────────────────────────────────────────────
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
}))

// ── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Static: serve generated PDFs ─────────────────────────────
app.use('/invoices', express.static(path.join(__dirname, '../invoices')))

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'))
app.use('/api/materials', require('./routes/materials'))
app.use('/api/activities', require('./routes/activities'))
app.use('/api/sessions', require('./routes/sessions'))
app.use('/api/invoices', require('./routes/invoices'))
app.use('/api/admin', require('./routes/admin'))

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }))

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err)
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`✅  STEM API running on port ${PORT}`))

module.exports = app
