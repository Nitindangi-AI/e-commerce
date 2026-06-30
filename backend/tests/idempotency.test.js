const assert = require("assert");
const db = require("../config/db");
const { createOrder } = require("../src/controllers/orderController");
const { BadRequestError } = require("../src/middleware/errors");

// Mock dependencies
const emailUtils = require("../utils/email");
emailUtils.sendOrderConfirmationEmail = async () => {};
emailUtils.sendVendorOrderNotificationEmail = async () => {};

const paymentGateway = require("../utils/paymentGateway");
paymentGateway.processMockPayment = async () => ({
  status: "paid",
  gateway: "mock",
  transactionId: "txn_123"
});

// Setup mock DB state variables
let queries = [];
let mockKeyExists = false;

db.query = async (text, params) => {
  queries.push({ text, params });
  
  if (text.includes("SELECT order_id FROM idempotency_keys")) {
    if (mockKeyExists) {
      return { rows: [{ order_id: "existing-order-uuid" }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (text.includes("SELECT * FROM orders WHERE id = $1")) {
    return {
      rows: [{ id: "existing-order-uuid", total_amount: 1000, user_id: "user-id-123" }],
      rowCount: 1
    };
  }
  if (text.includes("SELECT id, tracking_number, status FROM shipments WHERE order_id = $1")) {
    return {
      rows: [{ id: "shipment-id-123", tracking_number: "TRK12345", status: "pending" }],
      rowCount: 1
    };
  }
  if (text.includes("SELECT * FROM products WHERE id = $1")) {
    return {
      rows: [{ id: "product-id-123", name: "Test Product", price: 500, stock: 10, delivery_days: 3, seller_id: "seller-id-123", img: "image.jpg" }],
      rowCount: 1
    };
  }
  if (text.includes("INSERT INTO orders")) {
    return {
      rows: [{ id: "new-order-uuid", user_id: "user-id-123", total_amount: 1000 }],
      rowCount: 1
    };
  }
  if (text.includes("SELECT * FROM shipments WHERE order_id = $1")) {
    return {
      rows: [{ id: "new-shipment-id", tracking_number: "TRK-NEW", status: "pending" }],
      rowCount: 1
    };
  }
  return { rows: [], rowCount: 1 };
};

// Mock Express response
function mockRes() {
  const res = {};
  res._status = 200;
  res._json = null;
  res.status = (s) => {
    res._status = s;
    return res;
  };
  res.json = (j) => {
    res._json = j;
    return res;
  };
  return res;
}

async function runTests() {
  console.log("Starting Idempotency Key Tests...");

  // Test 1: New Valid Idempotency Key
  {
    queries = [];
    mockKeyExists = false;
    const req = {
      headers: {
        "x-idempotency-key": "a4fa800b-33c8-4796-9fcf-5231c69c6764"
      },
      body: {
        orderItems: [{ product: "product-id-123", quantity: 2 }],
        shippingAddress: { name: "Test User", line1: "Test Line 1", city: "Test City" },
        paymentMethod: "cod"
      },
      user: {
        _id: { toString: () => "user-id-123" },
        email: "user@example.com"
      }
    };
    const res = mockRes();
    let nextError = null;
    const next = (err) => { nextError = err; };

    await createOrder(req, res, next);

    assert.strictEqual(nextError, null, "Should not produce any route error");
    assert.strictEqual(res._status, 201, "New order should return 201 Created");
    assert.strictEqual(res._json.success, true);
    assert.strictEqual(res._json.order.id, "new-order-uuid");

    // Verify key insertion & deletion cleanup SQL commands were run
    const insertKey = queries.find(q => q.text.includes("INSERT INTO idempotency_keys"));
    const deleteOldKeys = queries.find(q => q.text.includes("DELETE FROM idempotency_keys"));
    
    assert(insertKey, "Should insert new idempotency key");
    assert(deleteOldKeys, "Should trigger cleanup of old keys");
    assert.strictEqual(insertKey.params[0], "a4fa800b-33c8-4796-9fcf-5231c69c6764");
    
    console.log("  ✅ Test 1 Passed: New valid key processed and order created successfully");
  }

  // Test 2: Duplicate Idempotency Key
  {
    queries = [];
    mockKeyExists = true;
    const req = {
      headers: {
        "x-idempotency-key": "a4fa800b-33c8-4796-9fcf-5231c69c6764"
      },
      body: {
        orderItems: [{ product: "product-id-123", quantity: 2 }],
        shippingAddress: { name: "Test User", line1: "Test Line 1", city: "Test City" },
        paymentMethod: "cod"
      },
      user: {
        _id: { toString: () => "user-id-123" },
        email: "user@example.com"
      }
    };
    const res = mockRes();
    let nextError = null;
    const next = (err) => { nextError = err; };

    await createOrder(req, res, next);

    assert.strictEqual(nextError, null, "Should not produce any route error");
    assert.strictEqual(res._status, 200, "Duplicate request should return 200 OK");
    assert.strictEqual(res._json.success, true);
    assert.strictEqual(res._json.order.id, "existing-order-uuid");
    assert.strictEqual(res._json.isDuplicate, true);
    assert.strictEqual(res._json.shipment.tracking_number, "TRK12345");

    // Verify transaction BEGIN / COMMIT were NOT run
    const beginQuery = queries.find(q => q.text === "BEGIN");
    assert(!beginQuery, "Should not start a transaction for a duplicate key request");

    console.log("  ✅ Test 2 Passed: Duplicate key returns existing order/shipment immediately");
  }

  // Test 3: Invalid Idempotency Key Format
  {
    queries = [];
    mockKeyExists = false;
    const req = {
      headers: {
        "x-idempotency-key": "not-a-uuid"
      },
      body: {
        orderItems: [{ product: "product-id-123", quantity: 2 }],
        shippingAddress: { name: "Test User", line1: "Test Line 1", city: "Test City" },
        paymentMethod: "cod"
      },
      user: {
        _id: { toString: () => "user-id-123" },
        email: "user@example.com"
      }
    };
    const res = mockRes();
    let nextError = null;
    const next = (err) => { nextError = err; };

    await createOrder(req, res, next);

    assert(nextError instanceof BadRequestError, "Should pass BadRequestError to next()");
    assert.strictEqual(nextError.message, "Invalid X-Idempotency-Key format. Expected UUID.");
    console.log("  ✅ Test 3 Passed: Invalid key format correctly rejected with 400 BadRequestError");
  }

  // Test 4: Out of Stock Rejection (409 Conflict)
  {
    queries = [];
    mockKeyExists = false;
    const originalQuery = db.query;
    db.query = async (text, params) => {
      queries.push({ text, params });
      if (text.includes("UPDATE products SET stock = stock -")) {
        return { rows: [], rowCount: 0 };
      }
      return originalQuery(text, params);
    };

    const req = {
      headers: {
        "x-idempotency-key": "a4fa800b-33c8-4796-9fcf-5231c69c6765"
      },
      body: {
        orderItems: [{ product: "product-id-123", quantity: 2 }],
        shippingAddress: { name: "Test User", line1: "Test Line 1", city: "Test City" },
        paymentMethod: "cod"
      },
      user: {
        _id: { toString: () => "user-id-123" },
        email: "user@example.com"
      }
    };
    const res = mockRes();
    let nextError = null;
    const next = (err) => { nextError = err; };

    await createOrder(req, res, next);

    assert(nextError !== null, "Out of stock should pass the error to next()");
    assert.strictEqual(nextError.statusCode, 409, "Should have 409 statusCode");
    assert.strictEqual(nextError.message, "Out of stock");

    const rollbackQuery = queries.find(q => q.text === "ROLLBACK");
    assert(rollbackQuery, "Transaction should be rolled back");

    db.query = originalQuery;
    console.log("  ✅ Test 4 Passed: Out of stock scenario returns 409 and rolls back transaction");
  }

  console.log("\n🛡️ All Idempotency Key Tests Passed successfully!");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
