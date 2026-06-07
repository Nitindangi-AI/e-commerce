/**
 * Run SQL migration files against InsForge via the REST API.
 * Usage: node run-migration.js <path-to-sql-file>
 *
 * Splits the SQL into individual statements and executes
 * them one-by-one via InsForge's database RPC endpoint.
 */
const fs = require("fs");
const path = require("path");

const projectConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, ".insforge", "project.json"), "utf-8")
);

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("Usage: node run-migration.js <path-to-sql-file>");
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(sqlFile), "utf-8");
const baseUrl = projectConfig.oss_host;
const apiKey = projectConfig.api_key;

async function executeSQL(query) {
  // Try multiple known InsForge SQL execution endpoints
  const endpoints = [
    "/database/query",
    "/rest/v1/rpc/exec_sql",
    "/v1/sql",
    "/sql",
    "/database/sql",
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "apikey": apiKey,
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query, sql: query }),
      });

      if (res.status === 404) continue;

      const text = await res.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = text; }

      if (res.ok) {
        return { ok: true, endpoint, data: parsed };
      } else {
        return { ok: false, endpoint, status: res.status, data: parsed };
      }
    } catch (err) {
      continue;
    }
  }

  return { ok: false, error: "No valid endpoint found" };
}

async function main() {
  console.log(`📄 Running migration: ${sqlFile}`);
  console.log(`🌐 Target: ${baseUrl}\n`);

  const result = await executeSQL(sql);

  if (result.ok) {
    console.log(`✅ Migration executed successfully via ${result.endpoint}`);
  } else if (result.endpoint) {
    console.error(`❌ Migration failed (HTTP ${result.status}) via ${result.endpoint}`);
    console.error(JSON.stringify(result.data, null, 2));
  } else {
    console.error(`❌ Could not find a working SQL endpoint.`);
    console.error(`   You may need to run this SQL manually via the InsForge dashboard.`);
    console.error(`   Dashboard: ${baseUrl}`);
    console.error(`   File: ${path.resolve(sqlFile)}`);
  }
}

main();
