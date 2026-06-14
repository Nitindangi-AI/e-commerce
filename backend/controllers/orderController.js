const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const db = require("../config/db");
const generateOrderId = require("../utils/generateOrderId");
const { processMockPayment } = require("../utils/paymentGateway");
const { sendOrderConfirmationEmail, sendVendorOrderNotificationEmail } = require("../utils/email");

// @desc    Create new order
// @route   POST /api/v1/orders
// @access  Private
exports.createOrder = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    couponCode,
    useLoyalty,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No order items provided",
    });
  }

  const selectedPayment = paymentMethod || "cod";
  const orderId = generateOrderId();
  const orderNumber = 'ORD-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  let subtotal = 0;
  let maxDeliveryDays = 0;
  const validatedItems = [];

  // Begin PostgreSQL Transaction
  await db.query("BEGIN");

  try {
    // 1. Validate items and lock rows using SELECT ... FOR UPDATE to prevent race conditions
    for (const item of orderItems) {
      const productRes = await db.query("SELECT * FROM products WHERE id = $1 FOR UPDATE", [item.product]);
      if (productRes.rows.length === 0) {
        throw new Error(`Product not found: ${item.product}`);
      }
      const product = productRes.rows[0];

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`);
      }

      validatedItems.push({
        product: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.img,
        color: item.color || "",
        size: item.size || "",
        seller_id: product.seller_id,
        current_stock: product.stock
      });

      subtotal += parseFloat(product.price) * item.quantity;
      if (product.delivery_days > maxDeliveryDays) {
        maxDeliveryDays = product.delivery_days;
      }
    }

    // 2. Server-side discount calculation (not trusting frontend total/discount)
    let discountAmount = 0;
    if (couponCode) {
      const couponRes = await db.query(
        "SELECT * FROM coupons WHERE code = $1 AND is_active = true",
        [couponCode.toUpperCase()]
      );
      if (couponRes.rows.length === 0) {
        throw new Error("Invalid coupon code");
      }
      const coupon = couponRes.rows[0];

      // Check usage limits, min order value, expiration, and user usage
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        throw new Error("Coupon has expired");
      }
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        throw new Error("Coupon usage limit reached");
      }
      const minOrderVal = parseFloat(coupon.min_order_value || coupon.min_order || 0);
      if (subtotal < minOrderVal) {
        throw new Error(`Minimum order value of ₹${minOrderVal} required to use this coupon`);
      }

      const usageCheck = await db.query(
        "SELECT * FROM coupon_usage WHERE user_id = $1 AND coupon_id = $2",
        [req.user._id.toString(), coupon.id]
      );
      if (usageCheck.rows.length > 0) {
        throw new Error("You have already used this coupon");
      }

      discountAmount = coupon.type === "percent"
        ? Math.round((subtotal * parseFloat(coupon.discount)) / 100)
        : parseFloat(coupon.discount);

      const maxDisc = parseFloat(coupon.max_discount || 0);
      if (maxDisc > 0 && discountAmount > maxDisc) {
        discountAmount = maxDisc;
      }
    }

    // GST 18% applied on subtotal (matches frontend: subtotal * 0.18)
    const gstAmount = Math.round(parseFloat((subtotal * 0.18).toFixed(2)));
    // Shipping: ₹99 if subtotal ≤ ₹999, else FREE (matches frontend & CartPage)
    const shippingCost = subtotal > 999 ? 0 : 99;
    let totalAmount = Math.max(0, subtotal + gstAmount + shippingCost - discountAmount);

    // Apply loyalty discount if requested
    // Loyalty: 1 point = ₹1, capped at pre-loyalty total (matches frontend maxLoyaltyDiscount)
    let loyaltyDiscountRedeemed = 0;
    if (useLoyalty) {
      const profileRes = await db.query(
        "SELECT loyalty_points FROM profiles WHERE id = $1",
        [req.user._id.toString()]
      );
      if (profileRes.rows.length > 0) {
        const userPoints = parseInt(profileRes.rows[0].loyalty_points || 0);
        // Cap: cannot exceed current totalAmount (subtotal+gst+shipping-coupons)
        const maxRedeemable = Math.min(userPoints, totalAmount);
        if (maxRedeemable > 0) {
          loyaltyDiscountRedeemed = maxRedeemable;
          discountAmount += loyaltyDiscountRedeemed;
          totalAmount = Math.max(0, totalAmount - loyaltyDiscountRedeemed);
          
          // Deduct loyalty points from profile
          await db.query(
            "UPDATE profiles SET loyalty_points = loyalty_points - $2 WHERE id = $1",
            [req.user._id.toString(), loyaltyDiscountRedeemed]
          );
        }
      }
    }

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + (maxDeliveryDays || 3));

    // Process payment abstraction layer
    const paymentResult = await processMockPayment({
      amount: totalAmount,
      method: selectedPayment,
      orderId
    });

    const paymentStatus = paymentResult.status === "paid" ? "paid" : "pending";

    // 3. Insert order into Postgres
    const orderInsertQuery = `
      INSERT INTO orders (
        user_id, order_id, order_status, shipping_address, payment_method, payment_status, subtotal, shipping_cost, discount, coupon_code, total_amount, estimated_delivery, order_number, return_status, created_at, updated_at
      ) VALUES (
        $1, $2, 'Processing', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'none', now(), now()
      ) RETURNING *
    `;
    const orderInsertValues = [
      req.user._id.toString(),
      orderId,
      JSON.stringify(shippingAddress),
      selectedPayment,
      paymentStatus,
      Math.round(subtotal),
      Math.round(shippingCost),
      Math.round(discountAmount),
      couponCode || null,
      Math.round(totalAmount),
      estimatedDelivery,
      orderNumber
    ];
    // Note: gstAmount is included in totalAmount but stored implicitly
    // (total = subtotal + gst + shipping - discounts)
    const orderResult = await db.query(orderInsertQuery, orderInsertValues);
    const orderRow = orderResult.rows[0];

    // 4. Insert order items, update stock, and inventory logs
    for (const item of validatedItems) {
      await db.query(`
        INSERT INTO order_items (
          order_id, product_id, name, price, quantity, image, color, size, product_name, product_img, unit_price, seller_id, is_reviewed
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false
        )
      `, [
        orderRow.id, item.product, item.name, Math.round(item.price), item.quantity, item.image, item.color, item.size, item.name, item.image, Math.round(item.price), item.seller_id
      ]);

      // Decrement stock
      await db.query("UPDATE products SET stock = stock - $2 WHERE id = $1", [item.product, item.quantity]);

      // Inventory log (now() is a SQL function — no JS call needed)
      await db.query(`
        INSERT INTO inventory_log (
          product_id, change_type, quantity_change, quantity_after, note, created_at
        ) VALUES (
          $1, 'order_placed', $2, $3, $4, now()
        )
      `, [item.product, -item.quantity, item.current_stock - item.quantity, `Order placed: ${orderNumber}`]);
    }

    // 5. Create payment record
    await db.query(`
      INSERT INTO payments (
        order_id, user_id, amount, currency, method, status, gateway, gateway_payment_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'INR', $4, $5, $6, $7, now(), now()
      )
    `, [
      orderRow.id,
      req.user._id.toString(),
      Math.round(totalAmount),
      selectedPayment,
      paymentResult.status === 'paid' ? 'success' : 'pending',
      paymentResult.gateway,
      paymentResult.transactionId || null
    ]);

    // 6. Handle coupon usage if present
    if (couponCode) {
      const couponRes = await db.query("SELECT * FROM coupons WHERE code = $1", [couponCode.toUpperCase()]);
      if (couponRes.rows.length > 0) {
        const coupon = couponRes.rows[0];
        await db.query(
          "INSERT INTO coupon_usage (user_id, coupon_id, order_id, used_at) VALUES ($1, $2, $3, now()) ON CONFLICT DO NOTHING",
          [req.user._id.toString(), coupon.id, orderRow.id]
        );
        await db.query(
          "UPDATE coupons SET used_count = used_count + 1 WHERE id = $1",
          [coupon.id]
        );
      }
    }

    // 7. Send user notification
    await db.query(`
      INSERT INTO user_notifications (user_id, type, title, message, created_at)
      VALUES ($1, 'order_update', 'Order Placed', $2, now())
    `, [req.user._id.toString(), `Order ${orderNumber} placed successfully`]);

    // Commit Transaction
    await db.query("COMMIT");

    // Fetch the shipment row automatically created by trg_insert_shipment_after_order trigger
    const shipmentResult = await db.query(
      "SELECT * FROM shipments WHERE order_id = $1",
      [orderRow.id]
    );
    const shipmentRow = shipmentResult.rows[0];

    // Create initial pending shipment event
    if (shipmentRow) {
      // Update shipment estimated_delivery to match estimatedDelivery
      await db.query(
        "UPDATE shipments SET estimated_delivery = $2, updated_at = now() WHERE id = $1",
        [shipmentRow.id, estimatedDelivery]
      );
      
      await db.query(`
        INSERT INTO shipment_events (
          shipment_id, status, description, timestamp
        ) VALUES (
          $1, 'pending', 'Order placed successfully and awaiting pickup', now()
        )
      `, [shipmentRow.id]);
    }

    // Sync to MongoDB
    try {
      await Order.create({
        _id: orderRow.id,
        user: req.user._id,
        orderId,
        orderItems: validatedItems.map(i => ({
          product: i.product,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image: i.image,
          color: i.color,
          size: i.size,
        })),
        shippingAddress,
        paymentMethod: selectedPayment,
        paymentStatus,
        totalAmount,
        estimatedDelivery,
        orderStatus: "Processing",
        statusHistory: [{ status: "Processing", timestamp: new Date(), note: "Order placed successfully" }],
      });
    } catch (err) {
      console.error("MongoDB order sync error:", err);
    }

    // Dispatch emails asynchronously
    // Group items by vendor, fetch vendor emails, and notify
    (async () => {
      try {
        const sellerIds = [...new Set(validatedItems.map(i => i.seller_id))];
        for (const sId of sellerIds) {
          if (sId) {
            const vendorRes = await db.query("SELECT email FROM profiles WHERE id = $1", [sId]);
            if (vendorRes.rows.length > 0) {
              const vendorEmail = vendorRes.rows[0].email;
              const vendorItems = validatedItems.filter(i => i.seller_id === sId);
              await sendVendorOrderNotificationEmail(vendorEmail, orderRow, vendorItems);
            }
          }
        }
        await sendOrderConfirmationEmail(req.user.email, orderRow, validatedItems);
      } catch (emailErr) {
        console.error("Async email notification dispatch failed:", emailErr);
      }
    })();

    return res.status(201).json({
      success: true,
      order: orderRow,
      shipment: shipmentRow ? {
        id: shipmentRow.id,
        tracking_number: shipmentRow.tracking_number,
        status: shipmentRow.status,
      } : null,
    });

  } catch (error) {
    await db.query("ROLLBACK");
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create order",
    });
  }
});

// @desc    Get logged-in user's orders
// @route   GET /api/v1/orders/my
// @access  Private
exports.getMyOrders = asyncHandler(async (req, res) => {
  const result = await db.query(
    "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
    [req.user._id.toString()]
  );
  
  const orders = [];
  for (const order of result.rows) {
    const itemsRes = await db.query(
      "SELECT oi.*, p.img, p.name, p.delivery_days, p.return_policy FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1",
      [order.id]
    );
    orders.push({
      ...order,
      orderItems: itemsRes.rows,
    });
  }

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
  const result = await db.query("SELECT * FROM orders WHERE id = $1", [req.params.id]);
  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }
  const order = result.rows[0];

  if (
    order.user_id.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to view this order",
    });
  }

  const itemsRes = await db.query(
    "SELECT oi.*, p.img, p.name, p.category, p.brand, p.delivery_days, p.return_policy FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1",
    [order.id]
  );

  res.status(200).json({
    success: true,
    order: {
      ...order,
      orderItems: itemsRes.rows,
    },
  });
});

// @desc    Cancel order
// @route   POST /api/v1/orders/:id/cancel
// @access  Private
exports.cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason = "Cancelled by customer" } = req.body;

  const orderRes = await db.query("SELECT * FROM orders WHERE id = $1", [id]);
  if (orderRes.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }
  const order = orderRes.rows[0];

  if (
    order.user_id.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to cancel this order",
    });
  }

  if (order.order_status !== "Processing" && order.order_status !== "Confirmed") {
    return res.status(400).json({
      success: false,
      message: "Order cannot be cancelled at this stage",
    });
  }

  await db.query(
    "UPDATE orders SET order_status = 'Cancelled', cancel_reason = $2, cancelled_at = now(), updated_at = now() WHERE id = $1",
    [id, reason]
  );

  const itemsRes = await db.query("SELECT * FROM order_items WHERE order_id = $1", [id]);
  for (const item of itemsRes.rows) {
    await db.query("UPDATE products SET stock = stock + $2 WHERE id = $1", [item.product_id, item.quantity]);
  }

  await db.query("UPDATE shipments SET status = 'failed', updated_at = now() WHERE order_id = $1", [id]);

  try {
    const mongoOrder = await Order.findById(id);
    if (mongoOrder) {
      mongoOrder.orderStatus = "Cancelled";
      mongoOrder.statusHistory.push({
        status: "Cancelled",
        timestamp: new Date(),
        note: reason,
      });
      if (mongoOrder.paymentStatus === "paid") {
        mongoOrder.paymentStatus = "refunded";
      }
      await mongoOrder.save();
    }
  } catch (err) {}

  res.status(200).json({
    success: true,
    message: "Order cancelled successfully",
  });
});

// @desc    Request return
// @route   POST /api/v1/orders/:id/return
// @access  Private
exports.requestReturn = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const orderRes = await db.query("SELECT * FROM orders WHERE id = $1", [id]);
  if (orderRes.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }
  const order = orderRes.rows[0];

  if (order.user_id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized",
    });
  }

  if (order.order_status !== "Delivered") {
    return res.status(400).json({
      success: false,
      message: "Only delivered orders can be returned",
    });
  }

  if (order.return_status && order.return_status !== "none") {
    return res.status(400).json({
      success: false,
      message: `Return already ${order.return_status}`,
    });
  }

  const productsRes = await db.query(
    "SELECT p.return_policy FROM products p JOIN order_items oi ON oi.product_id = p.id WHERE oi.order_id = $1",
    [id]
  );
  let returnDays = 5;
  for (const row of productsRes.rows) {
    let policy = row.return_policy;
    if (typeof policy === "string") {
      try { policy = JSON.parse(policy); } catch {}
    }
    if (policy && policy.returnDays !== undefined) {
      returnDays = Math.max(returnDays, parseInt(policy.returnDays));
    }
  }

  const deliveredAt = new Date(order.delivered_at);
  const returnWindow = new Date(deliveredAt.getTime() + returnDays * 24 * 60 * 60 * 1000);
  if (returnWindow < new Date()) {
    return res.status(400).json({
      success: false,
      message: "Return window has expired",
    });
  }

  await db.query(
    "UPDATE orders SET return_status = 'requested', return_reason = $2, return_requested_at = now(), order_status = 'Return Requested', updated_at = now() WHERE id = $1",
    [id, reason || "No reason provided"]
  );

  const adminRes = await db.query("SELECT id FROM profiles WHERE role = 'admin' LIMIT 1");
  if (adminRes.rows.length > 0) {
    const adminId = adminRes.rows[0].id;
    await db.query(
      "INSERT INTO user_notifications (user_id, type, title, message, created_at) VALUES ($1, 'order_update', $2, $3, now())",
      [adminId, "Return Requested", `Return requested for order ${order.order_number || id}`]
    );
  }

  try {
    const mongoOrder = await Order.findById(id);
    if (mongoOrder) {
      mongoOrder.returnStatus = "requested";
      mongoOrder.returnReason = reason || "No reason provided";
      mongoOrder.returnRequestedAt = new Date();
      mongoOrder.orderStatus = "Return Requested";
      mongoOrder.statusHistory.push({
        status: "Return Requested",
        timestamp: new Date(),
        note: `Return requested: ${reason || "No reason provided"}`,
      });
      await mongoOrder.save();
    }
  } catch (err) {}

  res.status(200).json({
    success: true,
    message: "Return request submitted successfully",
  });
});

// @desc    Handle return request (admin approve/reject)
// @route   PUT /api/v1/orders/:id/return/handle
// @access  Private/Admin
exports.handleReturn = asyncHandler(async (req, res) => {
  const { action } = req.body;
  const { id } = req.params;
  
  const orderRes = await db.query("SELECT * FROM orders WHERE id = $1", [id]);
  if (orderRes.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }
  const order = orderRes.rows[0];

  if (order.return_status !== "requested") {
    return res.status(400).json({
      success: false,
      message: "No pending return request for this order",
    });
  }

  if (action === "approve") {
    await db.query(
      "UPDATE orders SET return_status = 'completed', order_status = 'Returned', payment_status = 'refunded', updated_at = now() WHERE id = $1",
      [id]
    );
    const itemsRes = await db.query("SELECT * FROM order_items WHERE order_id = $1", [id]);
    for (const item of itemsRes.rows) {
      await db.query("UPDATE products SET stock = stock + $2 WHERE id = $1", [item.product_id, item.quantity]);
    }
  } else if (action === "reject") {
    await db.query(
      "UPDATE orders SET return_status = 'rejected', order_status = 'Delivered', updated_at = now() WHERE id = $1",
      [id]
    );
  } else {
    return res.status(400).json({
      success: false,
      message: "Invalid action. Use 'approve' or 'reject'.",
    });
  }

  const updated = await db.query("SELECT * FROM orders WHERE id = $1", [id]);

  try {
    const mongoOrder = await Order.findById(id);
    if (mongoOrder) {
      if (action === "approve") {
        mongoOrder.returnStatus = "completed";
        mongoOrder.orderStatus = "Returned";
        mongoOrder.paymentStatus = "refunded";
        mongoOrder.statusHistory.push({ status: "Returned", timestamp: new Date(), note: "Approved by admin" });
      } else {
        mongoOrder.returnStatus = "rejected";
        mongoOrder.orderStatus = "Delivered";
        mongoOrder.statusHistory.push({ status: "Return Rejected", timestamp: new Date(), note: "Rejected by admin" });
      }
      await mongoOrder.save();
    }
  } catch (err) {}

  res.status(200).json({
    success: true,
    order: updated.rows[0],
  });
});

// @desc    Get all orders (admin)
// @route   GET /api/v1/orders
// @access  Private/Admin
exports.getAllOrders = asyncHandler(async (req, res) => {
  const result = await db.query(
    "SELECT o.*, p.email, p.full_name FROM orders o JOIN profiles p ON o.user_id = p.id ORDER BY o.created_at DESC"
  );
  const orders = result.rows.map(row => ({
    ...row,
    user: { email: row.email, firstName: row.full_name.split(' ')[0] || '', lastName: row.full_name.split(' ')[1] || '' }
  }));
  
  const totalRevenue = orders.reduce((sum, order) => {
    if (order.order_status !== "Cancelled" && order.order_status !== "Returned") {
      return sum + parseFloat(order.total_amount);
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

// @desc    Update order status
// @route   PUT /api/v1/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const { id } = req.params;

  const orderRes = await db.query("SELECT * FROM orders WHERE id = $1", [id]);
  if (orderRes.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }
  const order = orderRes.rows[0];

  if (order.order_status === "Delivered") {
    return res.status(400).json({
      success: false,
      message: "Order has already been delivered",
    });
  }

  let updateQuery = "UPDATE orders SET order_status = $2";
  const params = [id, status];

  if (status === "Confirmed") {
    updateQuery += `, confirmed_at = now()`;
  } else if (status === "Shipped") {
    updateQuery += `, shipped_at = now()`;
  } else if (status === "Delivered") {
    updateQuery += `, delivered_at = now(), payment_status = 'paid'`;
  }

  updateQuery += `, updated_at = now() WHERE id = $1 RETURNING *`;
  const updatedRes = await db.query(updateQuery, params);
  const updatedOrder = updatedRes.rows[0];

  if (status === "Delivered" && order.order_status !== "Delivered") {
    const totalAmount = parseFloat(order.total_amount);
    const earnedPoints = Math.floor(totalAmount / 10);

    await db.query(
      "UPDATE profiles SET total_orders = total_orders + 1, total_spent = total_spent + $2, loyalty_points = loyalty_points + $3 WHERE id = $1",
      [order.user_id, totalAmount, earnedPoints]
    );

    await db.query(
      "INSERT INTO user_notifications (user_id, type, title, message, created_at) VALUES ($1, 'promotion', 'Loyalty Points Earned', $2, now())",
      [order.user_id, `You earned ${earnedPoints} loyalty points from order ${order.order_number}!`]
    );
  }

  // Sync shipment status with order status
  const shipmentRes = await db.query("SELECT * FROM shipments WHERE order_id = $1", [id]);
  if (shipmentRes.rows.length > 0) {
    const shipment = shipmentRes.rows[0];
    let shipmentStatus = shipment.status;
    let eventStatus = "";
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
        await db.query("UPDATE shipments SET actual_delivery = now() WHERE id = $1", [shipment.id]);
        break;
      case "Cancelled":
        shipmentStatus = "failed";
        eventStatus = "Cancelled";
        break;
    }
    if (eventStatus) {
      await db.query("UPDATE shipments SET status = $2, updated_at = now() WHERE id = $1", [shipment.id, shipmentStatus]);
      await db.query(
        "INSERT INTO shipment_events (shipment_id, status, description, timestamp) VALUES ($1, $2, $3, now())",
        [shipment.id, eventStatus, note || `Shipment status updated to ${eventStatus}`]
      );
    }
  }

  try {
    const mongoOrder = await Order.findById(id);
    if (mongoOrder) {
      mongoOrder.orderStatus = status;
      if (status === "Delivered") {
        mongoOrder.deliveredAt = new Date();
        mongoOrder.paymentStatus = "paid";
      }
      mongoOrder.statusHistory.push({
        status,
        timestamp: new Date(),
        note: note || "",
      });
      await mongoOrder.save();
    }
  } catch (err) {}

  res.status(200).json({
    success: true,
    order: updatedOrder,
  });
});

exports.getShipmentByOrderId = asyncHandler(async (req, res) => {
  const shipmentRes = await db.query("SELECT * FROM shipments WHERE order_id = $1", [req.params.id]);
  if (shipmentRes.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Shipment not found' });
  }
  const shipment = shipmentRes.rows[0];
  const eventsRes = await db.query("SELECT * FROM shipment_events WHERE shipment_id = $1 ORDER BY timestamp ASC", [shipment.id]);
  res.status(200).json({ success: true, shipment, events: eventsRes.rows });
});

exports.updateShipment = asyncHandler(async (req, res) => {
  const { status, location, estimatedDelivery, actualDelivery, note } = req.body;
  const shipmentRes = await db.query("SELECT * FROM shipments WHERE id = $1", [req.params.id]);
  if (shipmentRes.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Shipment not found' });
  }
  const shipment = shipmentRes.rows[0];

  const updates = [];
  const params = [shipment.id];
  let paramIndex = 2;

  if (status) {
    updates.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }
  if (location !== undefined) {
    updates.push(`current_location = $${paramIndex}`);
    params.push(location);
    paramIndex++;
  }
  if (estimatedDelivery !== undefined) {
    updates.push(`estimated_delivery = $${paramIndex}`);
    params.push(estimatedDelivery);
    paramIndex++;
  }
  if (actualDelivery !== undefined) {
    updates.push(`actual_delivery = $${paramIndex}`);
    params.push(actualDelivery);
    paramIndex++;
  }

  updates.push(`updated_at = now()`);
  const query = `UPDATE shipments SET ${updates.join(", ")} WHERE id = $1 RETURNING *`;
  const updatedRes = await db.query(query, params);
  const updated = updatedRes.rows[0];

  await db.query(`
    INSERT INTO shipment_events (shipment_id, status, description, timestamp)
    VALUES ($1, $2, $3, now())
  `, [updated.id, status || updated.status, note || `Status updated to ${status || updated.status}`]);

  res.status(200).json({ success: true, shipment: updated });
});

exports.trackByNumber = asyncHandler(async (req, res) => {
  const shipmentRes = await db.query("SELECT * FROM shipments WHERE tracking_number = $1", [req.params.trackingNumber]);
  if (shipmentRes.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Shipment not found' });
  }
  const shipment = shipmentRes.rows[0];
  const eventsRes = await db.query("SELECT * FROM shipment_events WHERE shipment_id = $1 ORDER BY timestamp ASC", [shipment.id]);
  res.status(200).json({ success: true, shipment, events: eventsRes.rows });
});

exports.createDeliverySlot = asyncHandler(async (req, res) => {
  const { slot_time, slot_date = new Date() } = req.body;
  const orderId = req.params.id;
  const slotRes = await db.query(`
    INSERT INTO delivery_slots (order_id, slot_date, slot_time, is_confirmed, created_at)
    VALUES ($1, $2, $3, true, now()) RETURNING *
  `, [orderId, slot_date, slot_time]);
  res.status(201).json({ success: true, slot: slotRes.rows[0] });
});

exports.getDeliverySlots = asyncHandler(async (req, res) => {
  const slotsRes = await db.query("SELECT * FROM delivery_slots WHERE order_id = $1 ORDER BY created_at ASC", [req.params.id]);
  res.status(200).json({ success: true, slots: slotsRes.rows });
});
