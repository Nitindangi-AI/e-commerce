const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  approveVendor,
  rejectVendor,
  banUser,
  getInventoryAlerts,
  getAllOrders,
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
} = require("../controllers/adminController");
const { protect, requireAdmin } = require("../middleware/auth");

// Apply protect and requireAdmin globally on all routes in this router
router.use(protect, requireAdmin);

router.get("/stats", getDashboardStats);
router.get("/orders", getAllOrders);
router.patch("/vendors/:id/approve", approveVendor);
router.patch("/vendors/:id/reject", rejectVendor);
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
