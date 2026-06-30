import { createClient } from '@insforge/sdk';

const VITE_INSFORGE_URL = process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL;
const VITE_INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY || process.env.VITE_INSFORGE_ANON_KEY;

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
