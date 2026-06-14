const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProduct,
  getCategories,
  getBrands,
  getRelatedProducts,
  getProductBySlug,
  recordView,
  searchProducts,
  getTopSelling,
  getFeatured,
  createProduct,
  updateProduct,
  deleteProduct
} = require("../controllers/productController");
const { getProductReviews, createReview, getReviewSummary, markHelpful, adminReply } = require("../controllers/reviewController");
const { protect, authorize } = require("../middleware/auth");
const { validateProduct, validateReview } = require("../middleware/validate");

// Public routes (placed specifically to avoid wildcard conflicts)
router.get("/categories", getCategories);
router.get("/brands", getBrands);
router.get("/search", searchProducts);
router.get("/featured", getFeatured);
router.get("/top-selling", getTopSelling);
router.get("/slug/:slug", getProductBySlug);
router.get("/:id/reviews/summary", getReviewSummary);

router.get("/", getProducts);
router.get("/:id", getProduct);
router.get("/:id/related", getRelatedProducts);
router.get("/:id/reviews", getProductReviews);

// Record view (no auth required)
router.post("/:id/view", recordView);

// Auth required reviews
router.post("/:id/reviews", protect, validateReview, createReview);
router.put("/reviews/:id/helpful", protect, markHelpful);
router.post("/reviews/:id/reply", protect, authorize("admin"), adminReply);

// Admin and Vendor products
router.post("/", protect, authorize("admin", "vendor"), validateProduct, createProduct);
router.put("/:id", protect, authorize("admin", "vendor"), updateProduct);
router.delete("/:id", protect, authorize("admin", "vendor"), deleteProduct);

module.exports = router;
