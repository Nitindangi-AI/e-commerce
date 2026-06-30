const wishlistRepository = require("../repositories/wishlistRepository");

exports.getWishlist = async (userId) => {
  return wishlistRepository.findWishlistByUserId(userId);
};

exports.toggleWishlist = async (userId, productId) => {
  const existing = await wishlistRepository.findWishlistItem(userId, productId);
  let action;

  if (existing) {
    await wishlistRepository.remove(userId, productId);
    action = "removed";
  } else {
    await wishlistRepository.add(userId, productId);
    action = "added";
  }

  const updatedWishlist = await wishlistRepository.findWishlistByUserId(userId);

  return {
    action,
    message: `Product ${action} ${action === "added" ? "to" : "from"} wishlist`,
    wishlist: updatedWishlist
  };
};

exports.clearWishlist = async (userId) => {
  await wishlistRepository.clear(userId);
  return [];
};
