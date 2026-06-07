require("dotenv").config();
const db = require("./config/db");
async function check() {
  try {
    console.log("Backfilling missing slugs...");
    await db.query(`
      UPDATE products 
      SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6)
      WHERE slug IS NULL OR slug = ''
    `);
    const res = await db.query("SELECT id, name, slug FROM products");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
