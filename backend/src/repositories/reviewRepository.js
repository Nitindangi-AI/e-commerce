const db = require("../../config/db");

exports.findReviewsByProductId = async (productId, limit = 20, offset = 0) => {
  const result = await db.query(
    "SELECT r.*, p.full_name FROM reviews r JOIN profiles p ON r.user_id = p.id WHERE r.product_id = $1 ORDER BY r.created_at DESC LIMIT $2 OFFSET $3",
    [productId, limit, offset]
  );
  
  const countResult = await db.query(
    "SELECT COUNT(*) FROM reviews WHERE product_id = $1",
    [productId]
  );

  return {
    reviews: result.rows,
    total: parseInt(countResult.rows[0].count, 10)
  };
};

exports.checkPurchase = async (productId, userId) => {
  const result = await db.query(
    "SELECT 1 FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.product_id = $1 AND o.user_id = $2 AND o.order_status = 'Delivered' AND o.deleted_at IS NULL",
    [productId, userId]
  );
  return result.rows.length > 0;
};

exports.findByUserAndProduct = async (userId, productId) => {
  const result = await db.query(
    "SELECT * FROM reviews WHERE user_id = $1 AND product_id = $2",
    [userId, productId]
  );
  return result.rows[0] || null;
};

exports.updateReview = async (reviewId, rating, title, text, isVerified, sizeFit, images) => {
  const result = await db.query(
    "UPDATE reviews SET rating = $2, title = $3, text = $4, is_verified_purchase = $5, size_fit = $6, images = $7, updated_at = now() WHERE id = $1 RETURNING *",
    [reviewId, rating, title, text, isVerified, sizeFit, images]
  );
  return result.rows[0] || null;
};

exports.createReview = async (userId, productId, rating, title, text, isVerified, sizeFit, images) => {
  const result = await db.query(
    "INSERT INTO reviews (user_id, product_id, rating, title, text, is_verified_purchase, size_fit, images, helpful_count, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 'published', now(), now()) RETURNING *",
    [userId, productId, rating, title, text, isVerified, sizeFit, images]
  );
  return result.rows[0];
};

exports.getProductReviewStats = async (productId) => {
  const result = await db.query(
    "SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE product_id = $1",
    [productId]
  );
  return result.rows[0];
};

exports.updateProductRating = async (productId, avgRating, totalReviews) => {
  return db.query(
    "UPDATE products SET avg_rating = $2, total_reviews = $3 WHERE id = $1 AND deleted_at IS NULL",
    [productId, avgRating, totalReviews]
  );
};

exports.findById = async (id) => {
  const result = await db.query("SELECT * FROM reviews WHERE id = $1", [id]);
  return result.rows[0] || null;
};

exports.deleteReview = async (id) => {
  return db.query("DELETE FROM reviews WHERE id = $1", [id]);
};

exports.markHelpful = async (userId, reviewId) => {
  const result = await db.query(
    "INSERT INTO review_helpful (user_id, review_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *",
    [userId, reviewId]
  );
  if (result.rows.length > 0) {
    await db.query("UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = $1", [reviewId]);
    return true;
  }
  return false;
};

exports.adminReply = async (id, reply) => {
  const result = await db.query(
    "UPDATE reviews SET admin_reply = $2, admin_reply_at = now() WHERE id = $1 RETURNING *",
    [id, reply]
  );
  return result.rows[0] || null;
};

exports.getReviewBreakdown = async (productId) => {
  const result = await db.query(
    "SELECT rating, COUNT(*) as count FROM reviews WHERE product_id = $1 GROUP BY rating",
    [productId]
  );
  return result.rows;
};

exports.getVerifiedCount = async (productId) => {
  const result = await db.query(
    "SELECT COUNT(*) as count FROM reviews WHERE product_id = $1 AND is_verified_purchase = true",
    [productId]
  );
  return parseInt(result.rows[0].count || 0, 10);
};
