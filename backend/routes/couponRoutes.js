const express = require("express");
const router = express.Router();
const { validateCoupon, createCoupon, getCoupons } = require("../controllers/couponController");
const { protect, authorize } = require("../middleware/auth");

router.post("/validate", protect, validateCoupon);
router.get("/", getCoupons);
router.post("/", protect, authorize("admin"), createCoupon);

module.exports = router;
