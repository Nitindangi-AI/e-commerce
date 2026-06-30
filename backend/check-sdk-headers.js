const { createClient } = require("@insforge/sdk");
require("dotenv").config();

const insforge = createClient({
  baseUrl: process.env.INSFORGE_URL,
  anonKey: process.env.INSFORGE_ANON_KEY,
  isServerMode: false, // simulate browser
});

async function main() {
  const httpClient = insforge.getHttpClient();
  console.log("HttpClient methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(httpClient)));
  console.log("Auth methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(insforge.auth)));
}

main().catch(console.error);
