import 'dotenv/config';
import { createClient } from '@insforge/sdk';
import axios from 'axios';

// Credentials are read from environment variables — never hardcoded.
// Copy frontend/.env.example to frontend/.env and fill in real values.
const VITE_INSFORGE_URL = process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL;
const VITE_INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY || process.env.VITE_INSFORGE_ANON_KEY;
const API_URL = process.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function testRoute(name, url, token, expectedStatus) {
  try {
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await axios.get(`${API_URL}${url}`, { headers });
    const success = res.status === expectedStatus || (expectedStatus === 200 && res.status >= 200 && res.status < 300);
    console.log(`  ${success ? '✅' : '❌'} ${name} (GET ${url}): expected ${expectedStatus}, got ${res.status}`);
    return success;
  } catch (err) {
    const status = err.response ? err.response.status : 'NO_RESPONSE';
    const success = status === expectedStatus;
    console.log(`  ${success ? '✅' : '❌'} ${name} (GET ${url}): expected ${expectedStatus}, got ${status}`);
    return success;
  }
}

async function runTests() {
  console.log("🏁 Starting Server-Side RBAC Enforcement & Security hardening tests...\n");

  const client = createClient({
    baseUrl: VITE_INSFORGE_URL,
    anonKey: VITE_INSFORGE_ANON_KEY
  });

  // 1. Log in as Customer (user1@trendy.com)
  console.log("Logging in as Customer (user1@trendy.com)...");
  const custLogin = await client.auth.signInWithPassword({
    email: process.env.TEST_CUSTOMER_EMAIL,
    password: process.env.TEST_CUSTOMER_PASSWORD
  });
  if (custLogin.error) {
    console.error("❌ Customer login failed:", custLogin.error.message);
    return;
  }
  const custToken = custLogin.data.accessToken;

  // 2. Log in as Vendor (seller1@trendy.com)
  console.log("Logging in as Vendor (seller1@trendy.com)...");
  const vendLogin = await client.auth.signInWithPassword({
    email: process.env.TEST_VENDOR_EMAIL,
    password: process.env.TEST_VENDOR_PASSWORD
  });
  if (vendLogin.error) {
    console.error("❌ Vendor login failed:", vendLogin.error.message);
    return;
  }
  const vendToken = vendLogin.data.accessToken;

  // 3. Log in as Admin (admin@trendy.com)
  console.log("Logging in as Admin (admin@trendy.com)...");
  const adminLogin = await client.auth.signInWithPassword({
    email: process.env.TEST_ADMIN_EMAIL,
    password: process.env.TEST_ADMIN_PASSWORD
  });
  if (adminLogin.error) {
    console.error("❌ Admin login failed:", adminLogin.error.message);
    return;
  }
  const adminToken = adminLogin.data.accessToken;

  console.log("\n--- RUNNING RBAC & ACCESS RULES TESTS ---");

  let allPassed = true;

  // Rule: Invalid/garbage token -> 401
  allPassed &= await testRoute("Invalid token", "/api/v1/orders/my", "garbage_token_123", 401);
  allPassed &= await testRoute("No token", "/api/v1/orders/my", null, 401);

  // Customer tests
  console.log("\n[Customer Role Access Tests]");
  allPassed &= await testRoute("Customer accessing customer orders", "/api/v1/orders/my", custToken, 200);
  allPassed &= await testRoute("Customer accessing customer wishlist", "/api/v1/wishlist", custToken, 200);
  allPassed &= await testRoute("Customer accessing vendor stats", "/api/vendor/stats", custToken, 403);
  allPassed &= await testRoute("Customer accessing admin stats", "/api/admin/stats", custToken, 403);

  // Vendor tests
  console.log("\n[Vendor Role Access Tests]");
  allPassed &= await testRoute("Vendor accessing vendor stats", "/api/vendor/stats", vendToken, 200);
  allPassed &= await testRoute("Vendor accessing vendor products", "/api/vendor/products", vendToken, 200);
  allPassed &= await testRoute("Vendor accessing customer orders (blocked)", "/api/v1/orders/my", vendToken, 403);
  allPassed &= await testRoute("Vendor accessing customer wishlist (blocked)", "/api/v1/wishlist", vendToken, 403);
  allPassed &= await testRoute("Vendor accessing admin stats", "/api/admin/stats", vendToken, 403);

  // Admin tests
  console.log("\n[Admin Role Access Tests]");
  allPassed &= await testRoute("Admin accessing admin stats", "/api/admin/stats", adminToken, 200);
  allPassed &= await testRoute("Admin accessing customer orders", "/api/v1/orders/my", adminToken, 200);
  allPassed &= await testRoute("Admin accessing vendor stats", "/api/vendor/stats", adminToken, 200);

  console.log(`\n🎉 RBAC Testing completed. Status: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);
}

runTests();
