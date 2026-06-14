import { createClient } from '@insforge/sdk';
import axios from 'axios';

const VITE_INSFORGE_URL = 'https://r7q99f5d.us-east.insforge.app';
const VITE_INSFORGE_ANON_KEY = 'ik_84619633df209ae1fafdaf404bfbd91a';
const API_URL = 'http://localhost:5000';

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
    email: 'user1@trendy.com',
    password: 'user123'
  });
  if (custLogin.error) {
    console.error("❌ Customer login failed:", custLogin.error.message);
    return;
  }
  const custToken = custLogin.data.accessToken;

  // 2. Log in as Vendor (seller1@trendy.com)
  console.log("Logging in as Vendor (seller1@trendy.com)...");
  const vendLogin = await client.auth.signInWithPassword({
    email: 'seller1@trendy.com',
    password: 'seller123'
  });
  if (vendLogin.error) {
    console.error("❌ Vendor login failed:", vendLogin.error.message);
    return;
  }
  const vendToken = vendLogin.data.accessToken;

  // 3. Log in as Admin (admin@trendy.com)
  console.log("Logging in as Admin (admin@trendy.com)...");
  const adminLogin = await client.auth.signInWithPassword({
    email: 'admin@trendy.com',
    password: 'admin123'
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
