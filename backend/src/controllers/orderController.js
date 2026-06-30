const asyncHandler = require("express-async-handler");
const orderService = require("../services/orderService");

exports.createOrder = asyncHandler(async (req, res) => {
  const idempotencyKey = req.headers["x-idempotency-key"];
  // req.user has _id and email
  const userId = req.user._id.toString();
  const userEmail = req.user.email;

  const result = await orderService.createOrder(userId, userEmail, req.body, idempotencyKey);
  
  if (result.isDuplicate) {
    return res.status(200).json({
      success: true,
      order: result.order,
      shipment: result.shipment,
      isDuplicate: true,
    });
  }

  res.status(201).json({
    success: true,
    order: result.order,
    shipment: result.shipment,
  });
});

exports.getMyOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const result = await orderService.getMyOrders(req.user._id.toString(), page, limit);
  res.status(200).json({
    success: true,
    ...result
  });
});

exports.getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(req.params.id, req.user._id.toString(), req.user.role);
  res.status(200).json({
    success: true,
    order,
  });
});

exports.cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason = "Cancelled by customer" } = req.body;
  await orderService.cancelOrder(id, req.user._id.toString(), req.user.role, reason);
  res.status(200).json({
    success: true,
    message: "Order cancelled successfully",
  });
});

exports.requestReturn = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  await orderService.requestReturn(id, req.user._id.toString(), reason);
  res.status(200).json({
    success: true,
    message: "Return request submitted successfully",
  });
});

exports.handleReturn = asyncHandler(async (req, res) => {
  const { action } = req.body;
  const { id } = req.params;
  const order = await orderService.handleReturn(id, action);
  res.status(200).json({
    success: true,
    order,
  });
});

exports.getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const result = await orderService.getAllOrders(page, limit);
  res.status(200).json({
    success: true,
    ...result,
  });
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const { id } = req.params;
  const order = await orderService.updateOrderStatus(id, status, note);
  res.status(200).json({
    success: true,
    order,
  });
});

exports.getShipmentByOrderId = asyncHandler(async (req, res) => {
  const { shipment, events } = await orderService.getShipmentByOrderId(req.params.id);
  res.status(200).json({ success: true, shipment, events });
});

exports.updateShipment = asyncHandler(async (req, res) => {
  const shipment = await orderService.updateShipment(req.params.id, req.body);
  res.status(200).json({ success: true, shipment });
});

exports.trackByNumber = asyncHandler(async (req, res) => {
  const { shipment, events } = await orderService.trackByNumber(req.params.trackingNumber);
  res.status(200).json({ success: true, shipment, events });
});

exports.createDeliverySlot = asyncHandler(async (req, res) => {
  const { slot_time, slot_date } = req.body;
  const slot = await orderService.createDeliverySlot(req.params.id, slot_time, slot_date);
  res.status(201).json({ success: true, slot });
});

exports.getDeliverySlots = asyncHandler(async (req, res) => {
  const slots = await orderService.getDeliverySlots(req.params.id);
  res.status(200).json({ success: true, slots });
});
