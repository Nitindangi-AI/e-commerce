const assert = require("assert");
const crypto = require("crypto");
const db = require("../config/db");
const { handleRazorpayWebhook } = require("../src/controllers/paymentController");

// Mock process.env
process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret";

let queries = [];
db.query = async (text, params) => {
  queries.push({ text, params });
  if (text.includes("SELECT id, payment_status, order_number")) {
    return {
      rows: [{ id: "order-uuid-1", payment_status: "pending", order_number: "ORD-12345" }],
      rowCount: 1,
    };
  }
  if (text.includes("SELECT * FROM order_items")) {
    return {
      rows: [{ product_id: "product-uuid-1", quantity: 2 }],
      rowCount: 1,
    };
  }
  return { rows: [], rowCount: 1 };
};

function mockReq(rawBodyStr, headers = {}) {
  const req = {
    headers: { ...headers },
    body: Buffer.from(rawBodyStr, "utf8"),
  };
  return req;
}

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
  console.log("Starting Webhook Tests...");

  // Test 1: Signature Missing
  {
    const req = mockReq('{"event":"payment.captured"}');
    const res = mockRes();
    await handleRazorpayWebhook(req, res);
    assert.strictEqual(res._status, 400);
    assert.strictEqual(res._json.error, "Signature missing");
    console.log("  ✅ Test 1 Passed: Signature Missing rejected");
  }

  // Test 2: Invalid Signature
  {
    const req = mockReq('{"event":"payment.captured"}', {
      "x-razorpay-signature": "wrong_signature",
    });
    const res = mockRes();
    await handleRazorpayWebhook(req, res);
    assert.strictEqual(res._status, 400);
    assert.strictEqual(res._json.error, "Invalid signature");
    console.log("  ✅ Test 2 Passed: Invalid Signature rejected");
  }

  // Test 3: Valid Signature & payment.captured Event
  {
    const payloadStr = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_12345",
            order_id: "order_rzp_123",
            status: "captured",
          },
        },
      },
    });

    const signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(payloadStr)
      .digest("hex");

    const req = mockReq(payloadStr, { "x-razorpay-signature": signature });
    const res = mockRes();
    
    queries = [];
    await handleRazorpayWebhook(req, res);
    
    assert.strictEqual(res._status, 200);
    assert.strictEqual(queries.length, 1);
    assert(queries[0].text.includes("UPDATE orders"));
    assert(queries[0].text.includes("payment_status = 'paid'"));
    assert.strictEqual(queries[0].params[1], "order_rzp_123");
    console.log("  ✅ Test 3 Passed: payment.captured event processed");
  }

  // Test 4: payment.failed Event & Stock Restoration
  {
    const payloadStr = JSON.stringify({
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: "pay_failed_123",
            order_id: "order_rzp_failed_123",
            status: "failed",
          },
        },
      },
    });

    const signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(payloadStr)
      .digest("hex");

    const req = mockReq(payloadStr, { "x-razorpay-signature": signature });
    const res = mockRes();
    
    queries = [];
    await handleRazorpayWebhook(req, res);
    
    assert.strictEqual(res._status, 200);
    
    const selectOrder = queries.find(q => q.text.includes("SELECT id, payment_status, order_number"));
    const begin = queries.find(q => q.text === "BEGIN");
    const updateOrder = queries.find(q => q.text.includes("UPDATE orders SET payment_status = ") && (q.text.includes("'failed'") || q.params.includes("failed")));
    const selectItems = queries.find(q => q.text.includes("SELECT * FROM order_items"));
    const updateStock = queries.find(q => q.text.includes("UPDATE products SET stock = stock + $2"));
    const insertLog = queries.find(q => q.text.includes("INSERT INTO inventory_log"));
    const commit = queries.find(q => q.text === "COMMIT");

    assert(selectOrder);
    assert(begin);
    assert(updateOrder);
    assert(selectItems);
    assert(updateStock);
    assert(insertLog);
    assert(commit);

    assert.strictEqual(updateStock.params[1], 2);
    console.log("  ✅ Test 4 Passed: payment.failed event processed and stock restored");
  }

  // Test 5: refund.created Event
  {
    const payloadStr = JSON.stringify({
      event: "refund.created",
      payload: {
        refund: {
          entity: {
            id: "ref_12345",
            payment_id: "pay_12345",
            status: "processed",
          },
        },
      },
    });

    const signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(payloadStr)
      .digest("hex");

    const req = mockReq(payloadStr, { "x-razorpay-signature": signature });
    const res = mockRes();
    
    queries = [];
    await handleRazorpayWebhook(req, res);
    
    assert.strictEqual(res._status, 200);
    assert.strictEqual(queries.length, 1);
    assert(queries[0].text.includes("UPDATE orders"));
    assert(queries[0].text.includes("payment_status = 'refunded'"));
    assert.strictEqual(queries[0].params[0], "pay_12345");
    console.log("  ✅ Test 5 Passed: refund.created event processed");
  }

  console.log("\n🛡️ All Webhook Tests Passed successfully!");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
