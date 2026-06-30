const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getVendorProducts,
  getVendorOrders,
  getEarnings,
  updateStoreProfile,
  registerVendor,
  upgradeVendor,
  loginVendor,
  logoutVendor,
} = require("../controllers/vendorController");
const { protect, requireVendor } = require("../../middleware/auth");
const { stripVendorPrivilegedFields } = require("../../middleware/securityGuards");

// Auth and Onboarding Routes
router.post('/register', registerVendor);
router.post('/upgrade', protect, upgradeVendor);
router.post('/login', loginVendor);
router.post('/logout', logoutVendor);

// Operational Routes (Vendor protection required)
router.get("/stats", protect, requireVendor, getDashboardStats);
router.get("/products", protect, requireVendor, getVendorProducts);
router.get("/orders", protect, requireVendor, getVendorOrders);
router.get("/earnings", protect, requireVendor, getEarnings);
router.patch("/store", protect, requireVendor, stripVendorPrivilegedFields, updateStoreProfile);

module.exports = router;
