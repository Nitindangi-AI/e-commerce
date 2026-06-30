const asyncHandler = require("express-async-handler");
const paymentService = require("../services/paymentService");

exports.createRazorpayOrder = asyncHandler(async (req, res) => {
  const result = await paymentService.createRazorpayOrder(req.body.amount);
  res.status(201).json({
    success: true,
    ...result
  });
});

exports.verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const order = await paymentService.verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  res.status(200).json({
    success: true,
    message: "Payment verified and order updated successfully",
    orderId: order.id,
    orderNumber: order.order_id,
  });
});

exports.getPaymentAccount = asyncHandler(async (req, res) => {
  const paymentAccount = await paymentService.getPaymentAccount(req.user.id);
  res.status(200).json({
    success: true,
    paymentAccount,
  });
});

exports.updatePaymentAccount = asyncHandler(async (req, res) => {
  const paymentAccount = await paymentService.updatePaymentAccount(req.user.id, req.body);
  res.status(200).json({
    success: true,
    message: "Payment account updated successfully",
    paymentAccount,
  });
});

exports.handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const result = await paymentService.handleRazorpayWebhook(signature, req.body, webhookSecret);
    return res.status(200).json(result);
  } catch (err) {
    console.error("[webhook] Error processing Razorpay webhook:", err);
    if (err.message === "Signature missing" || err.message === "Invalid signature" || err.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }
    // Always return 200 to Razorpay on internal errors
    return res.status(200).json({ received: true, error: err.message });
  }
};
