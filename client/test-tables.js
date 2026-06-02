import { createClient } from '@insforge/sdk';

const VITE_INSFORGE_URL = 'https://r7q99f5d.us-east.insforge.app';
const VITE_INSFORGE_ANON_KEY = 'ik_84619633df209ae1fafdaf404bfbd91a';

const client = createClient({
  baseUrl: VITE_INSFORGE_URL,
  anonKey: VITE_INSFORGE_ANON_KEY,
});

async function check() {
  const tables = ['shipments', 'contractors', 'vehicles', 'delivery_routes', 'tracking'];

  for (const table of tables) {
    console.log(`Checking table: ${table}...`);
    try {
      const { data, error } = await client.database.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ Table '${table}' returned error:`, error.message);
      } else {
        console.log(`✅ Table '${table}' exists! Data:`, data);
      }
    } catch (err) {
      console.error(`💥 Failed checking table ${table}:`, err);
    }
  }
}

check();
