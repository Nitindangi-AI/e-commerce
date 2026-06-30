/**
 * Run the pagination indexes migration.
 * Usage: node backend/run-pagination-indexes.js
 */
require("dotenv").config({ path: __dirname + "/.env" });
const db = require("./config/db");

const indexes = [
  "CREATE INDEX IF NOT EXISTS idx_orders_user_created   ON orders(user_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_orders_created        ON orders(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_reviews_product_created ON reviews(product_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_reviews_created         ON reviews(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_profiles_created ON profiles(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_vendors_created ON vendors(created_at DESC)",
];

async function main() {
  for (const sql of indexes) {
    const name = sql.match(/idx_\w+/)?.[0] || sql;
    try {
      await db.query(sql);
      console.log(`✅ ${name}`);
    } catch (err) {
      console.error(`❌ ${name}: ${err.message}`);
    }
  }
  console.log("\n✅ Pagination indexes migration complete.");
  process.exit(0);
}

main();
