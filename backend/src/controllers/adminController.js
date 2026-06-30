const asyncHandler = require("express-async-handler");
const adminService = require("../services/adminService");
const couponService = require("../services/couponService");

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  res.status(200).json({ success: true, stats });
});

exports.getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const result = await adminService.getUsers(page, limit);
  res.status(200).json({
    success: true,
    ...result
  });
});

exports.approveVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user._id.toString();
  const vendor = await adminService.approveVendor(id, adminId);
  res.status(200).json({ success: true, message: "Vendor approved successfully", vendor });
});

exports.rejectVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason = "Registration criteria not met" } = req.body;
  const vendor = await adminService.rejectVendor(id, reason);
  res.status(200).json({ success: true, message: "Vendor rejected successfully", vendor });
});

exports.suspendVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason = "Suspended by admin" } = req.body;
  const vendor = await adminService.suspendVendor(id, reason);
  res.status(200).json({ success: true, message: "Vendor suspended", vendor });
});

exports.getVendors = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 24 } = req.query;
  const result = await adminService.getVendors(status, page, limit);
  res.status(200).json({ success: true, ...result });
});

exports.banUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profile = await adminService.banUser(id);
  res.status(200).json({ success: true, message: "User banned successfully", profile });
});

exports.getInventoryAlerts = asyncHandler(async (req, res) => {
  const products = await adminService.getInventoryAlerts();
  res.status(200).json({ success: true, products });
});

exports.getAllOrders = asyncHandler(async (req, res) => {
  const { status, start_date, end_date, vendor_id, page = 1, limit = 24 } = req.query;
  const result = await adminService.getAllOrders({ status, start_date, end_date, vendor_id }, page, limit);
  res.status(200).json({ success: true, ...result });
});

// Admin Coupon CRUD
exports.createCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.createCoupon(req.body);
  res.status(201).json({ success: true, coupon });
});

exports.getCoupons = asyncHandler(async (req, res) => {
  const coupons = await couponService.getCouponsAdmin();
  res.status(200).json({ success: true, coupons });
});

exports.updateCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const coupon = await couponService.updateCoupon(id, req.body);
  res.status(200).json({ success: true, coupon });
});

exports.deleteCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await couponService.deleteCoupon(id);
  res.status(200).json({ success: true, message: "Coupon deleted successfully" });
});
