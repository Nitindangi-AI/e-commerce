const asyncHandler = require("express-async-handler");
const db = require("../config/db");

// @desc    Get Vendor Dashboard Stats
// @route   GET /api/v1/vendor/stats
// @access  Private/Vendor
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();

  const prodRes = await db.query(
    "SELECT COUNT(*) as count, COALESCE(AVG(avg_rating), 0) as avg_rating FROM products WHERE seller_id = $1 AND is_active = true",
    [userId]
  );
  
  const orderRes = await db.query(
    "SELECT COUNT(DISTINCT oi.order_id) as count FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.seller_id = $1",
    [userId]
  );
  
  const revenueRes = await db.query(
    "SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as val FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.seller_id = $1 AND o.order_status = 'Delivered'",
    [userId]
  );
  
  const pendingRes = await db.query(
    "SELECT COUNT(DISTINCT oi.order_id) as count FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.seller_id = $1 AND o.order_status IN ('Processing', 'Confirmed', 'Shipped', 'Out for Delivery')",
    [userId]
  );
  
  const monthlyRes = await db.query(
    "SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as val FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.seller_id = $1 AND o.order_status = 'Delivered' AND o.created_at >= date_trunc('month', CURRENT_DATE)",
    [userId]
  );

  res.status(200).json({
    success: true,
    stats: {
      total_products: parseInt(prodRes.rows[0].count),
      total_orders: parseInt(orderRes.rows[0].count),
      total_revenue: parseFloat(revenueRes.rows[0].val),
      pending_orders: parseInt(pendingRes.rows[0].count),
      avg_rating: parseFloat(prodRes.rows[0].avg_rating),
      this_month_revenue: parseFloat(monthlyRes.rows[0].val)
    }
  });
});

// @desc    Get Vendor Products with Pagination
// @route   GET /api/v1/vendor/products
// @access  Private/Vendor
exports.getVendorProducts = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const { page = 1, limit = 24 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const countRes = await db.query(
    "SELECT COUNT(*) as count FROM products WHERE seller_id = $1 AND is_active = true",
    [userId]
  );
  const total = parseInt(countRes.rows[0].count);

  const result = await db.query(
    "SELECT * FROM products WHERE seller_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    [userId, parseInt(limit), offset]
  );

  res.status(200).json({
    success: true,
    count: result.rows.length,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
    products: result.rows
  });
});

// @desc    Get Vendor Orders
// @route   GET /api/v1/vendor/orders
// @access  Private/Vendor
exports.getVendorOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();

  const result = await db.query(
    "SELECT DISTINCT o.* FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE oi.seller_id = $1 ORDER BY o.created_at DESC",
    [userId]
  );

  const orders = [];
  for (const order of result.rows) {
    const itemsRes = await db.query(
      "SELECT oi.*, p.name, p.img FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1 AND oi.seller_id = $2",
      [order.id, userId]
    );
    orders.push({
      ...order,
      orderItems: itemsRes.rows
    });
  }

  res.status(200).json({
    success: true,
    count: orders.length,
    orders
  });
});

// @desc    Get Earnings grouped by month
// @route   GET /api/v1/vendor/earnings
// @access  Private/Vendor
exports.getEarnings = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();

  const result = await db.query(`
    SELECT 
      to_char(o.created_at, 'YYYY-MM') as month,
      SUM(oi.price * oi.quantity) as gross_revenue,
      COALESCE(v.commission_percent, v.commission_rate, 10.00) as comm_percent
    FROM order_items oi 
    JOIN orders o ON oi.order_id = o.id 
    LEFT JOIN vendors v ON v.user_id = oi.seller_id
    WHERE oi.seller_id = $1 AND o.order_status = 'Delivered'
    GROUP BY month, comm_percent
    ORDER BY month DESC
  `, [userId]);

  const earnings = result.rows.map(row => {
    const gross = parseFloat(row.gross_revenue);
    const rate = parseFloat(row.comm_percent);
    const commission = (gross * rate) / 100;
    const net = gross - commission;
    return {
      month: row.month,
      grossRevenue: gross,
      commission,
      netRevenue: net,
      commissionRate: rate
    };
  });

  res.status(200).json({
    success: true,
    earnings
  });
});

// @desc    Update Store Profile
// @route   PATCH /api/v1/vendor/store
// @access  Private/Vendor
exports.updateStoreProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const { store_name, store_description, store_logo, store_email, store_phone } = req.body;

  const updates = [];
  const params = [userId];
  let paramIndex = 2;

  if (store_name !== undefined) {
    updates.push(`store_name = $${paramIndex}`);
    params.push(store_name);
    paramIndex++;
  }
  if (store_description !== undefined) {
    updates.push(`store_description = $${paramIndex}`);
    params.push(store_description);
    paramIndex++;
  }
  if (store_logo !== undefined) {
    updates.push(`store_logo = $${paramIndex}`);
    params.push(store_logo);
    paramIndex++;
  }
  if (store_email !== undefined) {
    updates.push(`store_email = $${paramIndex}`);
    params.push(store_email);
    paramIndex++;
  }
  if (store_phone !== undefined) {
    updates.push(`store_phone = $${paramIndex}`);
    params.push(store_phone);
    paramIndex++;
  }

  if (updates.length === 0) {
    return res.status(400).json({ success: false, message: "No update fields provided" });
  }

  updates.push(`updated_at = now()`);
  const query = `UPDATE vendors SET ${updates.join(", ")} WHERE user_id = $1 RETURNING *`;
  
  const result = await db.query(query, params);

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: "Vendor profile not found" });
  }

  res.status(200).json({
    success: true,
    message: "Store profile updated successfully",
    vendor: result.rows[0]
  });
});
