const express = require("express");
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  requestReturn,
  handleReturn,
  getAllOrders,
  updateOrderStatus,
  getShipmentByOrderId,
  updateShipment,
  trackByNumber,
  createDeliverySlot,
  getDeliverySlots,
} = require("../controllers/orderController");
const { validateCoupon } = require("../controllers/couponController");
const { protect, authorize, requireAdmin } = require("../middleware/auth");
const { validateOrder } = require("../middleware/validate");

router.post("/", protect, validateOrder, createOrder);
router.get("/my", protect, getMyOrders);

// Admin routes — placed before /:id to avoid Express wildcard conflict
router.get("/all", protect, authorize("admin"), getAllOrders);

// Tracking by tracking number — must be before /:id wildcard
router.get("/track/:trackingNumber", trackByNumber);

// Specific named sub-routes — must be before /:id wildcard
router.patch("/shipments/:id", protect, requireAdmin, updateShipment);

// Order specific actions (supporting both POST and PUT)
router.post("/:id/cancel", protect, cancelOrder);
router.put("/:id/cancel", protect, cancelOrder);
router.post("/:id/return", protect, requestReturn);
router.put("/:id/return", protect, requestReturn);
router.put("/:id/status", protect, authorize("admin"), updateOrderStatus);
router.put("/:id/return/handle", protect, authorize("admin"), handleReturn);
router.get("/:id/shipment", protect, getShipmentByOrderId);
router.post("/:id/slot", protect, createDeliverySlot);
router.get("/:id/slots", protect, getDeliverySlots);

// Coupon validation route
router.post("/coupons/validate", protect, validateCoupon);

// Single order by ID — keep last to avoid swallowing named routes
router.get("/:id", protect, getOrder);

module.exports = router;
