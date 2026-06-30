const couponRepository = require("../repositories/couponRepository");
const { NotFoundError, BadRequestError } = require("../middleware/errors");

exports.validateCoupon = async (userId, code, cartTotal) => {
  if (!code) {
    throw new BadRequestError("Coupon code is required");
  }

  const coupon = await couponRepository.findActiveByCode(code);
  if (!coupon) {
    throw new BadRequestError("Coupon not found or inactive");
  }

  // Check expiration
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    throw new BadRequestError("Coupon has expired");
  }

  // Check usage limit
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
    throw new BadRequestError("Coupon usage limit reached");
  }

  // Check min order value (both cartTotal and min_order are in paise)
  const minOrderVal = parseFloat(coupon.min_order || 0);
  if (cartTotal < minOrderVal) {
    throw new BadRequestError(`Minimum order value of ₹${(minOrderVal / 100).toFixed(2)} required to use this coupon`);
  }

  // Check if user has already used this coupon
  const usageCheck = await couponRepository.findUsage(userId, coupon.id);
  if (usageCheck) {
    throw new BadRequestError("You have already used this coupon");
  }

  // Calculate discount amount (in paise)
  let discount_amount = coupon.type === "percent"
    ? Math.round((parseFloat(cartTotal) * parseFloat(coupon.discount)) / 100)
    : parseFloat(coupon.discount);

  const maxDisc = parseFloat(coupon.max_discount || 0);
  if (maxDisc > 0 && discount_amount > maxDisc) {
    discount_amount = maxDisc;
  }

  return {
    valid: true,
    discount_amount,
    discount_type: coupon.type,
    message: coupon.description || "Coupon applied successfully"
  };
};

exports.getCouponsPublic = async () => {
  return couponRepository.findAllActive();
};

exports.getCouponsAdmin = async () => {
  return couponRepository.findAll();
};

exports.createCoupon = async (couponData) => {
  // Normalize fields: frontend provides min_order_value or min_order, and max_discount
  const normalizedData = {
    code: couponData.code,
    discount: parseInt(couponData.discount, 10),
    type: couponData.type || "percent",
    minOrderValue: parseInt(couponData.min_order_value || couponData.min_order || 0, 10),
    maxDiscount: couponData.max_discount ? parseInt(couponData.max_discount, 10) : null,
    description: couponData.description || "",
    expiresAt: couponData.expires_at || null,
    usageLimit: couponData.usage_limit ? parseInt(couponData.usage_limit, 10) : 100
  };

  return couponRepository.create(normalizedData);
};

exports.updateCoupon = async (id, updates) => {
  const existing = await couponRepository.findById(id);
  if (!existing) {
    throw new NotFoundError("Coupon not found");
  }

  const updated = await couponRepository.update(id, updates);
  return updated;
};

exports.deleteCoupon = async (id) => {
  const deleted = await couponRepository.delete(id);
  if (!deleted) {
    throw new NotFoundError("Coupon not found");
  }
  return deleted;
};
