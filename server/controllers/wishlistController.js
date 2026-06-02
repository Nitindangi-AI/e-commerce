const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// @desc    Get user wishlist
// @route   GET /api/v1/wishlist
// @access  Private
exports.getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("wishlist");

  res.status(200).json({
    success: true,
    count: user.wishlist.length,
    wishlist: user.wishlist,
  });
});

// @desc    Toggle product in wishlist
// @route   POST /api/v1/wishlist/:productId
// @access  Private
exports.toggleWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const productId = req.params.productId;

  const index = user.wishlist.indexOf(productId);

  let action;
  if (index > -1) {
    // Remove from wishlist
    user.wishlist.splice(index, 1);
    action = "removed";
  } else {
    // Add to wishlist
    user.wishlist.push(productId);
    action = "added";
  }

  await user.save();

  const updatedUser = await User.findById(req.user._id).populate("wishlist");

  res.status(200).json({
    success: true,
    action,
    message: `Product ${action} ${action === "added" ? "to" : "from"} wishlist`,
    wishlist: updatedUser.wishlist,
  });
});

// @desc    Clear entire wishlist
// @route   DELETE /api/v1/wishlist
// @access  Private
exports.clearWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.wishlist = [];
  await user.save();

  res.status(200).json({
    success: true,
    message: "Wishlist cleared",
    wishlist: [],
  });
});
