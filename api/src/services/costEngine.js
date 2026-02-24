/**
 * costEngine.js — Core pricing calculation logic for STEM sessions.
 *
 * All monetary values are in TZS.
 * Pricing formula: Option B — Price = Cost ÷ (1 − Margin)
 */

/**
 * Round a TZS value to the nearest 5.
 */
function round5(n) {
    return Math.round(n / 5) * 5
}

/**
 * Calculate the effective unit cost for one activity_material row.
 *
 * If manual_override is true, use manual_unit_cost directly.
 * Otherwise: unitCost = (pack_price / pack_size) × (1 + waste_pct / 100)
 *
 * @param {Object} mat  - material row (pack_price, pack_size)
 * @param {Object} am   - activity_material row (manual_override, manual_unit_cost, waste_pct)
 * @returns {number}
 */
function calcUnitCost(mat, am) {
    if (am.manual_override && am.manual_unit_cost != null) {
        return Number(am.manual_unit_cost)
    }
    const base = Number(mat.pack_price) / Number(mat.pack_size)
    const waste = 1 + Number(am.waste_pct || 0) / 100
    return base * waste
}

/**
 * Calculate the total cost of one activity_material line item
 * given the student count and consumption mode.
 *
 * @param {number} unitCost
 * @param {Object} am           - activity_material row
 * @param {number} studentCount
 * @returns {{ raw: number, rounded: number, multiplier: number }}
 */
function calcItemTotal(unitCost, am, studentCount) {
    const qty = Number(am.qty_used)
    let multiplier

    switch (am.consumption_mode) {
        case 'per_student':
            multiplier = studentCount
            break
        case 'per_group':
            const gs = Math.max(1, Number(am.group_size || 1))
            multiplier = Math.ceil(studentCount / gs)
            break
        case 'per_session':
        default:
            multiplier = 1
    }

    const raw = unitCost * qty * multiplier
    return { raw, rounded: round5(raw), multiplier }
}

/**
 * Calculate full session pricing.
 *
 * @param {number} totalMaterialCost - Sum of all rounded item totals (TZS)
 * @param {number} marginPct         - e.g. 30 for 30%
 * @param {number} studentCount
 * @returns {{ totalCost, price, profit, pricePerStudent }}
 */
function calcSessionPrice(totalMaterialCost, marginPct, studentCount) {
    const margin = Number(marginPct) / 100
    if (margin >= 1) throw new Error('Margin must be less than 100%')

    const price = totalMaterialCost / (1 - margin)
    const profit = price - totalMaterialCost
    const pricePerStudent = studentCount > 0 ? price / studentCount : 0

    return {
        totalCost: round5(totalMaterialCost),
        price: round5(price),
        profit: round5(profit),
        pricePerStudent: round5(pricePerStudent),
    }
}

/**
 * Full session cost computation from DB rows.
 *
 * @param {Array}  activitiesWithMaterials  - Each: { activity, materials: [{mat, am}] }
 * @param {number} studentCount
 * @param {number} marginPct
 * @returns {Object} complete breakdown
 */
function computeSession(activitiesWithMaterials, studentCount, marginPct) {
    let grandTotal = 0
    const breakdown = []

    for (const { activity, materials } of activitiesWithMaterials) {
        let activityTotal = 0
        const lines = []

        for (const { mat, am } of materials) {
            const unitCost = calcUnitCost(mat, am)
            const { raw, rounded, multiplier } = calcItemTotal(unitCost, am, studentCount)
            activityTotal += rounded
            lines.push({
                materialId: mat.id,
                materialName: mat.name,
                unitType: mat.unit_type,
                packPrice: Number(mat.pack_price),
                packSize: Number(mat.pack_size),
                unitCost: Math.round(unitCost * 10000) / 10000,
                qtyUsed: Number(am.qty_used),
                consumptionMode: am.consumption_mode,
                multiplier,
                wastePct: Number(am.waste_pct || 0),
                itemTotal: rounded,
            })
        }

        grandTotal += activityTotal
        breakdown.push({
            activityId: activity.id,
            activityName: activity.name,
            lines,
            activityTotal,
        })
    }

    const pricing = calcSessionPrice(grandTotal, marginPct, studentCount)

    return { breakdown, ...pricing }
}

module.exports = {
    round5,
    calcUnitCost,
    calcItemTotal,
    calcSessionPrice,
    computeSession,
}
