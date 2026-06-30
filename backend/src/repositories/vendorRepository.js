const db = require("../../config/db");

exports.getDashboardStats = async (userId) => {
  const prodRes = await db.query(
    "SELECT COUNT(*) as count, COALESCE(AVG(avg_rating), 0) as avg_rating FROM products WHERE seller_id = $1 AND is_active = true AND deleted_at IS NULL",
    [userId]
  );
  
  const orderRes = await db.query(
    "SELECT COUNT(DISTINCT oi.order_id) as count FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.seller_id = $1 AND o.deleted_at IS NULL",
    [userId]
  );
  
  const revenueRes = await db.query(
    "SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as val FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.seller_id = $1 AND o.order_status = 'Delivered' AND o.deleted_at IS NULL",
    [userId]
  );
  
  const pendingRes = await db.query(
    "SELECT COUNT(DISTINCT oi.order_id) as count FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.seller_id = $1 AND o.order_status IN ('Processing', 'Confirmed', 'Shipped', 'Out for Delivery') AND o.deleted_at IS NULL",
    [userId]
  );
  
  const monthlyRes = await db.query(
    "SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as val FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.seller_id = $1 AND o.order_status = 'Delivered' AND o.created_at >= date_trunc('month', CURRENT_DATE) AND o.deleted_at IS NULL",
    [userId]
  );

  return {
    total_products: parseInt(prodRes.rows[0].count, 10),
    total_orders: parseInt(orderRes.rows[0].count, 10),
    total_revenue: parseFloat(revenueRes.rows[0].val),
    pending_orders: parseInt(pendingRes.rows[0].count, 10),
    avg_rating: parseFloat(prodRes.rows[0].avg_rating),
    this_month_revenue: parseFloat(monthlyRes.rows[0].val)
  };
};

exports.getProductsCount = async (userId) => {
  const result = await db.query(
    "SELECT COUNT(*) as count FROM products WHERE seller_id = $1 AND is_active = true AND deleted_at IS NULL",
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
};

exports.getProductsList = async (userId, limit, offset) => {
  const result = await db.query(
    "SELECT * FROM products WHERE seller_id = $1 AND is_active = true AND deleted_at IS NULL ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    [userId, parseInt(limit, 10), parseInt(offset, 10)]
  );
  return result.rows;
};

exports.getOrdersList = async (userId) => {
  const result = await db.query(
    "SELECT DISTINCT o.* FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE oi.seller_id = $1 AND o.deleted_at IS NULL ORDER BY o.created_at DESC",
    [userId]
  );
  return result.rows;
};

exports.getOrderItems = async (orderId, sellerId) => {
  const result = await db.query(
    "SELECT oi.*, p.name, p.img FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1 AND oi.seller_id = $2",
    [orderId, sellerId]
  );
  return result.rows;
};

exports.getEarningsGrouped = async (userId) => {
  const result = await db.query(`
    SELECT 
      to_char(o.created_at, 'YYYY-MM') as month,
      SUM(oi.price * oi.quantity) as gross_revenue,
      COALESCE(v.commission_percent, v.commission_rate, 10.00) as comm_percent
    FROM order_items oi 
    JOIN orders o ON oi.order_id = o.id 
    LEFT JOIN vendors v ON v.user_id = oi.seller_id
    WHERE oi.seller_id = $1 AND o.order_status = 'Delivered' AND o.deleted_at IS NULL
    GROUP BY month, comm_percent
    ORDER BY month DESC
  `, [userId]);
  return result.rows;
};

exports.updateStoreProfile = async (userId, updatesPart, params) => {
  const query = `UPDATE vendors SET ${updatesPart} WHERE user_id = $1 RETURNING *`;
  const result = await db.query(query, params);
  return result.rows[0] || null;
};

exports.findVendorProfileByUserId = async (userId) => {
  const result = await db.query("SELECT * FROM public.vendors WHERE user_id = $1", [userId]);
  return result.rows[0] || null;
};

exports.deleteAuthUser = async (userId) => {
  return db.query("DELETE FROM auth.users WHERE id = $1", [userId]);
};
