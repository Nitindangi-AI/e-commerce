import { createClient } from "@insforge/sdk";
import dotenv from "dotenv";
dotenv.config();

const insforge = createClient({
  baseUrl: process.env.VITE_INSFORGE_URL || process.env.INSFORGE_URL,
  anonKey: process.env.VITE_INSFORGE_ANON_KEY || process.env.INSFORGE_ANON_KEY,
});

async function main() {
  console.log("Fetching public auth config...");
  const config = await insforge.auth.getPublicAuthConfig();
  console.log("Public Auth Config:", JSON.stringify(config, null, 2));
}

main().catch(console.error);
