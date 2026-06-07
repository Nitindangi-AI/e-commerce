const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getVendorProducts,
  getVendorOrders,
  getEarnings,
  updateStoreProfile,
} = require("../controllers/vendorController");
const { protect, requireVendor } = require("../middleware/auth");

// Apply protect and requireVendor globally to all vendor routes
router.use(protect, requireVendor);

router.get("/stats", getDashboardStats);
router.get("/products", getVendorProducts);
router.get("/orders", getVendorOrders);
router.get("/earnings", getEarnings);
router.patch("/store", updateStoreProfile);

module.exports = router;
