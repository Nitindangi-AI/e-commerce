const asyncHandler = require("express-async-handler");
const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");
const db = require("../config/db");

// @desc    Get reviews for a product
// @route   GET /api/v1/products/:id/reviews
// @access  Public
exports.getProductReviews = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await db.query(
    "SELECT r.*, p.full_name FROM reviews r JOIN profiles p ON r.user_id = p.id WHERE r.product_id = $1 ORDER BY r.created_at DESC",
    [id]
  );
  const reviews = result.rows.map(row => ({
    ...row,
    user: { firstName: row.full_name.split(' ')[0] || '', lastName: row.full_name.split(' ')[1] || '' }
  }));

  res.status(200).json({
    success: true,
    count: reviews.length,
    reviews,
  });
});

// @desc    Create or update review
// @route   POST /api/v1/products/:id/reviews
// @access  Private
exports.createReview = asyncHandler(async (req, res) => {
  const { rating, title, text, size_fit = '', images = [] } = req.body;
  const { id } = req.params;
  const userId = req.user._id.toString();

  const purchaseRes = await db.query(
    "SELECT 1 FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.product_id = $1 AND o.user_id = $2 AND o.order_status = 'Delivered'",
    [id, userId]
  );
  const is_verified_purchase = purchaseRes.rows.length > 0;
  if (!is_verified_purchase) {
    return res.status(403).json({
      success: false,
      message: "You can only review products you have purchased",
    });
  }

  const existing = await db.query(
    "SELECT * FROM reviews WHERE user_id = $1 AND product_id = $2",
    [userId, id]
  );

  let review;
  if (existing.rows.length > 0) {
    const updateResult = await db.query(
      "UPDATE reviews SET rating = $3, title = $4, text = $5, is_verified_purchase = $6, size_fit = $7, images = $8, updated_at = now() WHERE id = $1 RETURNING *",
      [existing.rows[0].id, id, rating, title, text, is_verified_purchase, size_fit, images]
    );
    review = updateResult.rows[0];
  } else {
    const insertResult = await db.query(
      "INSERT INTO reviews (user_id, product_id, rating, title, text, is_verified_purchase, size_fit, images, helpful_count, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 'published', now(), now()) RETURNING *",
      [userId, id, rating, title, text, is_verified_purchase, size_fit, images]
    );
    review = insertResult.rows[0];
  }

  // Recalculate
  const statsResult = await db.query(
    "SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE product_id = $1",
    [id]
  );
  const avgRating = parseFloat(statsResult.rows[0].avg_rating || 0);
  const totalReviews = parseInt(statsResult.rows[0].total_reviews || 0);
  await db.query(
    "UPDATE products SET avg_rating = $2, total_reviews = $3 WHERE id = $1",
    [id, avgRating, totalReviews]
  );

  try {
    const existingMongo = await Review.findOne({ user: req.user._id, product: id });
    if (existingMongo) {
      existingMongo.rating = rating;
      existingMongo.title = title;
      existingMongo.text = text;
      existingMongo.verified = is_verified_purchase;
      await existingMongo.save();
    } else {
      await Review.create({
        user: req.user._id,
        product: id,
        rating,
        title,
        text,
        verified: is_verified_purchase,
      });
    }
  } catch (err) {}

  res.status(201).json({
    success: true,
    message: "Review added successfully",
    review,
  });
});

// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id
// @access  Private
exports.deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const reviewRes = await db.query("SELECT * FROM reviews WHERE id = $1", [id]);
  if (reviewRes.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Review not found",
    });
  }
  const review = reviewRes.rows[0];

  if (
    review.user_id.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this review",
    });
  }

  await db.query("DELETE FROM reviews WHERE id = $1", [id]);

  const statsResult = await db.query(
    "SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE product_id = $1",
    [review.product_id]
  );
  const avgRating = parseFloat(statsResult.rows[0].avg_rating || 0);
  const totalReviews = parseInt(statsResult.rows[0].total_reviews || 0);
  await db.query(
    "UPDATE products SET avg_rating = $2, total_reviews = $3 WHERE id = $1",
    [review.product_id, avgRating, totalReviews]
  );

  try {
    await Review.findByIdAndDelete(id);
  } catch (err) {}

  res.status(200).json({
    success: true,
    message: "Review deleted successfully",
  });
});

// @desc    Mark review as helpful
// @route   PUT /api/v1/reviews/:id/helpful
// @access  Private
exports.markHelpful = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id.toString();
  const result = await db.query(
    "INSERT INTO review_helpful (user_id, review_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *",
    [userId, id]
  );
  if (result.rows.length > 0) {
    await db.query("UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = $1", [id]);
  }
  res.status(200).json({
    success: true,
    message: "Marked helpful successfully",
  });
});

// @desc    Admin reply to review
// @route   POST /api/v1/reviews/:id/reply
// @access  Private/Admin
exports.adminReply = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin role required" });
  }
  const result = await db.query(
    "UPDATE reviews SET admin_reply = $2, admin_reply_at = now() WHERE id = $1 RETURNING *",
    [id, reply]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Review not found",
    });
  }
  res.status(200).json({
    success: true,
    review: result.rows[0],
  });
});

// @desc    Get review summary (breakdown, rating)
// @route   GET /api/v1/products/:id/reviews/summary
// @access  Public
exports.getReviewSummary = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const statsResult = await db.query(
    "SELECT AVG(rating) as avg_rating, COUNT(*) as total_count FROM reviews WHERE product_id = $1",
    [id]
  );
  const avg_rating = parseFloat(statsResult.rows[0].avg_rating || 0);
  const total = parseInt(statsResult.rows[0].total_count || 0);

  const breakdownResult = await db.query(
    "SELECT rating, COUNT(*) as count FROM reviews WHERE product_id = $1 GROUP BY rating",
    [id]
  );
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  breakdownResult.rows.forEach(row => {
    breakdown[row.rating] = parseInt(row.count);
  });

  const verifiedResult = await db.query(
    "SELECT COUNT(*) as count FROM reviews WHERE product_id = $1 AND is_verified_purchase = true",
    [id]
  );
  const verifiedCount = parseInt(verifiedResult.rows[0].count || 0);
  const verified_percent = total > 0 ? Math.round((verifiedCount / total) * 100) : 0;

  res.status(200).json({
    success: true,
    summary: {
      avg_rating,
      total,
      breakdown,
      verified_percent
    }
  });
});
