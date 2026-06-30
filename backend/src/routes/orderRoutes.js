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
const { protect, authorize, requireAdmin } = require("../../middleware/auth");
const { validateOrder, validateCouponValidate } = require("../../middleware/validate");
const {
  validateOrderStatus,
  requireShipmentOwnership,
  requireDeliverySlotAccess,
} = require("../../middleware/securityGuards");

// POST / — create a new order (body validated by Zod before controller runs)
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

// Status update — admin only + allowlist validation
router.put("/:id/status", protect, authorize("admin"), validateOrderStatus, updateOrderStatus);
router.put("/:id/return/handle", protect, authorize("admin"), handleReturn);

// Shipment & delivery — ownership enforced
router.get("/:id/shipment", protect, requireShipmentOwnership, getShipmentByOrderId);

// Delivery slot creation — admin only; reading requires ownership
router.post("/:id/slot", protect, authorize("admin"), createDeliverySlot);
router.get("/:id/slots", protect, requireDeliverySlotAccess, getDeliverySlots);

// Coupon validation route (body validated before coupon controller)
router.post("/coupons/validate", protect, validateCouponValidate, validateCoupon);

// Single order by ID — keep last to avoid swallowing named routes
router.get("/:id", protect, getOrder);

module.exports = router;
