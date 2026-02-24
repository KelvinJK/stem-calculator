/**
 * Vercel Serverless Function entry point.
 * Wraps the Express app so Vercel can invoke it as a serverless function.
 * Uses .cjs extension because the root package.json has "type": "module".
 */
const app = require('../server/app')

module.exports = app
