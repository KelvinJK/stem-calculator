const { round5, calcUnitCost, calcItemTotal, calcSessionPrice, computeSession } = require('./costEngine')

describe('round5', () => {
    test('rounds to nearest 5', () => {
        expect(round5(202)).toBe(200)
        expect(round5(203)).toBe(205)
        expect(round5(250)).toBe(250)
        expect(round5(0)).toBe(0)
    })
})

describe('calcUnitCost', () => {
    const mat = { pack_price: 5000, pack_size: 50 }

    test('auto-calc: pack_price / pack_size', () => {
        const am = { manual_override: false, waste_pct: 0 }
        expect(calcUnitCost(mat, am)).toBeCloseTo(100)
    })

    test('auto-calc with waste factor', () => {
        const am = { manual_override: false, waste_pct: 10 }
        expect(calcUnitCost(mat, am)).toBeCloseTo(110)
    })

    test('manual override ignores pack math', () => {
        const am = { manual_override: true, manual_unit_cost: 75, waste_pct: 50 }
        expect(calcUnitCost(mat, am)).toBe(75)
    })

    test('baking powder example: 500/30 = 16.67 per gram', () => {
        const m2 = { pack_price: 500, pack_size: 30 }
        const am = { manual_override: false, waste_pct: 0 }
        expect(calcUnitCost(m2, am)).toBeCloseTo(16.6667, 3)
    })
})

describe('calcItemTotal', () => {
    const unitCost = 100

    test('per_student × studentCount', () => {
        const am = { consumption_mode: 'per_student', qty_used: 2, group_size: 1 }
        const { raw, multiplier } = calcItemTotal(unitCost, am, 20)
        expect(multiplier).toBe(20)
        expect(raw).toBe(4000)        // 100 × 2 × 20
    })

    test('per_group: ceil(students / groupSize)', () => {
        const am = { consumption_mode: 'per_group', qty_used: 1, group_size: 4 }
        const { multiplier } = calcItemTotal(unitCost, am, 20)
        expect(multiplier).toBe(5)   // 20 / 4 = 5
    })

    test('per_group: ceil for fractional groups', () => {
        const am = { consumption_mode: 'per_group', qty_used: 1, group_size: 4 }
        const { multiplier } = calcItemTotal(unitCost, am, 21)
        expect(multiplier).toBe(6)   // ceil(21/4) = 6
    })

    test('per_session: fixed multiplier = 1', () => {
        const am = { consumption_mode: 'per_session', qty_used: 3, group_size: 1 }
        const { multiplier, raw } = calcItemTotal(unitCost, am, 100)
        expect(multiplier).toBe(1)
        expect(raw).toBe(300)
    })

    test('rounded to nearest 5', () => {
        const am = { consumption_mode: 'per_student', qty_used: 1, group_size: 1 }
        // unitCost=16.67, qty=15, per_student, students=1 → raw=16.67→ round5=15
        const { rounded } = calcItemTotal(16.6667, { ...am, qty_used: 15 }, 1)
        // 16.6667 * 15 = 250.0005 → round5(250) = 250
        expect(rounded).toBe(250)
    })
})

describe('calcSessionPrice — Option B (margin on selling price)', () => {
    test('30% margin: Price = C / 0.7', () => {
        const { price, profit } = calcSessionPrice(4000, 30, 20)
        expect(price).toBeCloseTo(round5(4000 / 0.7), 0)
        expect(profit).toBeCloseTo(round5(4000 / 0.7 - 4000), 0)
    })

    test('pricePerStudent = price / students', () => {
        const { pricePerStudent, price } = calcSessionPrice(4000, 30, 20)
        expect(pricePerStudent).toBeCloseTo(round5(price / 20), 0)
    })

    test('throws if margin >= 100%', () => {
        expect(() => calcSessionPrice(1000, 100, 10)).toThrow()
    })
})

describe('computeSession — full integration', () => {
    const CUPS = { id: '1', pack_price: 5000, pack_size: 50, unit_type: 'pcs' }
    const BAKING_POWDER = { id: '2', pack_price: 500, pack_size: 30, unit_type: 'g' }

    const activitiesWithMaterials = [
        {
            activity: { id: 'a1', name: 'Elephant Toothpaste' },
            materials: [
                {
                    mat: CUPS,
                    am: { qty_used: 2, consumption_mode: 'per_student', group_size: 1, waste_pct: 0, manual_override: false },
                },
                {
                    mat: BAKING_POWDER,
                    am: { qty_used: 15, consumption_mode: 'per_student', group_size: 1, waste_pct: 0, manual_override: false },
                },
            ],
        },
    ]

    test('20 students, 30% margin', () => {
        const result = computeSession(activitiesWithMaterials, 20, 30)
        // Cups: 100 × 2 × 20 = 4000
        // Baking powder: 16.67 × 15 × 20 = 5001 → round5 = 5000
        // Total = 9000; Price = 9000/0.7 = 12857 → round5
        expect(result.totalCost).toBe(9000)
        expect(result.price).toBe(round5(9000 / 0.7))
        expect(result.breakdown[0].activityName).toBe('Elephant Toothpaste')
        expect(result.breakdown[0].lines).toHaveLength(2)
    })
})
