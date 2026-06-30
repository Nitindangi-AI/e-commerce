"use strict";

const { z } = require("zod");

// ─────────────────────────────────────────────────────────────────────────────
// Core middleware factory
// Usage:  validate(schema)  →  Express middleware
//
// On success  : attaches the parsed (coerced + stripped) body back to req.body
//               and calls next().
// On failure  : responds 400 with { success, message, errors[] } and does NOT
//               call next(), so the route handler never sees an invalid body.
// ─────────────────────────────────────────────────────────────────────────────
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = (result.error.issues || result.error.errors || []).map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));

    console.log("Zod validation failed:", errors);

    return res.status(400).json({
      success: false,
      message: errors[0]?.message ?? "Validation failed",
      errors,
    });
  }

  // Replace req.body with the Zod-parsed value so unknown keys are stripped
  // and coercions (e.g. string→number) are applied before the controller runs.
  req.body = result.data;
  return next();
};

// ─────────────────────────────────────────────────────────────────────────────
// Reusable primitives
// ─────────────────────────────────────────────────────────────────────────────
const indianPhone = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number");

const indianPincode = z
  .string()
  .regex(/^\d{6}$/, "Enter a valid 6-digit pincode");

const positivePrice = z.coerce
  .number({ invalid_type_error: "Price must be a number" })
  .nonnegative("Price must be a non-negative number");

const positiveStock = z.coerce
  .number({ invalid_type_error: "Stock must be a number" })
  .int("Stock must be a whole number")
  .nonnegative("Stock must be a non-negative number");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/products  — createProduct
// PUT  /api/v1/products/:id  — updateProduct (all fields optional for partial)
// ─────────────────────────────────────────────────────────────────────────────
const productBaseShape = {
  name: z.string().min(1, "Product name is required").trim(),
  price: positivePrice,
  original_price: positivePrice.optional(),
  category: z.string().min(1, "Category is required").trim(),
  brand: z.string().min(1, "Brand is required").trim(),
  description: z.string().min(1, "Description is required").trim(),
  stock: positiveStock,
  img: z.string().min(1, "Main image URL is required").trim(),
  // Optional fields
  material: z.string().trim().optional(),
  badge: z.string().trim().optional(),
  images: z.array(z.string()).optional(),
  specs: z.record(z.unknown()).optional(),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  delivery_days: z.coerce.number().int().positive().optional(),
  return_policy: z.record(z.unknown()).optional(),
  slug: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  short_description: z.string().trim().optional(),
  meta_title: z.string().trim().optional(),
  meta_description: z.string().trim().optional(),
  tags: z.array(z.string()).optional(),
  gender: z.string().trim().optional(),
  age_group: z.string().trim().optional(),
  is_featured: z.boolean().optional(),
  low_stock_threshold: z.coerce.number().int().nonnegative().optional(),
  warranty: z.string().trim().optional(),
  weight_grams: z.coerce.number().nonnegative().optional(),
  video_url: z.string().url("video_url must be a valid URL").optional().or(z.literal("")),
};

const productCreateSchema = z.object(productBaseShape);

// For PUT all top-level fields become optional — the controller already handles
// "no update fields" gracefully, but at least one key must be present.
const productUpdateSchema = z
  .object(
    Object.fromEntries(
      Object.entries(productBaseShape).map(([k, v]) => [k, v.optional()])
    )
  )
  .refine((data) => Object.keys(data).length > 0, {
    message: "No update fields provided",
  });

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/orders  — createOrder
// ─────────────────────────────────────────────────────────────────────────────
const shippingAddressSchema = z.object({
  name: z.string().min(1, "Recipient name is required").trim(),
  phone: indianPhone,
  line1: z.string().min(1, "Address Line 1 is required").trim(),
  city: z.string().min(1, "City is required").trim(),
  state: z.string().min(1, "State is required").trim(),
  pincode: indianPincode,
  // optional
  country: z.string().trim().optional(),
  district: z.string().trim().optional(),
  area: z.string().trim().optional(),
  landmark: z.string().trim().optional(),
});

