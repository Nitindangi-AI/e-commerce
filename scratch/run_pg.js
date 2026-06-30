const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const db = require('../backend/config/db');

async function run() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../migrations/add_products_fts.sql'), 'utf-8');
    console.log("Running migration...");
    await db.query(sql);
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit();
  }
}

run();
