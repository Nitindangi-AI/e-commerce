const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  
  const res = await client.query(`
    SELECT * FROM system.audit_logs 
    WHERE action ILIKE '%email%' OR module ILIKE '%email%' OR details::text ILIKE '%otp%'
    ORDER BY created_at DESC;
  `);
  console.log("Email or OTP-related audit logs:");
  console.log(JSON.stringify(res.rows, null, 2));

  await client.end();
}

main().catch(console.error);
