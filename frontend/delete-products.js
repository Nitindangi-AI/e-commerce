import { createClient } from '@insforge/sdk';

const VITE_INSFORGE_URL = process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL;
const VITE_INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY || process.env.VITE_INSFORGE_ANON_KEY;

const client = createClient({
  baseUrl: VITE_INSFORGE_URL,
  anonKey: VITE_INSFORGE_ANON_KEY,
});

async function run() {
  console.log("🧹 Deleting all products from InsForge...");
  
  // First delete cart_items, wishlist, reviews, order_items, shipments, delivery_routes, tracking, orders to avoid FK errors
  const tablesToDelete = [
    'tracking',
    'delivery_routes',
    'shipments',
    'order_items',
    'orders',
    'reviews',
    'wishlist',
    'cart_items',
    'products'
  ];

  for (const table of tablesToDelete) {
    console.log(`Deleting all rows from table: ${table}...`);
    try {
      const { data, error } = await client.database
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // deletes everything

      if (error) {
        // Fallback for tables that might not have 'id' column or are already empty
        const { error: error2 } = await client.database
          .from(table)
          .delete()
          .gt('created_at', '1970-01-01T00:00:00.000Z');
        if (error2) {
          console.log(`⚠️ Could not fully delete ${table}: ${error2.message}`);
        } else {
          console.log(`✅ Cleared table ${table} using created_at fallback`);
        }
      } else {
        console.log(`✅ Successfully cleared table ${table}`);
      }
    } catch (err) {
      console.error(`💥 Failed to delete from ${table}:`, err);
    }
  }

  console.log("🧹 Clearing uploaded product image files from InsForge Storage...");
  try {
    const { data: files, error } = await client.storage
      .from("images")
      .list("products");

    if (error) throw error;

    if (files && files.length > 0) {
      console.log(`Found ${files.length} files to delete. Removing...`);
      const filePaths = files.map(f => `products/${f.name}`);
      const { error: delErr } = await client.storage
        .from("images")
        .remove(filePaths);

      if (delErr) throw delErr;
      console.log("✅ Cleared all product images from InsForge Storage!");
    } else {
      console.log("ℹ️ No images found in products storage directory.");
    }
  } catch (err) {
    console.error("⚠️ Storage deletion error:", err.message);
  }

  console.log("🎉 All products, referencing data, and storage images cleared successfully from InsForge!");
}

run();
