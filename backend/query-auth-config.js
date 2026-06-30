const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  
  const res = await client.query(`SELECT * FROM auth.config;`);
  console.log("Auth Config rows:");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch(console.error);
