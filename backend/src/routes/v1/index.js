const express = require("express");
const router = express.Router();

// Import new 4-layer route modules
const adminRoutes = require("../adminRoutes");
const vendorRoutes = require("../vendorRoutes");
const profileRoutes = require("../profileRoutes");
const productRoutes = require("../productRoutes");
const orderRoutes = require("../orderRoutes");
const reviewRoutes = require("../reviewRoutes");
const wishlistRoutes = require("../wishlistRoutes");
const addressRoutes = require("../addressRoutes");
const couponRoutes = require("../couponRoutes");
const paymentRoutes = require("../paymentRoutes");
const locationRoutes = require("../locationRoutes");

// Mount sub-routes under /api/v1
router.use("/admin", adminRoutes);
router.use("/vendor", vendorRoutes);
router.use("/profile", profileRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/reviews", reviewRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/addresses", addressRoutes);
router.use("/coupons", couponRoutes);
router.use("/payments", paymentRoutes);
router.use("/payment", paymentRoutes);
router.use("/locations", locationRoutes);

module.exports = router;
