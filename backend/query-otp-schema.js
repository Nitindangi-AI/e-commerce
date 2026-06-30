const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  
  const otpCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'auth' AND table_name = 'email_otps';
  `);
  console.log("auth.email_otps columns:");
  console.log(otpCols.rows);

  const userCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'auth' AND table_name = 'users';
  `);
  console.log("auth.users columns:");
  console.log(userCols.rows);

  await client.end();
}

main().catch(console.error);
