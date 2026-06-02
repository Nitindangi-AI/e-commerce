import { createClient } from '@insforge/sdk';

const VITE_INSFORGE_URL = 'https://r7q99f5d.us-east.insforge.app';
const VITE_INSFORGE_ANON_KEY = 'ik_84619633df209ae1fafdaf404bfbd91a';

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
