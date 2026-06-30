const { createClient } = require("@insforge/sdk");
require("dotenv").config();

const insforge = createClient({
  baseUrl: process.env.INSFORGE_URL,
  anonKey: process.env.INSFORGE_ANON_KEY,
  isServerMode: true,
});

async function main() {
  const res = await insforge.auth.verifyEmail({
    email: "nonexistent@example.com",
    otp: "111111",
  });
  console.log("Error properties:");
  console.log("name:", res.error.name);
  console.log("message:", res.error.message);
  console.log("statusCode:", res.error.statusCode);
  console.log("error:", res.error.error);
}

main().catch(console.error);
