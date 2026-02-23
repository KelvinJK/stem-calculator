import * as XLSX from 'xlsx'

function fmt(n) {
    return Number(n || 0).toFixed(2)
}

export function exportActivityExcel(session) {
    const wb = XLSX.utils.book_new()

    // ── Sheet 1: Summary ──────────────────────────────────────────
    const summaryData = [
        ['STEM Sessions — Cost Breakdown Report'],
        [],
        ['Session Name', session.name || 'Untitled'],
        ['Date', session.date || ''],
        ['Number of Students', session.studentCount || ''],
        ['Session Type', session.sessionType === 'invited' ? 'Invited Event' : 'Open Session'],
        ['Notes', session.notes || ''],
        [],
        ['PRICING SUMMARY'],
        ['Base Cost', fmt(session.baseCost)],
        session.sessionType === 'invited' ? ['Adjusted Cost (criteria)', fmt(session.adjustedCost)] : null,
        [`Profit (${session.profitMargin}%)`, fmt(session.profitAmount)],
        ['Suggested Session Price', fmt(session.suggestedPrice)],
        session.studentCount > 0 ? ['Price Per Student', fmt(session.pricePerStudent)] : null,
    ].filter(Boolean)

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

    // ── Sheet 2: Cost Items (all activities) ───────────────────────
    const costRows = [['Activity', 'Description', 'Category', 'Quantity', 'Unit Cost ($)', 'Total ($)']]
    const activities = session.activities || []
    activities.forEach(act => {
        ; (act.costItems || []).forEach(item => {
            const qty = parseFloat(item.quantity) || 0
            const unit = parseFloat(item.unit_cost) || 0
            costRows.push([act.name || 'Activity', item.description || '', item.category || '', qty, fmt(unit), fmt(qty * unit)])
        })
    })

    const costSheet = XLSX.utils.aoa_to_sheet(costRows)
    costSheet['!cols'] = [{ wch: 20 }, { wch: 28 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, costSheet, 'Cost Items')

    // ── Sheet 3: Criteria (invited events) ─────────────────────────
    if (session.sessionType === 'invited' && session.selectedCriteria?.length > 0) {
        const criteriaRows = [['Criterion', 'Effect']]
        session.selectedCriteria.forEach(c => {
            const effect = c.fixedCost ? `+$${c.fixedCost} fixed` : c.multiplier ? `×${c.multiplier}` : ''
            criteriaRows.push([c.label, effect])
        })
        const criteriaSheet = XLSX.utils.aoa_to_sheet(criteriaRows)
        criteriaSheet['!cols'] = [{ wch: 35 }, { wch: 20 }]
        XLSX.utils.book_append_sheet(wb, criteriaSheet, 'Session Criteria')
    }

    XLSX.writeFile(wb, `${session.name || 'session'}-cost-report.xlsx`)
}
