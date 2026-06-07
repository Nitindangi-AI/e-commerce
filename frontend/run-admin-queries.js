import { createClient } from '@insforge/sdk';

const VITE_INSFORGE_URL = 'https://r7q99f5d.us-east.insforge.app';
const VITE_INSFORGE_ANON_KEY = 'ik_84619633df209ae1fafdaf404bfbd91a';

const client = createClient({
  baseUrl: VITE_INSFORGE_URL,
  anonKey: VITE_INSFORGE_ANON_KEY,
});

async function run() {
  console.log("Logging in as admin...");
  const loginRes = await client.auth.signInWithPassword({
    email: 'admin@trendy.com',
    password: 'admin123'
  });

  if (loginRes.error) {
    console.error("Login failed:", loginRes.error.message);
    return;
  }

  const userId = loginRes.data.user.id;
  console.log("Logged in successfully! User ID:", userId);

  // Run the queries in loadAdminData
  const queries = [
    {
      name: "Pending Vendors",
      run: () => client.database.from("vendors").select("*, profiles:user_id(first_name, last_name, phone)").eq("status", "pending")
    },
    {
      name: "Approved Vendors",
      run: () => client.database.from("vendors").select("*, profiles:user_id(first_name, last_name, phone)").neq("status", "pending")
    },
    {
      name: "All Products",
      run: () => client.database.from("products").select("*, vendors:seller_id(store_name)")
    },
    {
      name: "All Order Items",
      run: () => client.database.from("order_items").select("*, products(*), orders(*)")
    },
    {
      name: "Profiles List",
      run: () => client.database.from("profiles").select("*")
    },
    {
      name: "Coupons List",
      run: () => client.database.from("coupons").select("*")
    },
    {
      name: "Shipments",
      run: () => client.database.from("shipments").select("*, contractors(*), vehicles(*)")
    },
    {
      name: "Contractors",
      run: () => client.database.from("contractors").select("*")
    },
    {
      name: "Vehicles",
      run: () => client.database.from("vehicles").select("*")
    }
  ];

  for (const q of queries) {
    console.log(`Running query: ${q.name}...`);
    try {
      const { data, error } = await q.run();
      if (error) {
        console.error(`❌ Query '${q.name}' failed:`, error.message);
      } else {
        console.log(`✅ Query '${q.name}' succeeded! Data count:`, data?.length);
      }
    } catch (err) {
      console.error(`💥 Query '${q.name}' threw exception:`, err.message);
    }
  }
}

run();
