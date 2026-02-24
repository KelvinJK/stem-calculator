const router = require('express').Router()
const path = require('path')
const db = require('../db')
const auth = require('../middleware/auth')
const requireRole = require('../middleware/roles')
const { generateInvoicePDF, INVOICE_DIR } = require('../services/pdfService')

// POST /api/invoices/:sessionId — generate PDF (Admin only after approval)
router.post('/:sessionId', auth, requireRole('admin'), async (req, res) => {
    try {
        // Check session exists and is approved
        const { rows: sr } = await db.query(
            `SELECT s.*, u.name AS created_by_name FROM sessions s
             LEFT JOIN users u ON u.id = s.created_by
             WHERE s.id = $1`,
            [req.params.sessionId]
        )
        if (!sr.length) return res.status(404).json({ error: 'Session not found' })
        if (sr[0].status !== 'approved')
            return res.status(400).json({ error: 'Session must be approved before generating an invoice' })

        // Check if invoice already exists
        const { rows: ir } = await db.query(
            'SELECT * FROM invoices WHERE session_id=$1', [req.params.sessionId]
        )
        if (ir.length) return res.json(ir[0])   // Idempotent — return existing

        // Generate invoice number
        const { rows: seq } = await db.query("SELECT nextval('invoice_seq') AS n")
        const invoiceNumber = `STEM-${new Date().getFullYear()}-${String(seq[0].n).padStart(4, '0')}`

        // Build breakdown for PDF
        const actRows = await db.query(
            `SELECT a.id, a.name FROM session_activities sa
             JOIN activities a ON a.id = sa.activity_id
             WHERE sa.session_id = $1 ORDER BY sa.sort_order`,
            [req.params.sessionId]
        )
        const { computeSession } = require('../services/costEngine')
        const activitiesWithMaterials = []
        for (const act of actRows.rows) {
            const matRows = await db.query(
                `SELECT am.*, m.name, m.unit_type, m.pack_size, m.pack_price
                 FROM activity_materials am JOIN materials m ON m.id = am.material_id
                 WHERE am.activity_id = $1 ORDER BY am.sort_order`,
                [act.id]
            )
            activitiesWithMaterials.push({
                activity: act,
                materials: matRows.rows.map(r => ({ mat: r, am: r })),
            })
        }
        const { breakdown, totalCost, price, profit, pricePerStudent } =
            computeSession(activitiesWithMaterials, sr[0].student_count, sr[0].margin_pct)

        const sessionForPDF = { ...sr[0], totalCost, price, profit, pricePerStudent }
        const invoiceForPDF = { invoice_number: invoiceNumber, issued_at: new Date() }

        // Generate PDF
        const pdfPath = await generateInvoicePDF(sessionForPDF, breakdown, invoiceForPDF)
        const relPath = path.relative(INVOICE_DIR, pdfPath)

        // Save to DB
        const { rows: inv } = await db.query(
            `INSERT INTO invoices (session_id,invoice_number,pdf_path,issued_by)
             VALUES ($1,$2,$3,$4) RETURNING *`,
            [req.params.sessionId, invoiceNumber, `/invoices/${relPath}`, req.user.id]
        )
        res.status(201).json(inv[0])
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: err.message })
    }
})

// GET /api/invoices/:sessionId — get invoice metadata
router.get('/:sessionId', auth, async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT iv.*, u.name AS issued_by_name
             FROM invoices iv LEFT JOIN users u ON u.id = iv.issued_by
             WHERE iv.session_id = $1`,
            [req.params.sessionId]
        )
        if (!rows.length) return res.status(404).json({ error: 'Invoice not yet generated' })
        res.json(rows[0])
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/invoices/download/:invoiceId — serve PDF
router.get('/download/:invoiceId', auth, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM invoices WHERE id=$1', [req.params.invoiceId])
        if (!rows.length) return res.status(404).json({ error: 'Invoice not found' })

        const filePath = path.join(INVOICE_DIR, rows[0].invoice_number + '.pdf')
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="${rows[0].invoice_number}.pdf"`)
        res.sendFile(filePath)
    } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
