const db = require("../../config/db");

exports.beginTransaction = async () => {
  await db.query("BEGIN");
};

exports.commitTransaction = async () => {
  await db.query("COMMIT");
};

exports.rollbackTransaction = async () => {
  await db.query("ROLLBACK");
};

exports.findIdempotencyKey = async (key) => {
  const result = await db.query("SELECT order_id FROM idempotency_keys WHERE key = $1", [key]);
  return result.rows[0] || null;
};

exports.findOrderById = async (id) => {
  const result = await db.query("SELECT * FROM orders WHERE id = $1 AND deleted_at IS NULL", [id]);
  return result.rows[0] || null;
};

exports.findShipmentByOrderId = async (orderId) => {
  const result = await db.query("SELECT id, tracking_number, status FROM shipments WHERE order_id = $1", [orderId]);
  return result.rows[0] || null;
};

exports.lockProductForUpdate = async (productId) => {
  const result = await db.query("SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL FOR UPDATE", [productId]);
  return result.rows[0] || null;
};

exports.findActiveCouponByCode = async (code) => {
  const result = await db.query(
    "SELECT * FROM coupons WHERE code = $1 AND is_active = true",
    [code.toUpperCase()]
  );
  return result.rows[0] || null;
};

exports.findCouponUsage = async (userId, couponId) => {
  const result = await db.query(
    "SELECT * FROM coupon_usage WHERE user_id = $1 AND coupon_id = $2",
    [userId, couponId]
  );
  return result.rows[0] || null;
};

exports.getUserLoyaltyPoints = async (userId) => {
  const result = await db.query("SELECT loyalty_points FROM profiles WHERE id = $1", [userId]);
  return result.rows[0] ? parseInt(result.rows[0].loyalty_points || 0, 10) : 0;
};

exports.deductLoyaltyPoints = async (userId, points) => {
  return db.query("UPDATE profiles SET loyalty_points = loyalty_points - $2 WHERE id = $1", [userId, points]);
};

exports.createOrder = async (orderData) => {
  const query = `
    INSERT INTO orders (
      user_id, order_id, order_status, shipping_address, payment_method, payment_status, subtotal, shipping_cost, discount, coupon_code, total_amount, estimated_delivery, order_number, return_status, created_at, updated_at
    ) VALUES (
      $1, $2, 'Processing', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'none', now(), now()
    ) RETURNING *
  `;
  const values = [
    orderData.userId,
    orderData.orderId,
    orderData.shippingAddress,
    orderData.paymentMethod,
    orderData.paymentStatus,
    orderData.subtotal,
    orderData.shippingCost,
    orderData.discountAmount,
    orderData.couponCode,
    orderData.totalAmount,
    orderData.estimatedDelivery,
    orderData.orderNumber
  ];
  const result = await db.query(query, values);
  return result.rows[0];
};

exports.createOrderItem = async (itemData) => {
  return db.query(`
    INSERT INTO order_items (
      order_id, product_id, name, price, quantity, image, color, size, product_name, product_img, unit_price, seller_id, is_reviewed
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false
    )
  `, [
    itemData.orderId,
    itemData.productId,
    itemData.name,
    itemData.price,
    itemData.quantity,
    itemData.image,
    itemData.color,
    itemData.size,
    itemData.name,
    itemData.image,
    itemData.price,
    itemData.sellerId
  ]);
};

exports.decrementStock = async (productId, quantity) => {
  return db.query(
    "UPDATE products SET stock = stock - $2 WHERE id = $1 AND stock >= $2",
    [productId, quantity]
  );
};

exports.createInventoryLog = async (logData) => {
  return db.query(`
    INSERT INTO inventory_log (
      product_id, change_type, quantity_change, quantity_after, note, created_at
    ) VALUES (
      $1, 'sale', $2, $3, $4, now()
    )
  `, [logData.productId, logData.quantityChange, logData.quantityAfter, logData.note]);
};

