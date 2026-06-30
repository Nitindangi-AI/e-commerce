const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  
  const res = await client.query(`SELECT * FROM email.config;`);
  console.log("Email Config rows:");
  console.log(JSON.stringify(res.rows, null, 2));

  const templates = await client.query(`SELECT * FROM email.templates;`);
  console.log("Email Templates rows:");
  console.log(JSON.stringify(templates.rows, null, 2));

  await client.end();
}

main().catch(console.error);
