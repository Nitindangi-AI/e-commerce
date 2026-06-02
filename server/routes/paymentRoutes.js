const express = require("express");
const router = express.Router();
const {
  getPaymentAccount,
  updatePaymentAccount,
} = require("../controllers/paymentController");
const { protect, authorize } = require("../middleware/auth");

router.get("/payment-account", protect, authorize("admin"), getPaymentAccount);
router.put("/payment-account", protect, authorize("admin"), updatePaymentAccount);

module.exports = router;
