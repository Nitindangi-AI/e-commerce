const db = require("../../config/db");

exports.findById = async (userId) => {
  const result = await db.query(
    "SELECT id, first_name, last_name, display_name, phone, date_of_birth, gender, avatar_url, role, status, loyalty_points, referral_code, notification_preferences, created_at FROM profiles WHERE id = $1",
    [userId]
  );
  return result.rows[0] || null;
};

exports.updateProfile = async (userId, updatesClause, params) => {
  const query = `UPDATE profiles SET ${updatesClause}, updated_at = now() WHERE id = $1 RETURNING id, first_name, last_name, display_name, phone, date_of_birth, gender, avatar_url, notification_preferences, updated_at`;
  const result = await db.query(query, params);
  return result.rows[0] || null;
};

exports.findPublicVendorProfile = async (vendorId) => {
  const result = await db.query(
    `SELECT
       v.id AS vendor_id,
       v.store_name,
       v.store_description,
       v.store_logo,
       v.store_email,
       v.created_at AS member_since,
       p.display_name,
       p.avatar_url
     FROM vendors v
     JOIN profiles p ON p.id = v.user_id
     WHERE v.user_id = $1 AND v.status = 'approved'`,
    [vendorId]
  );
  return result.rows[0] || null;
};
