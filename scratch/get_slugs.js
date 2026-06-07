require("dotenv").config();
const db = require("./config/db");
async function check() {
  try {
    const res = await db.query("SELECT id, name, slug FROM products");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
