const asyncHandler = require("express-async-handler");
const db = require("../config/db");

// @desc    Get user wishlist
// @route   GET /api/v1/wishlist
// @access  Private
exports.getWishlist = asyncHandler(async (req, res) => {
  const result = await db.query(
    "SELECT p.* FROM wishlist w JOIN products p ON w.product_id = p.id WHERE w.user_id = $1",
    [req.user._id.toString()]
  );

  res.status(200).json({
    success: true,
    count: result.rows.length,
    wishlist: result.rows,
  });
});

// @desc    Toggle product in wishlist
// @route   POST /api/v1/wishlist/:productId
// @access  Private
exports.toggleWishlist = asyncHandler(async (req, res) => {
  const productId = req.params.productId;
  const userId = req.user._id.toString();

  const existing = await db.query(
    "SELECT * FROM wishlist WHERE user_id = $1 AND product_id = $2",
    [userId, productId]
  );

  let action;
  if (existing.rows.length > 0) {
    // Remove from wishlist
    await db.query(
      "DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2",
      [userId, productId]
    );
    action = "removed";
  } else {
    // Add to wishlist
    await db.query(
      "INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2)",
      [userId, productId]
    );
    action = "added";
  }

  const updatedResult = await db.query(
    "SELECT p.* FROM wishlist w JOIN products p ON w.product_id = p.id WHERE w.user_id = $1",
    [userId]
  );

  res.status(200).json({
    success: true,
    action,
    message: `Product ${action} ${action === "added" ? "to" : "from"} wishlist`,
    wishlist: updatedResult.rows,
  });
});

// @desc    Clear entire wishlist
// @route   DELETE /api/v1/wishlist
// @access  Private
exports.clearWishlist = asyncHandler(async (req, res) => {
  await db.query(
    "DELETE FROM wishlist WHERE user_id = $1",
    [req.user._id.toString()]
  );

  res.status(200).json({
    success: true,
    message: "Wishlist cleared",
    wishlist: [],
  });
});

