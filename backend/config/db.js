const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction
    ? { rejectUnauthorized: true }   // Strict TLS validation in production
    : { rejectUnauthorized: false }, // Relaxed for local development
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
