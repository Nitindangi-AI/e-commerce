const express = require("express");
const router = express.Router();
const {
  getPaymentAccount,
  updatePaymentAccount,
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
} = require("../controllers/paymentController");
const { protect, authorize } = require("../../middleware/auth");
const {
  validatePaymentAccountUpdate,
  validateRazorpayOrder,
  validateRazorpayVerify,
} = require("../../middleware/validate");

// Webhook route - must receive raw request body
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleRazorpayWebhook
);

router.post("/create-order", protect, validateRazorpayOrder, createRazorpayOrder);
router.post("/verify", protect, validateRazorpayVerify, verifyRazorpayPayment);

// Admin payment account
router.get("/payment-account", protect, authorize("admin"), getPaymentAccount);
router.put("/payment-account", protect, authorize("admin"), validatePaymentAccountUpdate, updatePaymentAccount);

module.exports = router;
