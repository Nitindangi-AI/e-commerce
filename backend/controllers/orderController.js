const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const generateOrderId = require("../utils/generateOrderId");
const Shipment = require("../models/Shipment");
const ShipmentEvent = require("../models/ShipmentEvent");
const DeliverySlot = require("../models/DeliverySlot");
// @desc    Create new order
// @route   POST /api/v1/orders
// @access  Private
exports.createOrder = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    couponCode,
    discount,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No order items provided",
    });
  }

  // Validate all products exist and calculate totals
  let subtotal = 0;
  let maxDeliveryDays = 0;
  const validatedItems = [];
  let sellerPaymentInfo = {};

  for (const item of orderItems) {
    const product = await Product.findById(item.product).populate(
      "seller",
      "paymentAccount firstName lastName"
    );
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found: ${item.product}`,
      });
    }

    // Check stock
    if (product.stock < item.quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
      });
    }

    validatedItems.push({
      product: product._id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      image: product.img,
      color: item.color || "",
      size: item.size || "",
    });

    subtotal += product.price * item.quantity;

    // Track max delivery days for estimated delivery
    if (product.deliveryDays > maxDeliveryDays) {
      maxDeliveryDays = product.deliveryDays;
    }

    // Capture seller payment info (from first product with a seller)
    if (product.seller && product.seller.paymentAccount && !sellerPaymentInfo.sellerAccountHolder) {
      const pa = product.seller.paymentAccount;
      sellerPaymentInfo = {
        sellerUpiId: pa.upiId || "",
        sellerBankName: pa.bankName || "",
        sellerAccountHolder: pa.accountHolder || `${product.seller.firstName} ${product.seller.lastName}`,
        transactionId: "",
      };
    }

    // Reduce stock
    product.stock -= item.quantity;
    await product.save();
  }

  const shippingCost = subtotal > 5000 ? 0 : 299;
  const discountAmount = discount || 0;
  const totalAmount = subtotal + shippingCost - discountAmount;

  // Calculate estimated delivery date
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + (maxDeliveryDays || 3));

  // Generate simulated transaction ID for non-COD payments
  const selectedPayment = paymentMethod || "cod";
  if (selectedPayment !== "cod") {
    sellerPaymentInfo.transactionId = `TXN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  // Generate unique order ID
  let orderId;
  let isUnique = false;
  while (!isUnique) {
    orderId = generateOrderId();
    const existing = await Order.findOne({ orderId });
    if (!existing) isUnique = true;
  }

  const order = await Order.create({
    user: req.user._id,
    orderId,
    orderItems: validatedItems,
    shippingAddress,
    paymentMethod: selectedPayment,
    paymentStatus: selectedPayment === "cod" ? "pending" : "paid",
    paymentDetails: sellerPaymentInfo,
    subtotal,
    shippingCost,
    discount: discountAmount,
    couponCode: couponCode || undefined,
    totalAmount,
    estimatedDelivery,
    statusHistory: [
      {
        status: "Processing",
        timestamp: new Date(),
        note: "Order placed successfully",
      },
    ],
  });

  // Auto-create a Shipment record for this order
  const trackingNumber = `TRK-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const shipment = await Shipment.create({
    order: order._id,
    tracking_number: trackingNumber,
    carrier: "Trendy Express",
    status: "pending",
    estimated_delivery: estimatedDelivery,
  });

  // Create initial shipment event
  await ShipmentEvent.create({
    shipment: shipment._id,
    status: "Order Placed",
    location: shippingAddress?.city || "Warehouse",
    description: "Order placed successfully and awaiting pickup",
  });

  res.status(201).json({
    success: true,
    order,
    shipment: {
      _id: shipment._id,
      tracking_number: trackingNumber,
      status: shipment.status,
    },
  });
});

// @desc    Get logged-in user's orders
// @route   GET /api/v1/orders/my
// @access  Private
exports.getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate("orderItems.product", "img name deliveryDays returnPolicy");

  res.status(200).json({
    success: true,
    count: orders.length,
    orders,
  });
});

// @desc    Get single order
// @route   GET /api/v1/orders/:id
// @access  Private
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "orderItems.product",
    "img name category brand deliveryDays returnPolicy"
  );

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  // Users can only view their own orders (unless admin)
  if (
    order.user.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to view this order",
    });
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// @desc    Cancel order
// @route   PUT /api/v1/orders/:id/cancel
// @access  Private
exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  if (order.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to cancel this order",
    });
  }

  if (order.orderStatus !== "Processing" && order.orderStatus !== "Confirmed") {
    return res.status(400).json({
      success: false,
      message: `Order cannot be cancelled. Current status: ${order.orderStatus}`,
    });
  }

  // Restore stock
  for (const item of order.orderItems) {
    const product = await Product.findById(item.product);
    if (product) {
      product.stock += item.quantity;
      await product.save();
    }
  }

  order.orderStatus = "Cancelled";
  order.statusHistory.push({
    status: "Cancelled",
    timestamp: new Date(),
    note: "Order cancelled by customer",
  });

  // Refund if already paid
  if (order.paymentStatus === "paid") {
    order.paymentStatus = "refunded";
  }

  await order.save();

  res.status(200).json({
    success: true,
    order,
  });
});

// @desc    Request return (within 5-day window)
// @route   PUT /api/v1/orders/:id/return
// @access  Private
exports.requestReturn = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  if (order.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized",
    });
  }

  if (order.orderStatus !== "Delivered") {
    return res.status(400).json({
      success: false,
      message: "Only delivered orders can be returned",
    });
  }

  if (order.returnStatus !== "none") {
    return res.status(400).json({
      success: false,
      message: `Return already ${order.returnStatus}`,
    });
  }

  // Check 5-day return window
  const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
  if (!order.deliveredAt || Date.now() - new Date(order.deliveredAt).getTime() > fiveDaysMs) {
    return res.status(400).json({
      success: false,
      message: "Return window has expired (5 days from delivery)",
    });
  }

  order.returnStatus = "requested";
  order.returnReason = reason || "No reason provided";
  order.returnRequestedAt = new Date();
  order.orderStatus = "Return Requested";
  order.statusHistory.push({
    status: "Return Requested",
    timestamp: new Date(),
    note: `Return requested: ${reason || "No reason provided"}`,
  });

  await order.save();

  res.status(200).json({
    success: true,
    message: "Return request submitted successfully. Free return — no shipping costs.",
    order,
  });
});

// @desc    Handle return request (admin approve/reject)
// @route   PUT /api/v1/orders/:id/return/handle
// @access  Private/Admin
exports.handleReturn = asyncHandler(async (req, res) => {
  const { action } = req.body; // "approve" or "reject"
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  if (order.returnStatus !== "requested") {
    return res.status(400).json({
      success: false,
      message: "No pending return request for this order",
    });
  }

  if (action === "approve") {
    order.returnStatus = "completed";
    order.orderStatus = "Returned";
    order.paymentStatus = "refunded";

    // Restore stock
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    order.statusHistory.push({
      status: "Returned",
      timestamp: new Date(),
      note: "Return approved — full refund issued. Free return, no shipping costs.",
    });
  } else if (action === "reject") {
    order.returnStatus = "rejected";
    order.orderStatus = "Delivered"; // Revert status
    order.statusHistory.push({
      status: "Return Rejected",
      timestamp: new Date(),
      note: "Return request rejected by admin",
    });
  } else {
    return res.status(400).json({
      success: false,
      message: "Invalid action. Use 'approve' or 'reject'.",
    });
  }

  await order.save();

  res.status(200).json({
    success: true,
    order,
  });
});

// @desc    Get all orders (admin)
// @route   GET /api/v1/orders
// @access  Private/Admin
exports.getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .populate("user", "firstName lastName email");

  const totalRevenue = orders.reduce((sum, order) => {
    if (order.orderStatus !== "Cancelled" && order.orderStatus !== "Returned") {
      return sum + order.totalAmount;
    }
    return sum;
  }, 0);

  res.status(200).json({
    success: true,
    count: orders.length,
    totalRevenue,
    orders,
  });
});

// @desc    Update order status (admin)
// @route   PUT /api/v1/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  if (order.orderStatus === "Delivered") {
    return res.status(400).json({
      success: false,
      message: "Order has already been delivered",
    });
  }

  if (order.orderStatus === "Cancelled") {
    return res.status(400).json({
      success: false,
      message: "Order has been cancelled",
    });
  }

  if (order.orderStatus === "Returned") {
    return res.status(400).json({
      success: false,
      message: "Order has been returned",
    });
  }

  order.orderStatus = status;

  // Add to status history
  order.statusHistory.push({
    status,
    timestamp: new Date(),
    note: note || "",
  });

  if (status === "Delivered") {
    order.deliveredAt = Date.now();
    order.paymentStatus = "paid";
  }

  await order.save();

  // Sync shipment status with order status
  const shipment = await Shipment.findOne({ order: order._id });
  if (shipment) {
    let shipmentStatus = shipment.status;
    let eventStatus = "";
    const shipmentNote = note || "";
    switch (status) {
      case "Confirmed":
        shipmentStatus = "pickup_scheduled";
        eventStatus = "Pickup Scheduled";
        break;
      case "Shipped":
        shipmentStatus = "in_transit";
        eventStatus = "In Transit";
        break;
      case "Out for Delivery":
        shipmentStatus = "out_for_delivery";
        eventStatus = "Out for Delivery";
        break;
      case "Delivered":
        shipmentStatus = "delivered";
        eventStatus = "Delivered";
        await Shipment.updateOne({ _id: shipment._id }, { actual_delivery: new Date() });
        break;
      case "Cancelled":
        shipmentStatus = "failed";
        eventStatus = "Cancelled";
        break;
      default:
        // no change
        break;
    }
    if (eventStatus) {
      await Shipment.updateOne({ _id: shipment._id }, { status: shipmentStatus, updated_at: new Date() });
      await ShipmentEvent.create({
        shipment: shipment._id,
        status: eventStatus,
        location: "",
        description: shipmentNote,
      });
    }
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// New shipment and delivery slot handlers
exports.getShipmentByOrderId = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findOne({ order: req.params.id }).populate('order');
  if (!shipment) {
    return res.status(404).json({ success: false, message: 'Shipment not found' });
  }
  const events = await ShipmentEvent.find({ shipment: shipment._id }).sort({ timestamp: 1 });
  res.status(200).json({ success: true, shipment, events });
});

exports.updateShipment = asyncHandler(async (req, res) => {
  const { status, location, estimatedDelivery, actualDelivery, note } = req.body;
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) {
    return res.status(404).json({ success: false, message: 'Shipment not found' });
  }
  const update = {};
  if (status) update.status = status;
  if (location !== undefined) update.current_location = location;
  if (estimatedDelivery !== undefined) update.estimated_delivery = estimatedDelivery;
  if (actualDelivery !== undefined) update.actual_delivery = actualDelivery;
  update.updated_at = new Date();
  
  const updated = await Shipment.findByIdAndUpdate(shipment._id, update, { new: true });
  
  const eventStatus = status || shipment.status;
  const eventLocation = location || shipment.current_location;
  const eventDescription = note || `Status updated to ${eventStatus}`;
  
  await ShipmentEvent.create({
    shipment: updated._id,
    status: eventStatus,
    location: eventLocation,
    description: eventDescription,
    timestamp: new Date()
  });

  // Sync parent order's status
  const order = await Order.findById(shipment.order);
  if (order && status) {
    let orderStatus = "";
    switch (status) {
      case "pickup_scheduled":
      case "picked_up":
        orderStatus = "Confirmed";
        break;
      case "in_transit":
        orderStatus = "Shipped";
        break;
      case "out_for_delivery":
        orderStatus = "Out for Delivery";
        break;
      case "delivered":
        orderStatus = "Delivered";
        break;
      case "failed":
        orderStatus = "Cancelled";
        break;
      case "returned":
        orderStatus = "Returned";
        break;
    }
    
    if (orderStatus) {
      order.orderStatus = orderStatus;
      if (orderStatus === "Delivered") {
        order.deliveredAt = Date.now();
        order.paymentStatus = "paid";
      }
      order.statusHistory.push({
        status: orderStatus,
        timestamp: new Date(),
        note: eventDescription,
      });
      await order.save();
    }
  }

  res.status(200).json({ success: true, shipment: updated });
});

exports.trackByNumber = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findOne({ tracking_number: req.params.trackingNumber });
  if (!shipment) {
    return res.status(404).json({ success: false, message: 'Shipment not found' });
  }
  const events = await ShipmentEvent.find({ shipment: shipment._id }).sort({ timestamp: 1 });
  
  res.status(200).json({
    success: true,
    shipment: {
      tracking_number: shipment.tracking_number,
      carrier: shipment.carrier,
      status: shipment.status,
      current_location: shipment.current_location,
      estimated_delivery: shipment.estimated_delivery,
      actual_delivery: shipment.actual_delivery,
    },
    events: events.map(e => ({
      status: e.status,
      location: e.location,
      description: e.description,
      timestamp: e.timestamp,
    })),
  });
});

exports.createDeliverySlot = asyncHandler(async (req, res) => {
  const { slot_time } = req.body;
  const orderId = req.params.id;
  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  const slot = await DeliverySlot.create({ order: order._id, slot_time, is_reserved: true });
  res.status(201).json({ success: true, slot });
});

exports.getDeliverySlots = asyncHandler(async (req, res) => {
  const slots = await DeliverySlot.find({ order: req.params.id }).sort({ slot_time: 1 });
  res.status(200).json({ success: true, slots });
});
