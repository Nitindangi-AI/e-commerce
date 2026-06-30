const express = require("express");
const router = express.Router();
const { getWishlist, toggleWishlist, clearWishlist } = require("../controllers/wishlistController");
const { protect } = require("../../middleware/auth");

router.get("/", protect, getWishlist);
router.post("/:productId", protect, toggleWishlist);
router.delete("/", protect, clearWishlist);

module.exports = router;
