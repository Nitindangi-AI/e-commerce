import { createClient } from '@insforge/sdk';
import axios from 'axios';

const VITE_INSFORGE_URL = 'https://r7q99f5d.us-east.insforge.app';
const VITE_INSFORGE_ANON_KEY = 'ik_84619633df209ae1fafdaf404bfbd91a';
const API_URL = 'http://localhost:5000';

async function runTests() {
  console.log("🏁 Starting Phase 4 E-Commerce Business Logic Stabilization tests...\n");

  const client = createClient({
    baseUrl: VITE_INSFORGE_URL,
    anonKey: VITE_INSFORGE_ANON_KEY
  });

  // 1. Log in users
  console.log("Logging in users...");
  const custLogin = await client.auth.signInWithPassword({
    email: 'user1@trendy.com',
    password: 'user123'
  });
  if (custLogin.error) {
    console.error("❌ Customer login failed:", custLogin.error.message);
    return;
  }
  const custToken = custLogin.data.accessToken;

  const vendLogin = await client.auth.signInWithPassword({
    email: 'seller1@trendy.com',
    password: 'seller123'
  });
  if (vendLogin.error) {
    console.error("❌ Vendor login failed:", vendLogin.error.message);
    return;
  }
  const vendToken = vendLogin.data.accessToken;

  const adminLogin = await client.auth.signInWithPassword({
    email: 'admin@trendy.com',
    password: 'admin123'
  });
  if (adminLogin.error) {
    console.error("❌ Admin login failed:", adminLogin.error.message);
    return;
  }
  const adminToken = adminLogin.data.accessToken;

  let allPassed = true;

  try {
    // 2. Coupon Validation Robustness Test
    console.log("\n--- TEST 1: Coupon Validation ---");
    const testCouponCode = 'WELCOME10'; // A standard coupon code
    
    // Test with cartTotal
    const couponRes1 = await axios.post(`${API_URL}/api/v1/coupons/validate`, 
      { code: testCouponCode, cartTotal: 1000 },
      { headers: { Authorization: `Bearer ${custToken}` } }
    ).catch(e => e.response);
    
    if (couponRes1 && couponRes1.status === 200 && couponRes1.data.valid) {
      console.log("✅ Coupon validation with cartTotal passed:", couponRes1.data);
    } else {
      console.error("❌ Coupon validation with cartTotal failed. Status:", couponRes1?.status, "Body:", couponRes1?.data);
      allPassed = false;
    }

    // Test with orderValue (Checkout page alias)
    const couponRes2 = await axios.post(`${API_URL}/api/v1/coupons/validate`, 
      { code: testCouponCode, orderValue: 2000 },
      { headers: { Authorization: `Bearer ${custToken}` } }
    ).catch(e => e.response);

    if (couponRes2 && couponRes2.status === 200 && couponRes2.data.valid) {
      console.log("✅ Coupon validation with orderValue (alias) passed:", couponRes2.data);
    } else {
      console.error("❌ Coupon validation with orderValue failed. Status:", couponRes2?.status, "Body:", couponRes2?.data);
      allPassed = false;
    }

    // 3. Product Retrieval & Vendor Management
    console.log("\n--- TEST 2: Vendor Product Ownership & Permissions ---");
    
    // Retrieve all products to pick a reference seller ID and a product
    const productsRes = await axios.get(`${API_URL}/api/v1/products`);
    const testProduct = productsRes.data.products[0];
    if (!testProduct) {
      throw new Error("No products found in database to test checkout.");
    }
    console.log(`Using product "${testProduct.name}" (ID: ${testProduct.id}, Stock: ${testProduct.stock})`);

    // Try to update product as Vendor who does NOT own it
    // Note: product was likely created by another user or is seeded. Let's create a product as seller1 first to test clean ownership.
    console.log("Creating test product as Vendor...");
    const createProductRes = await axios.post(`${API_URL}/api/v1/products`, {
      name: `Test Product ${Date.now()}`,
      price: 1500,
      original_price: 1800,
      category: "Men",
      brand: "Trendy",
      stock: 5,
      description: "Automated test product",
      gender: "Men",
      colors: ["Black"],
      sizes: ["M"]
    }, { headers: { Authorization: `Bearer ${vendToken}` } });

    const newProduct = createProductRes.data.product;
    console.log(`✅ Product created successfully. ID: ${newProduct.id}`);

    // Vendor updates their own product -> should succeed
    const updateOwnRes = await axios.put(`${API_URL}/api/v1/products/${newProduct.id}`, {
      price: 1400
    }, { headers: { Authorization: `Bearer ${vendToken}` } }).catch(e => e.response);

    if (updateOwnRes.status === 200 && updateOwnRes.data.success) {
      console.log("✅ Vendor successfully updated their own product");
    } else {
      console.error("❌ Vendor failed to update their own product. Status:", updateOwnRes.status);
      allPassed = false;
    }

    // Customer tries to update Vendor's product -> should fail with 403
    const updateCustomerRes = await axios.put(`${API_URL}/api/v1/products/${newProduct.id}`, {
      price: 10
    }, { headers: { Authorization: `Bearer ${custToken}` } }).catch(e => e.response);

    if (updateCustomerRes.status === 403) {
      console.log("✅ Customer blocked from updating vendor product (403 Forbidden)");
    } else {
      console.error("❌ Customer was NOT blocked from updating vendor product. Status:", updateCustomerRes.status);
      allPassed = false;
    }

    // Admin updates Vendor's product -> should succeed (admin privileges)
    const updateAdminRes = await axios.put(`${API_URL}/api/v1/products/${newProduct.id}`, {
      price: 1600
    }, { headers: { Authorization: `Bearer ${adminToken}` } }).catch(e => e.response);

    if (updateAdminRes.status === 200 && updateAdminRes.data.success) {
      console.log("✅ Admin successfully updated vendor's product (global access)");
    } else {
      console.error("❌ Admin failed to update vendor's product. Status:", updateAdminRes.status);
      allPassed = false;
    }

    // 4. Order Creation & Inventory Lock Test
    console.log("\n--- TEST 3: Order Creation & Inventory Lock ---");
    
    // Overselling Test: Try buying more stock than available
    const badOrderData = {
      orderItems: [{
        product: newProduct.id,
        quantity: 10, // Available is 5
        color: "Black",
        size: "M"
      }],
      shippingAddress: {
        name: "Test Customer",
        phone: "+91 99999 99999",
        line1: "123 Test Lane",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        country: "India"
      },
      paymentMethod: "cod"
    };

    console.log("Attempting to oversell product...");
    const badOrderRes = await axios.post(`${API_URL}/api/v1/orders`, badOrderData, {
      headers: { Authorization: `Bearer ${custToken}` }
    }).catch(e => e.response);

    if (badOrderRes.status === 400 && badOrderRes.data.message.includes("Insufficient stock")) {
      console.log("✅ Overselling rejected properly:", badOrderRes.data.message);
    } else {
      console.error("❌ Overselling was NOT rejected properly. Status:", badOrderRes.status, "Body:", badOrderRes.data);
      allPassed = false;
    }

    // Valid Order Test
    const goodOrderData = {
      ...badOrderData,
      orderItems: [{
        product: newProduct.id,
        quantity: 2,
        color: "Black",
        size: "M"
      }]
    };

    console.log("Placing valid order...");
    const goodOrderRes = await axios.post(`${API_URL}/api/v1/orders`, goodOrderData, {
      headers: { Authorization: `Bearer ${custToken}` }
    }).catch(e => e.response);

    if (goodOrderRes.status === 201 && goodOrderRes.data.success) {
      console.log("✅ Order placed successfully:", goodOrderRes.data.order.order_number);
      console.log("✅ Shipment triggered automatically and linked:", goodOrderRes.data.shipment);
      
      // Verify stock was decremented in database
      const checkProductRes = await axios.get(`${API_URL}/api/v1/products/${newProduct.id}`);
      const updatedProduct = checkProductRes.data.product;
      const expectedStock = 5 - 2;
      if (parseInt(updatedProduct.stock) === expectedStock) {
        console.log(`✅ Stock decremented correctly. Expected: ${expectedStock}, Got: ${updatedProduct.stock}`);
      } else {
        console.error(`❌ Stock mismatch. Expected: ${expectedStock}, Got: ${updatedProduct.stock}`);
        allPassed = false;
      }
    } else {
      console.error("❌ Order placement failed. Status:", goodOrderRes.status, "Body:", goodOrderRes.data);
      allPassed = false;
    }

    // Cleanup: Delete the test product
    console.log("\nCleaning up test product...");
    const deleteRes = await axios.delete(`${API_URL}/api/v1/products/${newProduct.id}`, {
      headers: { Authorization: `Bearer ${vendToken}` }
    }).catch(e => e.response);

    if (deleteRes.status === 200 && deleteRes.data.success) {
      console.log("✅ Test product soft-deleted successfully");
    } else {
      console.error("❌ Failed to soft-delete test product. Status:", deleteRes.status);
      allPassed = false;
    }

  } catch (err) {
    console.error("❌ Test crashed due to unexpected error:", err.message);
    if (err.response) {
      console.error("Response:", err.response.data);
    }
    allPassed = false;
  }

  console.log(`\n🎉 Verification Completed. Status: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);
}

runTests();
