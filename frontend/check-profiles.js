import { createClient } from '@insforge/sdk';

const VITE_INSFORGE_URL = process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL;
const VITE_INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY || process.env.VITE_INSFORGE_ANON_KEY;

const client = createClient({
  baseUrl: VITE_INSFORGE_URL,
  anonKey: VITE_INSFORGE_ANON_KEY,
});

async function check() {
  console.log("Checking columns of 'profiles'...");
  const { data, error } = await client.database.from('profiles').select('*').limit(1);
  if (error) {
    console.error("Error fetching profiles:", error.message);
  } else {
    console.log("Profile sample row:", data);
  }
}

check();
