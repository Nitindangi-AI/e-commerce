const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('Usage: node run-migration-pg.js <path-to-sql-file>');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    const sqlPath = path.resolve(sqlFile);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    console.log(`Successfully executed ${path.basename(sqlFile)} via pg`);
  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

run();
