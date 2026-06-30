const reviewRepository = require("../repositories/reviewRepository");
const { NotFoundError, ForbiddenError } = require("../middleware/errors");

exports.getProductReviews = async (productId, page = 1, limit = 20) => {
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);
  const offset = (parsedPage - 1) * parsedLimit;

  const { reviews: rows, total } = await reviewRepository.findReviewsByProductId(productId, parsedLimit, offset);
  const reviews = rows.map(row => ({
    ...row,
    user: {
      firstName: row.full_name.split(' ')[0] || '',
      lastName: row.full_name.split(' ')[1] || ''
    }
  }));

  return {
    data: reviews,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit)
    }
  };
};

exports.createReview = async (productId, userId, reviewData) => {
  const { rating, title, text, size_fit = '', images = [] } = reviewData;

  const isVerified = await reviewRepository.checkPurchase(productId, userId);
  if (!isVerified) {
    throw new ForbiddenError("You can only review products you have purchased");
  }

  const existing = await reviewRepository.findByUserAndProduct(userId, productId);
  let review;

  if (existing) {
    review = await reviewRepository.updateReview(existing.id, rating, title, text, isVerified, size_fit, images);
  } else {
    review = await reviewRepository.createReview(userId, productId, rating, title, text, isVerified, size_fit, images);
  }

  // Recalculate avg rating and total count
  const stats = await reviewRepository.getProductReviewStats(productId);
  const avgRating = parseFloat(stats.avg_rating || 0);
  const totalReviews = parseInt(stats.total_reviews || 0, 10);
  await reviewRepository.updateProductRating(productId, avgRating, totalReviews);

  return review;
};

exports.deleteReview = async (id, userId, userRole) => {
  const review = await reviewRepository.findById(id);
  if (!review) {
    throw new NotFoundError("Review not found");
  }

  if (review.user_id.toString() !== userId && userRole !== "admin") {
    throw new ForbiddenError("Not authorized to delete this review");
  }

  await reviewRepository.deleteReview(id);

  // Recalculate
  const stats = await reviewRepository.getProductReviewStats(review.product_id);
  const avgRating = parseFloat(stats.avg_rating || 0);
  const totalReviews = parseInt(stats.total_reviews || 0, 10);
  await reviewRepository.updateProductRating(review.product_id, avgRating, totalReviews);
};

exports.markHelpful = async (userId, reviewId) => {
  return reviewRepository.markHelpful(userId, reviewId);
};

exports.adminReply = async (id, reply, userRole) => {
  if (userRole !== "admin") {
    throw new ForbiddenError("Admin role required");
  }
  const updated = await reviewRepository.adminReply(id, reply);
  if (!updated) {
    throw new NotFoundError("Review not found");
  }
  return updated;
};

exports.getReviewSummary = async (productId) => {
  const stats = await reviewRepository.getProductReviewStats(productId);
  const avg_rating = parseFloat(stats.avg_rating || 0);
  const total = parseInt(stats.total_reviews || 0, 10);

  const breakdownRows = await reviewRepository.getReviewBreakdown(productId);
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  breakdownRows.forEach(row => {
    breakdown[row.rating] = parseInt(row.count, 10);
  });

  const verifiedCount = await reviewRepository.getVerifiedCount(productId);
  const verified_percent = total > 0 ? Math.round((verifiedCount / total) * 100) : 0;

  return {
    avg_rating,
    total,
    breakdown,
    verified_percent
  };
};
