const express = require("express");
const router = express.Router();
const {
  validateCoupon,
  createCoupon,
  getCoupons,
} = require("../controllers/couponController");
const { protect, authorize } = require("../../middleware/auth");
const {
  validateCouponCreate,
  validateCouponValidate,
} = require("../../middleware/validate");

router.post("/validate", protect, validateCouponValidate, validateCoupon);
router.get("/", getCoupons);
router.post("/", protect, authorize("admin"), validateCouponCreate, createCoupon);

module.exports = router;
