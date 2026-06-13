const db = require('./config/db');

async function run() {
  try {
    const res = await db.query(
      "DELETE FROM profiles WHERE email = 'admin@trendy.com' OR phone = '+91 99999 00000'"
    );
    console.log('Successfully deleted admin profile rows:', res.rowCount);
    process.exit(0);
  } catch (err) {
    console.error('Error executing delete query:', err);
    process.exit(1);
  }
}

run();