exports.createPaymentRecord = async (paymentData) => {
  return db.query(`
    INSERT INTO payments (
      order_id, user_id, amount, currency, method, status, gateway, gateway_payment_id, created_at, updated_at
    ) VALUES (
      $1, $2, $3, 'INR', $4, $5, $6, $7, now(), now()
    )
  `, [
    paymentData.orderId,
    paymentData.userId,
    paymentData.amount,
    paymentData.method,
    paymentData.status,
    paymentData.gateway,
    paymentData.gatewayPaymentId
  ]);
};

exports.createCouponUsage = async (userId, couponId, orderId) => {
  return db.query(
    "INSERT INTO coupon_usage (user_id, coupon_id, order_id, used_at) VALUES ($1, $2, $3, now()) ON CONFLICT DO NOTHING",
    [userId, couponId, orderId]
  );
};

exports.incrementCouponUsedCount = async (couponId) => {
  return db.query("UPDATE coupons SET used_count = used_count + 1 WHERE id = $1", [couponId]);
};

exports.createUserNotification = async (userId, type, title, message) => {
  return db.query(`
    INSERT INTO user_notifications (user_id, type, title, message, created_at)
    VALUES ($1, $2, $3, $4, now())
  `, [userId, type, title, message]);
};

exports.createIdempotencyKey = async (key, orderId) => {
  return db.query(
    "INSERT INTO idempotency_keys (key, order_id, created_at) VALUES ($1, $2, now())",
    [key, orderId]
  );
};

exports.cleanupIdempotencyKeys = async () => {
  return db.query(
    "DELETE FROM idempotency_keys WHERE created_at < now() - interval '24 hours'"
  );
};

exports.findShipmentDetailsByOrderId = async (orderId) => {
  const result = await db.query("SELECT * FROM shipments WHERE order_id = $1", [orderId]);
  return result.rows[0] || null;
};

exports.updateShipmentDelivery = async (shipmentId, estimatedDelivery) => {
  return db.query(
    "UPDATE shipments SET estimated_delivery = $2, updated_at = now() WHERE id = $1",
    [shipmentId, estimatedDelivery]
  );
};

exports.createShipmentEvent = async (shipmentId, status, description) => {
  return db.query(`
    INSERT INTO shipment_events (
      shipment_id, status, description, timestamp
    ) VALUES (
      $1, $2, $3, now()
    )
  `, [shipmentId, status, description]);
};

exports.getVendorEmail = async (sellerId) => {
  const result = await db.query("SELECT email FROM profiles WHERE id = $1", [sellerId]);
  return result.rows[0] ? result.rows[0].email : null;
};

exports.findUserOrders = async (userId, limit = 20, offset = 0) => {
  const result = await db.query(
    "SELECT * FROM orders WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    [userId, limit, offset]
  );
  
  const countResult = await db.query(
    "SELECT COUNT(*) FROM orders WHERE user_id = $1 AND deleted_at IS NULL",
    [userId]
  );
  
  return {
    orders: result.rows,
    total: parseInt(countResult.rows[0].count, 10)
  };
};

exports.findOrderItems = async (orderId) => {
  const result = await db.query(
    "SELECT oi.*, p.img, p.name, p.delivery_days, p.return_policy FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1",
    [orderId]
  );
  return result.rows;
};

exports.findOrderItemsDetailed = async (orderId) => {
  const result = await db.query(
    "SELECT oi.*, p.img, p.name, p.category, p.brand, p.delivery_days, p.return_policy FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1",
    [orderId]
  );
  return result.rows;
};

exports.updateOrderCancelStatus = async (id, reason) => {
  return db.query(
    "UPDATE orders SET order_status = 'Cancelled', cancel_reason = $2, cancelled_at = now(), updated_at = now() WHERE id = $1",
    [id, reason]
  );
};

exports.incrementStock = async (productId, quantity) => {
  return db.query("UPDATE products SET stock = stock + $2 WHERE id = $1", [productId, quantity]);
};

exports.updateShipmentStatus = async (orderId, status) => {
  return db.query("UPDATE shipments SET status = $2, updated_at = now() WHERE order_id = $1", [orderId, status]);
};

exports.findReturnPolicyForProduct = async (orderId) => {
  const result = await db.query(
    "SELECT p.return_policy FROM products p JOIN order_items oi ON oi.product_id = p.id WHERE oi.order_id = $1",
    [orderId]
  );
  return result.rows;
};

