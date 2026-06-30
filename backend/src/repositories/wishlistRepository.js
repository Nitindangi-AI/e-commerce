const db = require("../../config/db");

exports.findWishlistByUserId = async (userId) => {
  const result = await db.query(
    "SELECT p.* FROM wishlist w JOIN products p ON w.product_id = p.id WHERE w.user_id = $1 AND p.deleted_at IS NULL",
    [userId]
  );
  return result.rows;
};

exports.findWishlistItem = async (userId, productId) => {
  const result = await db.query(
    "SELECT * FROM wishlist WHERE user_id = $1 AND product_id = $2",
    [userId, productId]
  );
  return result.rows[0] || null;
};

exports.remove = async (userId, productId) => {
  return db.query(
    "DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2",
    [userId, productId]
  );
};

exports.add = async (userId, productId) => {
  return db.query(
    "INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2)",
    [userId, productId]
  );
};

exports.clear = async (userId) => {
  return db.query(
    "DELETE FROM wishlist WHERE user_id = $1",
    [userId]
  );
};
