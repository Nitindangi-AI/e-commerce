const asyncHandler = require("express-async-handler");
const wishlistService = require("../services/wishlistService");

exports.getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await wishlistService.getWishlist(req.user._id.toString());
  res.status(200).json({
    success: true,
    count: wishlist.length,
    wishlist,
  });
});

exports.toggleWishlist = asyncHandler(async (req, res) => {
  const result = await wishlistService.toggleWishlist(req.user._id.toString(), req.params.productId);
  res.status(200).json({
    success: true,
    action: result.action,
    message: result.message,
    wishlist: result.wishlist,
  });
});

exports.clearWishlist = asyncHandler(async (req, res) => {
  const wishlist = await wishlistService.clearWishlist(req.user._id.toString());
  res.status(200).json({
    success: true,
    message: "Wishlist cleared",
    wishlist,
  });
});
