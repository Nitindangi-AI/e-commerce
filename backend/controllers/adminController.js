const asyncHandler = require("express-async-handler");
const db = require("../config/db");

// @desc    Get Admin Dashboard Stats
// @route   GET /api/v1/admin/stats
// @access  Private/Admin
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const gmvTodayRes = await db.query("SELECT COALESCE(SUM(total_amount), 0) as val FROM orders WHERE created_at >= CURRENT_DATE AND order_status != 'Cancelled'");
  const gmvMonthRes = await db.query("SELECT COALESCE(SUM(total_amount), 0) as val FROM orders WHERE created_at >= date_trunc('month', CURRENT_DATE) AND order_status != 'Cancelled'");
  const ordersTodayRes = await db.query("SELECT COUNT(*) as count FROM orders WHERE created_at >= CURRENT_DATE");
  const ordersPendingRes = await db.query("SELECT COUNT(*) as count FROM orders WHERE order_status IN ('Processing', 'Confirmed', 'Shipped', 'Out for Delivery')");
  const newUsersRes = await db.query("SELECT COUNT(*) as count FROM profiles WHERE created_at >= CURRENT_DATE");
  const activeVendorsRes = await db.query("SELECT COUNT(*) as count FROM vendors WHERE status = 'approved'");
  const pendingVendorsRes = await db.query("SELECT COUNT(*) as count FROM vendors WHERE status = 'pending'");
  const lowStockRes = await db.query("SELECT COUNT(*) as count FROM products WHERE stock_status IN ('low_stock','out_of_stock') AND is_active = true");

  res.status(200).json({
    success: true,
    stats: {
      gmv_today: parseFloat(gmvTodayRes.rows[0].val),
      gmv_month: parseFloat(gmvMonthRes.rows[0].val),
      orders_today: parseInt(ordersTodayRes.rows[0].count),
      orders_pending: parseInt(ordersPendingRes.rows[0].count),
      new_users_today: parseInt(newUsersRes.rows[0].count),
      active_vendors: parseInt(activeVendorsRes.rows[0].count),
      pending_vendor_approvals: parseInt(pendingVendorsRes.rows[0].count),
      low_stock_count: parseInt(lowStockRes.rows[0].count)
    }
  });
});

