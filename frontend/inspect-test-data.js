import { getDbClient } from './tests/e2e/helpers.js';
const db = await getDbClient();
const sample = await db.query(`SELECT id, return_policy FROM products WHERE return_policy IS NOT NULL LIMIT 3`);
console.log("Sample return_policy:", sample.rows);
await db.end();
