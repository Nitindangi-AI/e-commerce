const asyncHandler = require("express-async-handler");
const Coupon = require("../models/Coupon");

exports.validateCoupon = asyncHandler(async (req, res) => {
  const { code, cartTotal } = req.body;
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

  if (!coupon) return res.status(404).json({ success: false, message: "Invalid coupon code" });
  if (coupon.expiresAt && coupon.expiresAt < Date.now()) {
    return res.status(400).json({ success: false, message: "Coupon has expired" });
  }
  if (cartTotal < coupon.minOrder) {
    return res.status(400).json({ success: false, message: `Minimum order of ₹${coupon.minOrder.toLocaleString("en-IN")} required` });
  }

  let discount = coupon.type === "percent" ? Math.round((cartTotal * coupon.discount) / 100) : coupon.discount;
  if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;

  res.status(200).json({ success: true, coupon: { code: coupon.code, discount, type: coupon.type, description: coupon.description } });
});

exports.createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json({ success: true, coupon });
});

exports.getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find({ isActive: true });
  res.status(200).json({ success: true, coupons });
});
