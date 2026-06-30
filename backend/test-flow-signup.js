const { createClient } = require("@insforge/sdk");
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
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

  console.log("Enabling email verification in database...");
  await pgClient.query("UPDATE auth.config SET require_email_verification = true;");

  const email = `flow1-${Date.now()}@example.com`;
  const password = "password123";

  console.log(`1. Signing up user: ${email}...`);
  const signUpRes = await insforge.auth.signUp({
    email,
    password,
    name: "Flow 1 Test",
  });
  console.log("signUp Response:", JSON.stringify(signUpRes, null, 2));

  if (signUpRes.error) {
    throw new Error("Signup failed: " + signUpRes.error.message);
  }

  // Find the OTP row in the database
  const otps = await pgClient.query("SELECT * FROM auth.email_otps WHERE email = $1 ORDER BY created_at DESC LIMIT 1;", [email]);
  if (otps.rows.length === 0) {
    throw new Error("No OTP record found in database for email " + email);
  }
  const otpRow = otps.rows[0];
  console.log("Found OTP row:", otpRow.id);

  // Update OTP hash to a known code: "123456"
  const testOtp = "123456";
  const testHash = bcrypt.hashSync(testOtp, 10);
  console.log(`Updating OTP hash in database to known hash for "${testOtp}"...`);
  await pgClient.query("UPDATE auth.email_otps SET otp_hash = $1 WHERE id = $2;", [testHash, otpRow.id]);

  console.log(`2. Verifying email with OTP: ${testOtp}...`);
  const verifyRes = await insforge.auth.verifyEmail({
    email,
    otp: testOtp,
  });
  console.log("verifyEmail Response:", JSON.stringify(verifyRes, null, 2));

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
