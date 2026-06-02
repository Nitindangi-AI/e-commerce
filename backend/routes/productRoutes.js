const express = require("express");
const router = express.Router();
const { getProducts, getProduct, getCategories, getBrands, getRelatedProducts, createProduct, updateProduct, deleteProduct } = require("../controllers/productController");
const { getProductReviews, createReview } = require("../controllers/reviewController");
const { protect, authorize } = require("../middleware/auth");
const { validateProduct, validateReview } = require("../middleware/validate");

// Public routes
router.get("/categories", getCategories);
router.get("/brands", getBrands);
router.get("/", getProducts);
router.get("/:id", getProduct);
router.get("/:id/related", getRelatedProducts);
router.get("/:id/reviews", getProductReviews);

// Auth required
router.post("/:id/reviews", protect, validateReview, createReview);

// Admin only
router.post("/", protect, authorize("admin"), validateProduct, createProduct);
router.put("/:id", protect, authorize("admin"), updateProduct);
router.delete("/:id", protect, authorize("admin"), deleteProduct);

module.exports = router;
