const { createClient } = require("@insforge/sdk");
require("dotenv").config();

async function main() {
  const client = createClient({
    baseUrl: process.env.INSFORGE_URL,
    anonKey: process.env.INSFORGE_ANON_KEY,
    isServerMode: true,
  });

  const email = `logout-test-${Date.now()}@example.com`;
  const password = "password123";

  console.log(`1. Signing up user: ${email}...`);
  const signUpRes = await client.auth.signUp({
    email,
    password,
    name: "Logout Test User",
  });

  const token = signUpRes.data.accessToken;
  console.log("Acquired access token:", token);

  console.log("2. Verifying token is valid initially...");
  client.setAccessToken(token);
  const userRes1 = await client.auth.getCurrentUser();
  console.log("getCurrentUser status:", userRes1.error ? "invalid" : "valid");

  console.log("3. Logging out...");
  await client.auth.signOut();

  console.log("4. Attempting to use the old access token after logout...");
  client.setAccessToken(token);
  const userRes2 = await client.auth.getCurrentUser();
  console.log("getCurrentUser after logout:", JSON.stringify(userRes2, null, 2));
}

main().catch(console.error);
