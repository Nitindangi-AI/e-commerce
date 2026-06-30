const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  // Get and sort migration files
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log("No migrations to run.");
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL environment variable is missing.");
    process.exit(1);
  }

  const hasSslDisabled = process.env.PGSSLMODE === 'disable' || connectionString.includes('sslmode=disable');

  const client = new Client({
    connectionString,
    ssl: hasSslDisabled ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await client.query(sql);
        console.log(`Running migration: ${file}... done`);
      } catch (err) {
        console.error(`❌ Migration failed: ${file}`);
        console.error(err.message || err);
        process.exit(1);
      }
    }
    
    console.log("All migrations executed successfully.");
  } catch (err) {
    console.error("Database connection failed during migration execution:", err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
