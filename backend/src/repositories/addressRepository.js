const db = require("../../config/db");

exports.findAllByUserId = async (userId) => {
  const result = await db.query(
    "SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC",
    [userId]
  );
  return result.rows;
};

exports.findByIdAndUserId = async (id, userId) => {
  const result = await db.query(
    "SELECT * FROM addresses WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return result.rows[0] || null;
};

exports.findDuplicate = async (userId, name, phone, line1, pincode) => {
  const result = await db.query(
    "SELECT * FROM addresses WHERE user_id = $1 AND name = $2 AND phone = $3 AND line1 = $4 AND pincode = $5",
    [userId, name, phone, line1, pincode]
  );
  return result.rows[0] || null;
};

exports.countByUserId = async (userId) => {
  const result = await db.query(
    "SELECT COUNT(*) FROM addresses WHERE user_id = $1",
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
};

exports.unsetDefaultsForUser = async (userId) => {
  return db.query(
    "UPDATE addresses SET is_default = false WHERE user_id = $1",
    [userId]
  );
};

exports.create = async (addressData) => {
  const insertQuery = `
    INSERT INTO addresses (
      user_id, label, name, phone, country, state, district, city, area, landmark, pincode, line1, is_default
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
    ) RETURNING *
  `;
  const insertValues = [
    addressData.userId,
    addressData.label,
    addressData.name,
    addressData.phone,
    addressData.country,
    addressData.state,
    addressData.district,
    addressData.city,
    addressData.area,
    addressData.landmark,
    addressData.pincode,
    addressData.line1,
    addressData.isDefault
  ];
  const result = await db.query(insertQuery, insertValues);
  return result.rows[0];
};

exports.update = async (id, userId, updates) => {
  const updateQuery = `
    UPDATE addresses SET
      label = $1,
      name = $2,
      phone = $3,
      country = $4,
      state = $5,
      district = $6,
      city = $7,
      area = $8,
      landmark = $9,
      pincode = $10,
      line1 = $11,
      is_default = $12,
      updated_at = NOW()
    WHERE id = $13 AND user_id = $14
    RETURNING *
  `;
  const result = await db.query(updateQuery, [
    updates.label,
    updates.name,
    updates.phone,
    updates.country,
    updates.state,
    updates.district,
    updates.city,
    updates.area,
    updates.landmark,
    updates.pincode,
    updates.line1,
    updates.isDefault,
    id,
    userId
  ]);
  return result.rows[0] || null;
};

exports.delete = async (id, userId) => {
  return db.query(
    "DELETE FROM addresses WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
};

exports.findLatestByUserId = async (userId) => {
  const result = await db.query(
    "SELECT * FROM addresses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
    [userId]
  );
  return result.rows[0] || null;
};

exports.setDefault = async (id, userId) => {
  return db.query(
    "UPDATE addresses SET is_default = true WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
};
