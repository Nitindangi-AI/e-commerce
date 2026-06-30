const asyncHandler = require("express-async-handler");
const couponService = require("../services/couponService");

exports.validateCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const cartTotal = parseFloat(req.body.cartTotal !== undefined ? req.body.cartTotal : req.body.orderValue);
  const userId = req.user._id.toString();

  const result = await couponService.validateCoupon(userId, code, cartTotal);
  res.status(200).json(result);
});

exports.createCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.createCoupon(req.body);
  res.status(201).json({ success: true, coupon });
});

exports.getCoupons = asyncHandler(async (req, res) => {
  const coupons = await couponService.getCouponsPublic();
  res.status(200).json({ success: true, coupons });
});
