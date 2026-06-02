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
} = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/auth");

router.post("/", protect, createOrder);
router.get("/my", protect, getMyOrders);
router.get("/:id", protect, getOrder);
router.put("/:id/cancel", protect, cancelOrder);
router.put("/:id/return", protect, requestReturn);

// Admin
router.get("/", protect, authorize("admin"), getAllOrders);
router.put("/:id/status", protect, authorize("admin"), updateOrderStatus);
router.put("/:id/return/handle", protect, authorize("admin"), handleReturn);

module.exports = router;
