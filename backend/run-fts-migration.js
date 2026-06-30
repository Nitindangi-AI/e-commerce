/**
 * Run the FTS migration: add search_vector generated column + GIN index.
 * Usage: node backend/run-fts-migration.js
 */
require("dotenv").config({ path: __dirname + "/.env" });
const db = require("./config/db");

const SQL = `
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(name, '') || ' ' ||
      coalesce(brand, '') || ' ' ||
      coalesce(description, '')
    )
  ) STORED;
`;

const INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_products_fts ON products USING GIN(search_vector);
`;

async function main() {
  console.log("🔧 Adding search_vector column...");
  try {
    await db.query(SQL);
    console.log("✅ Column added (or already exists).");
  } catch (err) {
    if (err.message.includes("already exists") || err.message.includes("duplicate column")) {
      console.log("ℹ️  Column already exists — skipping.");
    } else {
      console.error("❌ Column migration failed:", err.message);
      process.exit(1);
    }
  }

  console.log("🔧 Creating GIN index...");
  try {
    await db.query(INDEX_SQL);
    console.log("✅ Index created (or already exists).");
  } catch (err) {
    if (err.message.includes("already exists")) {
      console.log("ℹ️  Index already exists — skipping.");
    } else {
      console.error("❌ Index migration failed:", err.message);
      process.exit(1);
    }
  }

  console.log("\n✅ FTS migration complete.");
  process.exit(0);
}

main();
