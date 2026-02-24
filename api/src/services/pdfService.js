const PDFDocument = require('pdfkit')
const path = require('path')
const fs = require('fs')

const INVOICE_DIR = path.join(__dirname, '../../invoices')
if (!fs.existsSync(INVOICE_DIR)) fs.mkdirSync(INVOICE_DIR, { recursive: true })

/**
 * Generate a PDF invoice and save it to disk.
 * Returns the path to the generated file.
 */
async function generateInvoicePDF(session, breakdown, invoice) {
    const filename = `${invoice.invoice_number}.pdf`
    const filepath = path.join(INVOICE_DIR, filename)

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' })
        const stream = fs.createWriteStream(filepath)
        doc.pipe(stream)

        const W = doc.page.width - 100   // usable width
        const PRIMARY = '#1e3a5f'
        const ACCENT = '#2563eb'
        const MUTED = '#64748b'

        // ── Header ─────────────────────────────────────────────
        doc.rect(0, 0, doc.page.width, 90).fill(PRIMARY)
        doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
            .text('STEM Session Cost Calculator', 50, 28)
        doc.fontSize(10).font('Helvetica')
            .text('Professional Costing & Invoicing', 50, 55)

        doc.fillColor(PRIMARY).fontSize(10).font('Helvetica-Bold')
            .text(`INVOICE`, 400, 28, { width: 145, align: 'right' })
        doc.fillColor('white').font('Helvetica')
            .text(`#${invoice.invoice_number}`, 400, 44, { width: 145, align: 'right' })
            .text(`Date: ${new Date(invoice.issued_at).toLocaleDateString('en-TZ')}`, 400, 58, { width: 145, align: 'right' })

        let y = 110

        // ── Client info ────────────────────────────────────────
        doc.fillColor(PRIMARY).fontSize(11).font('Helvetica-Bold').text('Session Details', 50, y)
        y += 18
        doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica')
        const details = [
            ['Client', session.client_name || '—'],
            ['Contact', session.client_contact || '—'],
            ['Session', session.name],
            ['Students', String(session.student_count)],
            ['Status', session.status.toUpperCase()],
        ]
        for (const [k, v] of details) {
            doc.font('Helvetica-Bold').text(k + ':', 50, y, { width: 100, continued: false })
            doc.font('Helvetica').text(v, 155, y)
            y += 15
        }
        if (session.notes) {
            doc.font('Helvetica-Bold').text('Notes:', 50, y)
            doc.font('Helvetica').text(session.notes, 155, y, { width: W - 105 })
            y += 15
        }
        y += 10

        // ── Activity breakdown ─────────────────────────────────
        for (const act of breakdown) {
            // Activity header bar
            doc.rect(50, y, W, 18).fill('#e8edf5')
            doc.fillColor(PRIMARY).fontSize(9.5).font('Helvetica-Bold')
                .text(act.activityName, 55, y + 4, { width: W - 100 })
            y += 22

            // Column headers
            const cols = [0, 180, 250, 310, 370, 440]
            const headers = ['Material', 'Mode', 'Qty', 'Unit Cost', 'Count', 'Total (TZS)']
            doc.fillColor(MUTED).fontSize(8).font('Helvetica-Bold')
            headers.forEach((h, i) => doc.text(h, 50 + cols[i], y, { width: cols[i + 1] ? cols[i + 1] - cols[i] : 100 }))
            y += 14
            doc.moveTo(50, y).lineTo(50 + W, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke()
            y += 4

            for (const line of act.lines) {
                if (y > 700) { doc.addPage(); y = 50 }
                doc.fillColor('#0f172a').fontSize(8).font('Helvetica')
                doc.text(line.materialName, 50 + cols[0], y, { width: 130 })
                doc.text(line.consumptionMode.replace('_', ' '), 50 + cols[1], y, { width: 70 })
                doc.text(String(line.qtyUsed) + ' ' + line.unitType, 50 + cols[2], y, { width: 60 })
                doc.text(fmt(line.unitCost), 50 + cols[3], y, { width: 60 })
                doc.text(String(line.multiplier), 50 + cols[4], y, { width: 60 })
                doc.text(fmt(line.itemTotal), 50 + cols[5], y, { width: 100 })
                y += 13
            }

            // Activity subtotal
            doc.font('Helvetica-Bold').fillColor(ACCENT)
                .text(`Subtotal: TZS ${fmt(act.activityTotal)}`, 50, y, { align: 'right', width: W })
            y += 18
        }

        // ── Summary box ────────────────────────────────────────
        y += 5
        doc.rect(50, y, W, 90).fill('#f0f4f8').stroke('#e2e8f0')
        y += 10
        const summaryRows = [
            ['Total Material Cost', fmt(session.totalCost)],
            [`Profit (${session.margin_pct}% margin)`, fmt(session.profit)],
            ['Suggested Price', fmt(session.price)],
            ['Price per Student', fmt(session.pricePerStudent)],
        ]
        for (const [label, val] of summaryRows) {
            doc.fillColor(label.startsWith('Suggested') ? PRIMARY : MUTED)
                .font(label.startsWith('Suggested') ? 'Helvetica-Bold' : 'Helvetica')
                .fontSize(label.startsWith('Suggested') ? 10.5 : 9)
                .text(label, 65, y)
                .text('TZS ' + val, 0, y, { align: 'right', width: W + 50 - 15 })
            y += label.startsWith('Suggested') ? 16 : 14
        }
        y += 15

        // ── Footer ─────────────────────────────────────────────
        doc.fillColor(MUTED).fontSize(8).font('Helvetica')
            .text('Generated by STEM Session Cost Calculator', 50, doc.page.height - 40, { align: 'center', width: W })

        doc.end()
        stream.on('finish', () => resolve(filepath))
        stream.on('error', reject)
    })
}

function fmt(n) {
    return Number(n || 0).toLocaleString('en-TZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

module.exports = { generateInvoicePDF, INVOICE_DIR }
