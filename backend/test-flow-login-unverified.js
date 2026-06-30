const { createClient } = require("@insforge/sdk");
const { Client } = require('pg');
require("dotenv").config();

const insforge = createClient({
  baseUrl: process.env.INSFORGE_URL,
  anonKey: process.env.INSFORGE_ANON_KEY,
  isServerMode: true,
});

async function main() {
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await pgClient.connect();

  console.log("Enabling email verification...");
  await pgClient.query("UPDATE auth.config SET require_email_verification = true;");

  const email = `unverified-${Date.now()}@example.com`;
  const password = "password123";

  console.log(`1. Signing up user (but NOT verifying): ${email}...`);
  await insforge.auth.signUp({
    email,
    password,
    name: "Unverified Login Test",
  });

  console.log("2. Attempting to log in as unverified user...");
  const loginRes = await insforge.auth.signInWithPassword({
    email,
    password,
  });
  console.log("signInWithPassword Response:", JSON.stringify(loginRes, null, 2));

  console.log("Restoring auth.config setting...");
  await pgClient.query("UPDATE auth.config SET require_email_verification = false;");
  await pgClient.end();
}

main().catch(async (err) => {
  console.error("Test error:", err);
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await pgClient.connect();
  await pgClient.query("UPDATE auth.config SET require_email_verification = false;");
  await pgClient.end();
});
