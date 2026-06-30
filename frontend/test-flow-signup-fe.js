import { createClient } from "@insforge/sdk";
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const { Client } = pg;

const insforge = createClient({
  baseUrl: process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL,
  anonKey: process.env.INSFORGE_ANON_KEY || process.env.VITE_INSFORGE_ANON_KEY,
});

async function main() {
  // Let's get connection string
  // Note: the DATABASE_URL is in the backend/.env, so let's parse it if needed
  // or we can read it from the backend .env file directly.
  const fs = await import('fs');
  const path = await import('path');
  const backendEnv = fs.readFileSync(path.resolve('../backend/.env'), 'utf8');
  const dbUrlMatch = backendEnv.match(/DATABASE_URL=(.+)/);
  const dbUrl = dbUrlMatch ? dbUrlMatch[1].trim() : null;

  if (!dbUrl) {
    throw new Error("Could not extract DATABASE_URL from backend/.env");
  }

  const pgClient = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
  await pgClient.connect();

  console.log("Enabling email verification...");
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
    throw new Error(signUpRes.error.message || "Signup failed");
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
  // Restore setting just in case
  const fs = await import('fs');
  const path = await import('path');
  try {
    const backendEnv = fs.readFileSync(path.resolve('../backend/.env'), 'utf8');
    const dbUrlMatch = backendEnv.match(/DATABASE_URL=(.+)/);
    const dbUrl = dbUrlMatch ? dbUrlMatch[1].trim() : null;
    if (dbUrl) {
      const pgClient = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
      });
      await pgClient.connect();
      await pgClient.query("UPDATE auth.config SET require_email_verification = false;");
      await pgClient.end();
    }
  } catch (e) {
    console.error("Failed to restore setting:", e);
  }
});