const orderItemSchema = z.object({
  product: z.string().uuid("Product ID must be a valid UUID"),
  quantity: z.coerce
    .number()
    .int()
    .positive("Quantity must be a positive integer"),
  color: z.string().optional(),
  size: z.string().optional(),
});

const orderCreateSchema = z.object({
  orderItems: z
    .array(orderItemSchema)
    .min(1, "Order items must be a non-empty array"),
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.enum(["cod", "upi", "card", "netbanking", "razorpay"], {
    errorMap: () => ({ message: "Invalid payment method" }),
  }),
  couponCode: z.string().trim().nullable().optional(),
  useLoyalty: z.boolean().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/addresses  — addAddress
// PUT  /api/v1/addresses/:id  — updateAddress
// ─────────────────────────────────────────────────────────────────────────────
const addressBaseShape = {
  name: z.string().min(1, "Full name is required").trim(),
  phone: indianPhone,
  country: z.string().min(1, "Country is required").trim(),
  state: z.string().min(1, "State is required").trim(),
  district: z.string().trim().optional(),
  city: z.string().min(1, "City is required").trim(),
  area: z.string().trim().optional(),
  landmark: z.string().trim().optional(),
  line1: z.string().min(1, "Full Address Line is required").trim(),
  pincode: indianPincode,
  label: z.enum(["Home", "Work", "Other"]).optional(),
  is_default: z.boolean().optional(),
};

const addressCreateSchema = z.object(addressBaseShape);

const addressUpdateSchema = z
  .object(
    Object.fromEntries(
      Object.entries(addressBaseShape).map(([k, v]) => [k, v.optional()])
    )
  )
  .refine((data) => Object.keys(data).length > 0, {
    message: "No update fields provided",
  });

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/coupons  — createCoupon
// ─────────────────────────────────────────────────────────────────────────────
const couponCreateSchema = z.object({
  code: z
    .string()
    .min(1, "Coupon code is required")
    .trim()
    .toUpperCase(),
  discount: z.coerce
    .number({ invalid_type_error: "Discount must be a number" })
    .positive("Discount must be a positive number"),
  type: z.enum(["percent", "flat"], {
    errorMap: () => ({ message: "Type must be 'percent' or 'flat'" }),
  }),
  min_order_value: z.coerce.number().nonnegative().optional(),
  max_discount: z.coerce.number().nonnegative().optional(),
  description: z.string().trim().optional(),
  expires_at: z
    .string()
    .datetime({ message: "expires_at must be a valid ISO 8601 date-time" })
    .optional()
    .nullable(),
  usage_limit: z.coerce.number().int().positive().optional(),
});

// POST /api/v1/coupons/validate  — validateCoupon
const couponValidateSchema = z.object({
  code: z.string().min(1, "Coupon code is required").trim(),
  cartTotal: z.coerce
    .number({ invalid_type_error: "cartTotal must be a number" })
    .nonnegative("cartTotal must be a non-negative number")
    .optional(),
  orderValue: z.coerce.number().nonnegative().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create-order  — createRazorpayOrder
// ─────────────────────────────────────────────────────────────────────────────
// amount is in paise from the frontend directly.
const razorpayOrderSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "amount must be a number" })
    .int("amount must be a whole number (in paise)")
    .positive("amount must be a positive number (in paise)"),
});

