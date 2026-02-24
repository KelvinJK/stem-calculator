#!/usr/bin/env node
/**
 * Migration runner — applies all SQL files in /migrations in order.
 * Usage: npm run migrate
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { pool } = require('./index')

async function migrate() {
    const dir = path.join(__dirname, 'migrations')
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()

    const client = await pool.connect()
    try {
        await client.query('BEGIN')
        for (const file of files) {
            console.log(`Running migration: ${file}`)
            const sql = fs.readFileSync(path.join(dir, file), 'utf8')
            await client.query(sql)
        }
        await client.query('COMMIT')
        console.log('✅ All migrations applied.')
    } catch (err) {
        await client.query('ROLLBACK')
        console.error('❌ Migration failed:', err.message)
        process.exit(1)
    } finally {
        client.release()
        await pool.end()
    }
}

migrate()
