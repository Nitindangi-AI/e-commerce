const asyncHandler = require("express-async-handler");
const Coupon = require("../models/Coupon");
const db = require("../config/db");

// @desc    Validate a coupon code
// @route   POST /api/v1/coupons/validate
// @access  Private
exports.validateCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const cartTotal = parseFloat(req.body.cartTotal !== undefined ? req.body.cartTotal : req.body.orderValue);
  const userId = req.user._id.toString();

  if (!code) {
    return res.status(400).json({ valid: false, error: "Coupon code is required" });
  }

  const result = await db.query(
    "SELECT * FROM coupons WHERE code = $1 AND is_active = true",
    [code.toUpperCase()]
  );

  if (result.rows.length === 0) {
    return res.status(400).json({ valid: false, error: "Coupon not found or inactive" });
  }

  const coupon = result.rows[0];

  // Check expiration
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return res.status(400).json({ valid: false, error: "Coupon has expired" });
  }

  // Check usage limit
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
    return res.status(400).json({ valid: false, error: "Coupon usage limit reached" });
  }

  // Check min order value
  const minOrderVal = parseFloat(coupon.min_order_value || coupon.min_order || 0);
  if (cartTotal < minOrderVal) {
    return res.status(400).json({
      valid: false,
      error: `Minimum order value of ₹${minOrderVal} required to use this coupon`
    });
  }

  // Check if user has already used this coupon
  const usageCheck = await db.query(
    "SELECT * FROM coupon_usage WHERE user_id = $1 AND coupon_id = $2",
    [userId, coupon.id]
  );
  if (usageCheck.rows.length > 0) {
    return res.status(400).json({ valid: false, error: "You have already used this coupon" });
  }

  // Calculate discount amount
  let discount_amount = coupon.type === "percent" 
    ? Math.round((parseFloat(cartTotal) * parseFloat(coupon.discount)) / 100)
    : parseFloat(coupon.discount);

  const maxDisc = parseFloat(coupon.max_discount || 0);
  if (maxDisc > 0 && discount_amount > maxDisc) {
    discount_amount = maxDisc;
  }

  res.status(200).json({
    valid: true,
    discount_amount,
    discount_type: coupon.type,
    message: coupon.description || "Coupon applied successfully"
  });
});

// @desc    Create a coupon
// @route   POST /api/v1/coupons
// @access  Private/Admin
exports.createCoupon = asyncHandler(async (req, res) => {
  const { code, discount, type, min_order_value, max_discount, description, expires_at, usage_limit } = req.body;

  const query = `
    INSERT INTO coupons (
      code, discount, type, min_order_value, max_discount, description, is_active, expires_at, usage_limit, used_count
    ) VALUES (
      $1, $2, $3, $4, $5, $6, true, $7, $8, 0
    ) RETURNING *
  `;
  const values = [
    code.toUpperCase(), discount, type || 'percent', min_order_value || 0, max_discount || 0, description, expires_at, usage_limit || 100
  ];
  
  const result = await db.query(query, values);

  try {
    await Coupon.create({
      code: code.toUpperCase(),
      discount,
      type: type || 'percent',
      minOrder: min_order_value || 0,
      maxDiscount: max_discount || 0,
      description,
      expiresAt: expires_at,
      usageLimit: usage_limit || 100,
    });
  } catch (err) {}

  res.status(201).json({ success: true, coupon: result.rows[0] });
});

// @desc    Get all active coupons
// @route   GET /api/v1/coupons
// @access  Public
exports.getCoupons = asyncHandler(async (req, res) => {
  const result = await db.query("SELECT * FROM coupons WHERE is_active = true");
  res.status(200).json({ success: true, coupons: result.rows });
});