exports.updateOrderReturnStatus = async (id, status, reason = "") => {
  if (status === 'requested') {
    return db.query(
      "UPDATE orders SET return_status = 'requested', return_reason = $2, return_requested_at = now(), order_status = 'Return Requested', updated_at = now() WHERE id = $1",
      [id, reason]
    );
  } else if (status === 'completed') {
    return db.query(
      "UPDATE orders SET return_status = 'completed', order_status = 'Returned', payment_status = 'refunded', updated_at = now() WHERE id = $1",
      [id]
    );
  } else if (status === 'rejected') {
    return db.query(
      "UPDATE orders SET return_status = 'rejected', order_status = 'Delivered', updated_at = now() WHERE id = $1",
      [id]
    );
  }
};

exports.findFirstAdminId = async () => {
  const result = await db.query("SELECT id FROM profiles WHERE role = 'admin' LIMIT 1");
  return result.rows[0] ? result.rows[0].id : null;
};

exports.findAllOrdersAdmin = async (limit = 20, offset = 0) => {
  const result = await db.query(
    "SELECT o.*, p.email, p.full_name FROM orders o JOIN profiles p ON o.user_id = p.id WHERE o.deleted_at IS NULL ORDER BY o.created_at DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );
  
  const countResult = await db.query(
    "SELECT COUNT(*) FROM orders WHERE deleted_at IS NULL"
  );
  
  return {
    orders: result.rows,
    total: parseInt(countResult.rows[0].count, 10)
  };
};

exports.getTotalRevenue = async () => {
  const result = await db.query(
    "SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE order_status NOT IN ('Cancelled', 'Returned') AND deleted_at IS NULL"
  );
  return parseFloat(result.rows[0].total);
};

exports.updateOrderStatusOnly = async (id, status, updatesSqlPart, params) => {
  const query = `UPDATE orders SET order_status = $2 ${updatesSqlPart}, updated_at = now() WHERE id = $1 RETURNING *`;
  const result = await db.query(query, params);
  return result.rows[0] || null;
};

exports.updateProfileStatsOnDelivery = async (userId, totalSpent) => {
  return db.query(
    "UPDATE profiles SET total_orders = total_orders + 1, total_spent = total_spent + $2, loyalty_points = loyalty_points + $3 WHERE id = $1",
    [userId, totalSpent, Math.floor(totalSpent / 10)]
  );
};

exports.findShipmentFullDetails = async (orderId) => {
  const result = await db.query("SELECT * FROM shipments WHERE order_id = $1", [orderId]);
  return result.rows[0] || null;
};

exports.findShipmentById = async (shipmentId) => {
  const result = await db.query("SELECT * FROM shipments WHERE id = $1", [shipmentId]);
  return result.rows[0] || null;
};

exports.findShipmentEvents = async (shipmentId) => {
  const result = await db.query("SELECT * FROM shipment_events WHERE shipment_id = $1 ORDER BY timestamp ASC", [shipmentId]);
  return result.rows;
};

exports.updateShipmentRaw = async (id, updatesPart, params) => {
  const query = `UPDATE shipments SET ${updatesPart}, updated_at = now() WHERE id = $1 RETURNING *`;
  const result = await db.query(query, params);
  return result.rows[0] || null;
};

exports.findShipmentByTrackingNumber = async (trackingNumber) => {
  const result = await db.query("SELECT * FROM shipments WHERE tracking_number = $1", [trackingNumber]);
  return result.rows[0] || null;
};

exports.createDeliverySlotRecord = async (orderId, slotDate, slotTime) => {
  const result = await db.query(`
    INSERT INTO delivery_slots (order_id, slot_date, slot_time, is_confirmed, created_at)
    VALUES ($1, $2, $3, true, now()) RETURNING *
  `, [orderId, slotDate, slotTime]);
  return result.rows[0];
};

exports.findDeliverySlots = async (orderId) => {
  const result = await db.query("SELECT * FROM delivery_slots WHERE order_id = $1 ORDER BY created_at ASC", [orderId]);
  return result.rows;
};
