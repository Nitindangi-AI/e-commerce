const asyncHandler = require("express-async-handler");
const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");

// @desc    Get reviews for a product
// @route   GET /api/v1/products/:id/reviews
// @access  Public
exports.getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.id })
    .populate("user", "firstName lastName")
    .sort({ createdAt: -1 });

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
  const { rating, title, text } = req.body;

  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  // Check if user has purchased this product (for verified badge)
  const hasPurchased = await Order.findOne({
    user: req.user._id,
    "orderItems.product": product._id,
    orderStatus: "Delivered",
  });

  // Check if user already reviewed this product
  const existingReview = await Review.findOne({
    user: req.user._id,
    product: product._id,
  });

  if (existingReview) {
    // Update existing review
    existingReview.rating = rating;
    existingReview.title = title;
    existingReview.text = text;
    existingReview.verified = !!hasPurchased;
    await existingReview.save();

    return res.status(200).json({
      success: true,
      message: "Review updated",
      review: existingReview,
    });
  }

  // Create new review
  const review = await Review.create({
    user: req.user._id,
    product: product._id,
    rating,
    title,
    text,
    verified: !!hasPurchased,
  });

  res.status(201).json({
    success: true,
    message: "Review added",
    review,
  });
});

// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id
// @access  Private
exports.deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: "Review not found",
    });
  }

  // Only the author or admin can delete
  if (
    review.user.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this review",
    });
  }

  await Review.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Review deleted",
  });
});

// @desc    Mark review as helpful
// @route   PUT /api/v1/reviews/:id/helpful
// @access  Private
exports.markHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: "Review not found",
    });
  }

  review.helpful += 1;
  await review.save();

  res.status(200).json({
    success: true,
    helpful: review.helpful,
  });
});