// @desc    Approve a vendor
// @route   PATCH /api/v1/admin/vendors/:id/approve
// @access  Private/Admin
exports.approveVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Begin PostgreSQL Transaction
  await db.query("BEGIN");

  try {
    const result = await db.query(
      "UPDATE vendors SET status = 'approved', approved_at = now(), approved_by = $2 WHERE id = $1 RETURNING *",
      [id, req.user._id.toString()]
    );

    if (result.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const userId = result.rows[0].user_id;

    // Ensure SQL profile row exists and set role to 'vendor'
    const profileRes = await db.query("SELECT * FROM profiles WHERE id = $1", [userId]);
    if (profileRes.rows.length === 0) {
      const crypto = require("crypto");
      // Fetch details from auth.users if available
      const authUserRes = await db.query("SELECT email, COALESCE(profile, metadata, '{}'::jsonb) AS user_meta FROM auth.users WHERE id = $1", [userId]);
      let emailVal = "";
      let phoneVal = "";
      let fullName = "";
      let firstName = "";
      let lastName = "";
      
      if (authUserRes.rows.length > 0) {
        const authUser = authUserRes.rows[0];
        emailVal = authUser.email || "";
        const meta = authUser.user_meta || {};
        phoneVal = meta.phone || "";
        fullName = meta.full_name || meta.name || "";
        firstName = meta.first_name || "";
        lastName = meta.last_name || "";
      }
      
      const referralCode = `TRENDY-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      await db.query(
        `INSERT INTO public.profiles (id, email, phone, full_name, first_name, last_name, role, referral_code)
         VALUES ($1, $2, $3, $4, $5, $6, 'vendor', $7)`,
        [userId, emailVal, phoneVal, fullName, firstName, lastName, referralCode]
      );
    } else {
      await db.query("UPDATE profiles SET role = 'vendor' WHERE id = $1", [userId]);
    }

    // Sync MongoDB User role - Using raw MongoDB collection to support UUID string _id without Mongoose CastError
    const User = require("../models/User");
    let mongoUser = await User.collection.findOne({ _id: userId });
    if (!mongoUser) {
      const crypto = require("crypto");
      const bcrypt = require("bcryptjs");
      // Fetch details from auth.users if available
      const authUserRes = await db.query("SELECT email, COALESCE(profile, metadata, '{}'::jsonb) AS user_meta FROM auth.users WHERE id = $1", [userId]);
      let emailVal = `${userId}@trendy.com`;
      let phoneVal = "";
      let fullName = "Vendor User";
      let passwordVal = "temporaryPassword123";
      
      if (authUserRes.rows.length > 0) {
        const authUser = authUserRes.rows[0];
        emailVal = authUser.email || emailVal;
        const meta = authUser.user_meta || {};
        phoneVal = meta.phone || "";
        fullName = meta.full_name || meta.name || fullName;
      }
      
      const names = fullName.trim().split(/\s+/);
      const firstName = names[0] || "Vendor";
      const lastName = names.slice(1).join(" ") || "User";
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(passwordVal, salt);

      await User.collection.insertOne({
        _id: userId,
        firstName,
        lastName,
        email: emailVal,
        phone: phoneVal,
        password: hashedPassword,
        role: "vendor",
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      await User.collection.updateOne(
        { _id: userId },
        { $set: { role: "vendor", updatedAt: new Date() } }
      );
    }

    await db.query(
      "INSERT INTO user_notifications (user_id, type, title, message, created_at) VALUES ($1, 'system', 'Vendor Approved', 'Your vendor account has been approved!', now())",
      [userId]
    );

    // Commit Transaction
    await db.query("COMMIT");

    res.status(200).json({ success: true, message: "Vendor approved successfully", vendor: result.rows[0] });

  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Error during vendor approval:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to approve vendor" });
  }
});

// @desc    Reject a vendor
// @route   PATCH /api/v1/admin/vendors/:id/reject
// @access  Private/Admin
exports.rejectVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason = "Registration criteria not met" } = req.body;

  // Begin PostgreSQL Transaction
  await db.query("BEGIN");

  try {
    const result = await db.query(
      "UPDATE vendors SET status = 'rejected', rejection_reason = $2 WHERE id = $1 RETURNING *",
      [id, reason]
    );

    if (result.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const userId = result.rows[0].user_id;

    // Reset SQL profile role to 'customer'
    await db.query("UPDATE profiles SET role = 'customer' WHERE id = $1", [userId]);

    // Sync MongoDB User role - Using raw MongoDB collection to support UUID string _id without Mongoose CastError
    const User = require("../models/User");
    await User.collection.updateOne(
      { _id: userId },
      { $set: { role: "customer", updatedAt: new Date() } }
    );

    await db.query(
      "INSERT INTO user_notifications (user_id, type, title, message, created_at) VALUES ($1, 'system', 'Vendor Rejected', $2, now())",
      [userId, `Your vendor registration request was rejected. Reason: ${reason}`]
    );

    // Commit Transaction
    await db.query("COMMIT");

    res.status(200).json({ success: true, message: "Vendor rejected successfully", vendor: result.rows[0] });

  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Error during vendor rejection:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to reject vendor" });
  }
});

// @desc    Ban a user
// @route   PATCH /api/v1/admin/users/:id/ban
// @access  Private/Admin
exports.banUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await db.query("UPDATE profiles SET status = 'banned' WHERE id = $1 RETURNING *", [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: "User profile not found" });
  }

  res.status(200).json({ success: true, message: "User banned successfully", profile: result.rows[0] });
});

// @desc    Get Inventory Alerts
// @route   GET /api/v1/admin/inventory-alerts
// @access  Private/Admin
exports.getInventoryAlerts = asyncHandler(async (req, res) => {
  const result = await db.query(
    "SELECT * FROM products WHERE stock_status IN ('low_stock','out_of_stock') AND is_active = true ORDER BY stock ASC"
  );
  res.status(200).json({ success: true, products: result.rows });
});

// @desc    Get all orders with filters + pagination
// @route   GET /api/v1/admin/orders
// @access  Private/Admin
exports.getAllOrders = asyncHandler(async (req, res) => {
  const { status, start_date, end_date, vendor_id, page = 1, limit = 24 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let queryText = "SELECT DISTINCT o.*, p.email, p.full_name FROM orders o JOIN profiles p ON o.user_id = p.id";
  const params = [];
  let paramCount = 1;

  const whereClauses = [];

  if (status) {
    whereClauses.push(`o.order_status = $${paramCount}`);
    params.push(status);
    paramCount++;
  }
  if (start_date && end_date) {
    whereClauses.push(`o.created_at BETWEEN $${paramCount} AND $${paramCount+1}`);
    params.push(start_date, end_date);
    paramCount += 2;
  }
  if (vendor_id) {
    queryText += " JOIN order_items oi ON oi.order_id = o.id";
    whereClauses.push(`oi.seller_id = $${paramCount}`);
    params.push(vendor_id);
    paramCount++;
  }

  if (whereClauses.length > 0) {
    queryText += " WHERE " + whereClauses.join(" AND ");
  }

  const countRes = await db.query(queryText.replace("DISTINCT o.*, p.email, p.full_name", "COUNT(DISTINCT o.id)"), params);
  const total = parseInt(countRes.rows[0].count);

  queryText += ` ORDER BY o.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount+1}`;
  params.push(parseInt(limit), offset);

  const result = await db.query(queryText, params);
  const orders = result.rows.map(row => ({
    ...row,
    user: { email: row.email, firstName: row.full_name.split(' ')[0] || '', lastName: row.full_name.split(' ')[1] || '' }
  }));

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
    orders
  });
});

// @desc    Manage Coupons (Full CRUD)
// @route   /api/v1/admin/coupons
// @access  Private/Admin
exports.createCoupon = asyncHandler(async (req, res) => {
  const { code, discount, type, min_order_value, max_discount, description, expires_at, usage_limit } = req.body;
  const result = await db.query(
    "INSERT INTO coupons (code, discount, type, min_order_value, max_discount, description, is_active, expires_at, usage_limit, used_count) VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, 0) RETURNING *",
    [code.toUpperCase(), discount, type || 'percent', min_order_value || 0, max_discount || 0, description, expires_at, usage_limit || 100]
  );
  res.status(201).json({ success: true, coupon: result.rows[0] });
});

exports.getCoupons = asyncHandler(async (req, res) => {
  const result = await db.query("SELECT * FROM coupons ORDER BY created_at DESC");
  res.status(200).json({ success: true, coupons: result.rows });
});

exports.updateCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const keys = Object.keys(updates).filter(k => k !== "id" && k !== "created_at");
  if (keys.length === 0) {
    return res.status(400).json({ success: false, message: "No update fields provided" });
  }
  const setClause = keys.map((key, index) => `"${key}" = $${index + 2}`).join(", ");
  const values = keys.map(key => updates[key]);
  const result = await db.query(`UPDATE coupons SET ${setClause} WHERE id = $1 RETURNING *`, [id, ...values]);
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: "Coupon not found" });
  }
  res.status(200).json({ success: true, coupon: result.rows[0] });
});

exports.deleteCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await db.query("DELETE FROM coupons WHERE id = $1 RETURNING *", [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: "Coupon not found" });
  }
  res.status(200).json({ success: true, message: "Coupon deleted successfully" });
});