// ─────────────────────────────────────────────────────────────────────────────
// payment_details column allowlist
// ─────────────────────────────────────────────────────────────────────────────
// SECURITY CONSTRAINT — payment_details COLUMN ALLOWLIST
//
// The `payment_details` JSONB column on the `orders` table MAY ONLY contain
// the following three fields when written by the payment-confirmation endpoint:
//
//   razorpay_order_id   — the order ID issued by Razorpay before payment
//   razorpay_payment_id — the payment ID confirmed by Razorpay after capture
//   status              — the gateway-reported payment status string
//
// ANY other field (card_number, cvv, upi_pin, otp_code, expiry, etc.) MUST
// NEVER be persisted here. This schema uses z.object().strict() so that Zod
// rejects unrecognised keys outright rather than silently passing them through.
// The validate() middleware then replaces req.body with the parsed result,
// which means the controller receives an object containing ONLY these three
// keys regardless of what the client sent.
//
// Other code paths (cancel/return refund metadata, logistics tracking numbers,
// OTP codes) write to payment_details via the InsForge SDK directly and are
// NOT routed through this schema — those writes contain no sensitive payment
// credential data (no card numbers, CVVs, or PINs were found anywhere in the
// codebase during the audit of 2026-06-26).
// ─────────────────────────────────────────────────────────────────────────────
const paymentDetailsSchema = z
  .object({
    razorpay_order_id: z
      .string()
      .min(1, "razorpay_order_id is required")
      .trim(),
    razorpay_payment_id: z
      .string()
      .min(1, "razorpay_payment_id is required")
      .trim(),
    status: z
      .string()
      .min(1, "status is required")
      .trim(),
  })
  // strict() causes Zod to error on any key not listed above, so an attacker
  // cannot sneak in card_number, cvv, upi_pin, or any other field.
  .strict("payment_details may only contain: razorpay_order_id, razorpay_payment_id, status");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/verify  — verifyRazorpayPayment
// The three Razorpay fields + signature are the ONLY allowed keys.
// Using .strict() ensures no extra field (card number, CVV, PIN) can reach
// the controller. The controller further restricts what is written to the DB.
// ─────────────────────────────────────────────────────────────────────────────
const razorpayVerifySchema = z
  .object({
    razorpay_order_id: z.string().min(1, "razorpay_order_id is required").trim(),
    razorpay_payment_id: z.string().min(1, "razorpay_payment_id is required").trim(),
    razorpay_signature: z.string().min(1, "razorpay_signature is required").trim(),
  })
  .strict("Only razorpay_order_id, razorpay_payment_id, and razorpay_signature are accepted");

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/v1/payment/payment-account  — updatePaymentAccount
// (Writes to profiles.payment_account, NOT orders.payment_details)
// ─────────────────────────────────────────────────────────────────────────────
const paymentAccountUpdateSchema = z.object({
  upiId: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  accountHolder: z.string().trim().optional(),
  accountNumber: z.string().trim().optional(),
  ifscCode: z.string().trim().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/products/:id/reviews  — createReview
// ─────────────────────────────────────────────────────────────────────────────
const reviewCreateSchema = z.object({
  rating: z.coerce
    .number()
    .int()
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  title: z.string().min(1, "Review title is required").trim(),
  text: z.string().min(1, "Review text is required").trim(),
  size_fit: z.string().trim().optional(),
  images: z.array(z.string()).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  // Factory — used directly in routes
  validate,

  // Pre-built middleware instances for backwards-compatible named imports
  validateProduct: validate(productCreateSchema),
  validateProductUpdate: validate(productUpdateSchema),
  validateOrder: validate(orderCreateSchema),
  validateAddress: validate(addressCreateSchema),
  validateAddressUpdate: validate(addressUpdateSchema),
  validateCouponCreate: validate(couponCreateSchema),
  validateCouponValidate: validate(couponValidateSchema),
  validateReview: validate(reviewCreateSchema),
  // Strictly strips any field that is not razorpay_order_id / razorpay_payment_id / status
  validatePaymentDetails: validate(paymentDetailsSchema),
  validatePaymentAccountUpdate: validate(paymentAccountUpdateSchema),
  // Razorpay endpoint validators
  validateRazorpayOrder: validate(razorpayOrderSchema),
  validateRazorpayVerify: validate(razorpayVerifySchema),

  // Raw schemas (useful for testing or composing schemas elsewhere)
  schemas: {
    productCreateSchema,
    productUpdateSchema,
    orderCreateSchema,
    addressCreateSchema,
    addressUpdateSchema,
    couponCreateSchema,
    couponValidateSchema,
    reviewCreateSchema,
    paymentDetailsSchema,
    paymentAccountUpdateSchema,
  },
};
