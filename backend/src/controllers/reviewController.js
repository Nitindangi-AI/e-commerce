const asyncHandler = require("express-async-handler");
const reviewService = require("../services/reviewService");

exports.getProductReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const result = await reviewService.getProductReviews(req.params.id, page, limit);
  res.status(200).json({
    success: true,
    ...result,
  });
});

exports.createReview = asyncHandler(async (req, res) => {
  const review = await reviewService.createReview(req.params.id, req.user._id.toString(), req.body);
  res.status(201).json({
    success: true,
    message: "Review added successfully",
    review,
  });
});

exports.deleteReview = asyncHandler(async (req, res) => {
  await reviewService.deleteReview(req.params.id, req.user._id.toString(), req.user.role);
  res.status(200).json({
    success: true,
    message: "Review deleted successfully",
  });
});

exports.markHelpful = asyncHandler(async (req, res) => {
  await reviewService.markHelpful(req.user._id.toString(), req.params.id);
  res.status(200).json({
    success: true,
    message: "Marked helpful successfully",
  });
});

exports.adminReply = asyncHandler(async (req, res) => {
  const review = await reviewService.adminReply(req.params.id, req.body.reply, req.user.role);
  res.status(200).json({
    success: true,
    review,
  });
});

exports.getReviewSummary = asyncHandler(async (req, res) => {
  const summary = await reviewService.getReviewSummary(req.params.id);
  res.status(200).json({
    success: true,
    summary,
  });
});
