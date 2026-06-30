const asyncHandler = require("express-async-handler");
const vendorService = require("../services/vendorService");
const { AuthError } = require("../middleware/errors");

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const stats = await vendorService.getDashboardStats(userId);
  res.status(200).json({
    success: true,
    stats
  });
});

exports.getVendorProducts = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const { page = 1, limit = 24 } = req.query;
  const result = await vendorService.getVendorProducts(userId, page, limit);
  res.status(200).json({
    success: true,
    ...result
  });
});

exports.getVendorOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const orders = await vendorService.getVendorOrders(userId);
  res.status(200).json({
    success: true,
    count: orders.length,
    orders
  });
});

exports.getEarnings = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const earnings = await vendorService.getEarnings(userId);
  res.status(200).json({
    success: true,
    earnings
  });
});

exports.updateStoreProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const vendor = await vendorService.updateStoreProfile(userId, req.body);
  res.status(200).json({
    success: true,
    message: "Store profile updated successfully",
    vendor
  });
});

exports.registerVendor = asyncHandler(async (req, res) => {
  const result = await vendorService.registerVendor(req.body);
  res.status(201).json({
    message: 'Vendor registered. Awaiting approval.',
    user_id: result.userId
  });
});

exports.upgradeVendor = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  await vendorService.upgradeVendor(userId, req.body);
  res.status(200).json({
    success: true,
    message: 'Upgrade application submitted successfully. Awaiting approval.'
  });
});

exports.loginVendor = asyncHandler(async (req, res) => {
  const result = await vendorService.loginVendor(req.body.email, req.body.password);
  res.status(200).json(result);
});

exports.logoutVendor = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid token.');
  }
  await vendorService.logoutVendor();
  res.status(200).json({ message: 'Logged out successfully.' });
});
