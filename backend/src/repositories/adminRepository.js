const db = require("../../config/db");

exports.getGmvToday = async () => {
  const result = await db.query(
    "SELECT COALESCE(SUM(total_amount), 0) as val FROM orders WHERE created_at >= CURRENT_DATE AND order_status != 'Cancelled' AND deleted_at IS NULL"
  );
  return parseFloat(result.rows[0].val);
};

exports.getGmvMonth = async () => {
  const result = await db.query(
    "SELECT COALESCE(SUM(total_amount), 0) as val FROM orders WHERE created_at >= date_trunc('month', CURRENT_DATE) AND order_status != 'Cancelled' AND deleted_at IS NULL"
  );
  return parseFloat(result.rows[0].val);
};

exports.getOrdersTodayCount = async () => {
  const result = await db.query(
    "SELECT COUNT(*) as count FROM orders WHERE created_at >= CURRENT_DATE AND deleted_at IS NULL"
  );
  return parseInt(result.rows[0].count, 10);
};

exports.getOrdersPendingCount = async () => {
  const result = await db.query(
    "SELECT COUNT(*) as count FROM orders WHERE order_status IN ('Processing', 'Confirmed', 'Shipped', 'Out for Delivery') AND deleted_at IS NULL"
  );
  return parseInt(result.rows[0].count, 10);
};

exports.getNewUsersCount = async () => {
  const result = await db.query(
    "SELECT COUNT(*) as count FROM profiles WHERE created_at >= CURRENT_DATE"
  );
  return parseInt(result.rows[0].count, 10);
};

exports.getUsersList = async (limit = 20, offset = 0) => {
  const result = await db.query(
    "SELECT * FROM profiles ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );
  
  const countResult = await db.query("SELECT COUNT(*) FROM profiles");
  
  return {
    users: result.rows,
    total: parseInt(countResult.rows[0].count, 10)
  };
};

exports.getVendorsCountByStatus = async (status) => {
  const result = await db.query(
    "SELECT COUNT(*) as count FROM vendors WHERE status = $1",
    [status]
  );
  return parseInt(result.rows[0].count, 10);
};

exports.getLowStockCount = async () => {
  const result = await db.query(
    "SELECT COUNT(*) as count FROM products WHERE stock_status IN ('low_stock','out_of_stock') AND is_active = true AND deleted_at IS NULL"
  );
  return parseInt(result.rows[0].count, 10);
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

exports.updateVendorStatus = async (id, status, approvedBy = null) => {
  let query, params;
  if (status === 'approved') {
    query = "UPDATE vendors SET status = 'approved', approved_at = now(), approved_by = $2 WHERE id = $1 RETURNING *";
    params = [id, approvedBy];
  } else if (status === 'rejected') {
    query = "UPDATE vendors SET status = 'rejected', rejection_reason = $2 WHERE id = $1 RETURNING *";
    params = [id, approvedBy]; // approvedBy holds rejection reason here
  } else if (status === 'suspended') {
    query = "UPDATE vendors SET status = 'suspended', rejection_reason = $2, updated_at = now() WHERE id = $1 RETURNING *";
    params = [id, approvedBy]; // approvedBy holds suspension reason here
  } else {
    throw new Error("Invalid vendor status change");
  }
  const result = await db.query(query, params);
  return result.rows[0] || null;
};

exports.findProfileById = async (id) => {
  const result = await db.query("SELECT * FROM profiles WHERE id = $1", [id]);
  return result.rows[0] || null;
};

exports.findAuthUserById = async (id) => {
  const result = await db.query("SELECT email, COALESCE(profile, metadata, '{}'::jsonb) AS user_meta FROM auth.users WHERE id = $1", [id]);
  return result.rows[0] || null;
};

exports.createProfile = async (profileData) => {
  const query = `
    INSERT INTO public.profiles (id, email, phone, full_name, first_name, last_name, role, referral_code)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const result = await db.query(query, [
    profileData.id,
    profileData.email,
    profileData.phone,
    profileData.fullName,
    profileData.firstName,
    profileData.lastName,
    profileData.role,
    profileData.referralCode
  ]);
  return result.rows[0];
};

exports.updateProfileRole = async (id, role) => {
  return db.query("UPDATE profiles SET role = $2 WHERE id = $1", [id, role]);
};

exports.createNotification = async (userId, type, title, message) => {
  return db.query(
    "INSERT INTO user_notifications (user_id, type, title, message, created_at) VALUES ($1, $2, $3, $4, now())",
    [userId, type, title, message]
  );
};

exports.getVendorsList = async (status, limit, offset) => {
  let query = `
    SELECT v.*, p.email, p.full_name, p.phone AS owner_phone
    FROM vendors v
    JOIN profiles p ON p.id = v.user_id
  `;
  const params = [];
  let paramCount = 1;

  if (status) {
    query += ` WHERE v.status = $${paramCount}`;
    params.push(status);
    paramCount++;
  }

  // Count
  const countBase = query.replace(
    'v.*, p.email, p.full_name, p.phone AS owner_phone',
    'COUNT(*) AS count'
  );
  const countRes = await db.query(countBase, params);
  const total = parseInt(countRes.rows[0].count, 10);

  query += ` ORDER BY v.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const result = await db.query(query, params);
  return { vendors: result.rows, total };
};

exports.banUserProfile = async (id) => {
  const result = await db.query("UPDATE profiles SET status = 'banned' WHERE id = $1 RETURNING *", [id]);
  return result.rows[0] || null;
};

exports.getInventoryAlerts = async () => {
  const result = await db.query(
    "SELECT * FROM products WHERE stock_status IN ('low_stock','out_of_stock') AND is_active = true AND deleted_at IS NULL ORDER BY stock ASC"
  );
  return result.rows;
};

exports.getAllOrders = async (filters, limit, offset) => {
  const { status, start_date, end_date, vendor_id } = filters;
  let queryText = "SELECT DISTINCT o.*, p.email, p.full_name FROM orders o JOIN profiles p ON o.user_id = p.id";
  const params = [];
  let paramCount = 1;

  const whereClauses = ["o.deleted_at IS NULL"];

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
  const total = parseInt(countRes.rows[0].count, 10);

  queryText += ` ORDER BY o.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount+1}`;
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const result = await db.query(queryText, params);
  return { orders: result.rows, total };
};
