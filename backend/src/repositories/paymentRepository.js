const db = require("../../config/db");

exports.findPaymentAccountByUserId = async (userId) => {
  const result = await db.query("SELECT payment_account FROM profiles WHERE id = $1", [userId]);
  return result.rows[0] ? result.rows[0].payment_account : null;
};

exports.updatePaymentAccount = async (userId, updatedAccount) => {
  return db.query(
    "UPDATE profiles SET payment_account = $1, updated_at = NOW() WHERE id = $2",
    [JSON.stringify(updatedAccount), userId]
  );
};

exports.updateOrderPaymentStatusByRazorpayOrderId = async (razorpayOrderId, safePaymentDetails) => {
  const result = await db.query(
    `UPDATE orders
        SET payment_status = 'paid',
            payment_details = $1::jsonb,
            updated_at = NOW()
      WHERE payment_details->>'razorpay_order_id' = $2
      RETURNING id, order_id`,
    [JSON.stringify(safePaymentDetails), razorpayOrderId]
  );
  return result.rows[0] || null;
};

exports.findOrderDetailsByRazorpayOrderId = async (razorpayOrderId) => {
  const result = await db.query(
    "SELECT id, payment_status, order_number FROM orders WHERE payment_details->>'razorpay_order_id' = $1 AND deleted_at IS NULL",
    [razorpayOrderId]
  );
  return result.rows[0] || null;
};

exports.updateOrderPaymentStatus = async (orderId, status) => {
  return db.query(
    "UPDATE orders SET payment_status = $2, updated_at = NOW() WHERE id = $1",
    [orderId, status]
  );
};

exports.findOrderItems = async (orderId) => {
  const result = await db.query("SELECT * FROM order_items WHERE order_id = $1", [orderId]);
  return result.rows;
};

exports.incrementStock = async (productId, quantity) => {
  return db.query("UPDATE products SET stock = stock + $2 WHERE id = $1", [productId, quantity]);
};

exports.createInventoryLog = async (productId, quantity, note) => {
  return db.query(
    `INSERT INTO inventory_log (product_id, change_type, quantity_change, quantity_after, note, created_at)
     VALUES ($1, 'stock_restored', $2, (SELECT stock FROM products WHERE id = $1), $3, NOW())`,
    [productId, quantity, note]
  );
};

exports.updateOrderPaymentStatusByRazorpayPaymentId = async (razorpayPaymentId) => {
  const result = await db.query(
    `UPDATE orders
        SET payment_status = 'refunded',
            updated_at = NOW()
      WHERE payment_details->>'razorpay_payment_id' = $1
      RETURNING id`,
    [razorpayPaymentId]
  );
  return result.rows[0] || null;
};

exports.beginTransaction = async () => {
  await db.query("BEGIN");
};

exports.commitTransaction = async () => {
  await db.query("COMMIT");
};

exports.rollbackTransaction = async () => {
  await db.query("ROLLBACK");
};
