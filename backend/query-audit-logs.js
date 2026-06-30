const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'system' AND table_name = 'audit_logs';
  `);
  console.log("system.audit_logs columns:");
  console.log(cols.rows);
  
  const res = await client.query(`SELECT * FROM system.audit_logs ORDER BY created_at DESC LIMIT 10;`);
  console.log("Audit logs rows:");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch(console.error);
