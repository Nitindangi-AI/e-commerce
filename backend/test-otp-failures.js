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

  console.log("Enabling email verification...");
  await pgClient.query("UPDATE auth.config SET require_email_verification = true;");

  const email = `otp-fail-${Date.now()}@example.com`;
  const password = "password123";

  console.log(`Signing up user: ${email}...`);
  await insforge.auth.signUp({
    email,
    password,
    name: "OTP Fail Test",
  });

  // Find the OTP row
  const otps = await pgClient.query("SELECT * FROM auth.email_otps WHERE email = $1 ORDER BY created_at DESC LIMIT 1;", [email]);
  const otpRow = otps.rows[0];
  console.log("OTP Row ID:", otpRow.id);

  // Set hash to bcrypt("123456")
  const testOtp = "123456";
  const testHash = bcrypt.hashSync(testOtp, 10);
  await pgClient.query("UPDATE auth.email_otps SET otp_hash = $1 WHERE id = $2;", [testHash, otpRow.id]);

  console.log("\n--- TEST Flow 3: Invalid OTP ---");
  const invalidRes = await insforge.auth.verifyEmail({
    email,
    otp: "111111", // Wrong code
  });
  console.log("Invalid OTP verification response:");
  console.log(JSON.stringify(invalidRes, null, 2));

  console.log("\n--- TEST Flow 4: Expired OTP ---");
  // Set expires_at to 15 minutes ago
  await pgClient.query("UPDATE auth.email_otps SET expires_at = now() - interval '15 minutes' WHERE id = $1;", [otpRow.id]);
  const expiredRes = await insforge.auth.verifyEmail({
    email,
    otp: testOtp, // Correct code, but expired
  });
  console.log("Expired OTP verification response:");
  console.log(JSON.stringify(expiredRes, null, 2));

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
