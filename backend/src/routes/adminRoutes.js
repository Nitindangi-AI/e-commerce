const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getUsers,
  approveVendor,
  rejectVendor,
  suspendVendor,
  getVendors,
  banUser,
  getInventoryAlerts,
  getAllOrders,
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
} = require("../controllers/adminController");
const { protect, requireAdmin } = require("../../middleware/auth");

// Apply protect and requireAdmin globally on all routes in this router
router.use(protect, requireAdmin);

router.get("/stats", getDashboardStats);
router.get("/users", getUsers);
router.get("/orders", getAllOrders);
router.get("/vendors", getVendors);
router.patch("/vendors/:id/approve", approveVendor);
router.patch("/vendors/:id/reject", rejectVendor);
router.patch("/vendors/:id/suspend", suspendVendor);
router.patch("/users/:id/ban", banUser);
router.get("/inventory-alerts", getInventoryAlerts);

// Coupon management routes
router.route("/coupons")
  .get(getCoupons)
  .post(createCoupon);

router.route("/coupons/:id")
  .patch(updateCoupon)
  .delete(deleteCoupon);

module.exports = router;
