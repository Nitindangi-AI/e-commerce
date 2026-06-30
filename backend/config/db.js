const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

const hasSslDisabled = process.env.PGSSLMODE === 'disable' || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=disable'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: hasSslDisabled
    ? false
    : (isProduction ? { rejectUnauthorized: true } : { rejectUnauthorized: false }),
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
