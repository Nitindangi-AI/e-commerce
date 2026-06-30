const db = require("../../config/db");

exports.findByCode = async (code) => {
  const result = await db.query(
    "SELECT * FROM coupons WHERE code = $1",
    [code.toUpperCase()]
  );
  return result.rows[0] || null;
};

exports.findActiveByCode = async (code) => {
  const result = await db.query(
    "SELECT * FROM coupons WHERE code = $1 AND is_active = true",
    [code.toUpperCase()]
  );
  return result.rows[0] || null;
};

exports.findById = async (id) => {
  const result = await db.query(
    "SELECT * FROM coupons WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
};

exports.findUsage = async (userId, couponId) => {
  const result = await db.query(
    "SELECT * FROM coupon_usage WHERE user_id = $1 AND coupon_id = $2",
    [userId, couponId]
  );
  return result.rows[0] || null;
};

exports.findAllActive = async () => {
  const result = await db.query(
    "SELECT * FROM coupons WHERE is_active = true ORDER BY created_at DESC"
  );
  return result.rows;
};

exports.findAll = async () => {
  const result = await db.query(
    "SELECT * FROM coupons ORDER BY created_at DESC"
  );
  return result.rows;
};

exports.create = async (couponData) => {
  const query = `
    INSERT INTO coupons (
      code, discount, type, min_order, max_discount, description, is_active, expires_at, usage_limit, used_count
    ) VALUES (
      $1, $2, $3, $4, $5, $6, true, $7, $8, 0
    ) RETURNING *
  `;
  const values = [
    couponData.code.toUpperCase(),
    couponData.discount,
    couponData.type,
    couponData.minOrderValue,
    couponData.maxDiscount,
    couponData.description,
    couponData.expiresAt,
    couponData.usageLimit
  ];
  const result = await db.query(query, values);
  return result.rows[0];
};

exports.update = async (id, updates) => {
  const keys = Object.keys(updates).filter(k => k !== "id" && k !== "created_at");
  if (keys.length === 0) return null;

  // Map JS property names to DB columns if needed, or assume caller provides DB column names
  // In our case, the admin controller uses direct body fields which map to database columns.
  const setClause = keys.map((key, index) => `"${key}" = $${index + 2}`).join(", ");
  const values = keys.map(key => updates[key]);

  const result = await db.query(`UPDATE coupons SET ${setClause} WHERE id = $1 RETURNING *`, [id, ...values]);
  return result.rows[0] || null;
};

exports.delete = async (id) => {
  const result = await db.query("DELETE FROM coupons WHERE id = $1 RETURNING *", [id]);
  return result.rows[0] || null;
};

exports.incrementUsedCount = async (id) => {
  return db.query("UPDATE coupons SET used_count = used_count + 1 WHERE id = $1", [id]);
};
