const { createClient } = require("@insforge/sdk");
const { Client } = require('pg');
require("dotenv").config();

const insforge = createClient({
  baseUrl: process.env.INSFORGE_URL,
  anonKey: process.env.INSFORGE_ANON_KEY,
});

async function main() {
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await pgClient.connect();

  console.log("Enabling email verification in auth.config...");
  await pgClient.query("UPDATE auth.config SET require_email_verification = true;");

  const email = `test-otp-${Date.now()}@example.com`;
  console.log(`Signing up new user: ${email}...`);
  
  const signupRes = await insforge.auth.signUp({
    email,
    password: "password123",
    name: "OTP Test User",
  });
  
  console.log("Signup Response:", JSON.stringify(signupRes, null, 2));

  console.log("Querying auth.email_otps...");
  const otpsRes = await pgClient.query("SELECT * FROM auth.email_otps ORDER BY created_at DESC LIMIT 5;");
  console.log("OTPs in DB:");
  console.log(JSON.stringify(otpsRes.rows, null, 2));

  console.log("Restoring auth.config setting...");
  await pgClient.query("UPDATE auth.config SET require_email_verification = false;");

  await pgClient.end();
}

main().catch(async (err) => {
  console.error("Error occurred:", err);
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await pgClient.connect();
  console.log("Safety: Restoring auth.config setting...");
  await pgClient.query("UPDATE auth.config SET require_email_verification = false;");
  await pgClient.end();
});
