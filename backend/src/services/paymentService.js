const paymentRepository = require("../repositories/paymentRepository");
const { NotFoundError, BadRequestError } = require("../middleware/errors");
const crypto = require("crypto");

let _razorpay = null;

function getRazorpay() {
  if (_razorpay) return _razorpay;

  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment."
    );
  }

  const Razorpay = require("razorpay");
  _razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
  return _razorpay;
}

exports.createRazorpayOrder = async (amount) => {
  const razorpay = getRazorpay();

  const amountPaise = Number(amount);
  if (!amountPaise || amountPaise <= 0 || !Number.isInteger(amountPaise)) {
    throw new BadRequestError("amount must be a positive integer (in paise)");
  }

  const options = {
    amount: amountPaise,
    currency: "INR",
    receipt: `rcpt_${Date.now()}`,
    payment_capture: 1,
  };

  const order = await razorpay.orders.create(options);

  return {
    razorpay_order_id: order.id,
    amount_paise: order.amount,
    currency: order.currency,
  };
};

exports.verifyRazorpayPayment = async (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  const { RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_SECRET) {
    throw new Error("Payment gateway not configured");
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  const sigBuffer  = Buffer.from(razorpay_signature,  "hex");
  const expBuffer  = Buffer.from(expectedSignature, "hex");

  const signaturesMatch =
    sigBuffer.length === expBuffer.length &&
    crypto.timingSafeEqual(sigBuffer, expBuffer);

  if (!signaturesMatch) {
    console.warn(
      `[payments/verify] Signature mismatch for razorpay_order_id=${razorpay_order_id}`
    );
    throw new BadRequestError("Payment verification failed: invalid signature");
  }

  const safePaymentDetails = {
    razorpay_order_id,
    razorpay_payment_id,
    status: "captured",
  };

  const order = await paymentRepository.updateOrderPaymentStatusByRazorpayOrderId(razorpay_order_id, safePaymentDetails);
  if (!order) {
    console.warn(
      `[payments/verify] No order found for razorpay_order_id=${razorpay_order_id}`
    );
    throw new NotFoundError("Order not found for the provided Razorpay order ID");
  }

  return order;
};

exports.getPaymentAccount = async (userId) => {
  const account = await paymentRepository.findPaymentAccountByUserId(userId);
  if (account === null) {
    throw new NotFoundError("User profile not found");
  }
  return account || {};
};

exports.updatePaymentAccount = async (userId, accountData) => {
  const existingAccount = await paymentRepository.findPaymentAccountByUserId(userId);
  if (existingAccount === null) {
    throw new NotFoundError("User profile not found");
  }

  const { upiId, bankName, accountHolder, accountNumber, ifscCode } = accountData;

  const updatedAccount = {
    upiId: upiId || existingAccount.upiId || "",
    bankName: bankName || existingAccount.bankName || "",
    accountHolder: accountHolder || existingAccount.accountHolder || "",
    accountNumber: accountNumber || existingAccount.accountNumber || "",
    ifscCode: ifscCode || existingAccount.ifscCode || "",
  };

  await paymentRepository.updatePaymentAccount(userId, updatedAccount);
  return updatedAccount;
};

exports.handleRazorpayWebhook = async (signature, rawBody, webhookSecret) => {
  if (!webhookSecret) {
    console.error("[webhook] RAZORPAY_WEBHOOK_SECRET is not configured.");
    return { error: "Webhook secret is not configured" };
  }

  if (!signature) {
    throw new BadRequestError("Signature missing");
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (signature !== expectedSignature) {
    console.warn("[webhook] Invalid signature received.");
    throw new BadRequestError("Invalid signature");
  }

  const payload = JSON.parse(rawBody.toString("utf8"));
  const event = payload.event;
  console.log(`[webhook] Razorpay webhook received event: ${event}`);

  if (event === "payment.captured") {
    const paymentEntity = payload.payload.payment.entity;
    const razorpayOrderId = paymentEntity.order_id;
    const razorpayPaymentId = paymentEntity.id;

    const safeDetails = {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      status: "captured",
    };

    const order = await paymentRepository.updateOrderPaymentStatusByRazorpayOrderId(razorpayOrderId, safeDetails);
    if (order) {
      console.log(`[webhook] payment.captured: Updated order ID ${order.id} to paid.`);
    }
  } 
  else if (event === "payment.failed") {
    const paymentEntity = payload.payload.payment.entity;
    const razorpayOrderId = paymentEntity.order_id;

    const order = await paymentRepository.findOrderDetailsByRazorpayOrderId(razorpayOrderId);
    if (order) {
      if (order.payment_status !== "failed" && order.payment_status !== "refunded") {
        await paymentRepository.beginTransaction();
        try {
          await paymentRepository.updateOrderPaymentStatus(order.id, 'failed');

          // Restore product stock
          const items = await paymentRepository.findOrderItems(order.id);
          for (const item of items) {
            await paymentRepository.incrementStock(item.product_id, item.quantity);
            await paymentRepository.createInventoryLog(
              item.product_id,
              item.quantity,
              `Stock restored due to payment failure on order ${order.order_number || order.id}`
            );
          }

          await paymentRepository.commitTransaction();
          console.log(`[webhook] payment.failed: Restored stock for order ${order.id}`);
        } catch (err) {
          await paymentRepository.rollbackTransaction();
          throw err;
        }
      }
    } else {
      console.warn(`[webhook] payment.failed: No order found for razorpay_order_id=${razorpayOrderId}`);
    }
  } 
  else if (event === "refund.created") {
    const refundEntity = payload.payload.refund.entity;
    const razorpayPaymentId = refundEntity.payment_id;

    const order = await paymentRepository.updateOrderPaymentStatusByRazorpayPaymentId(razorpayPaymentId);
    if (order) {
      console.log(`[webhook] refund.created: Updated order ID ${order.id} to refunded.`);
    }
  }

  return { received: true };
};
