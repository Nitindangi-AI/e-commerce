const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, required: true },
  color: { type: String },
  size: { type: String },
});

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  note: {
    type: String,
    default: "",
  },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    orderItems: [orderItemSchema],
    shippingAddress: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      country: { type: String, required: true },
      state: { type: String, required: true },
      district: { type: String, required: true },
      city: { type: String, required: true },
      area: { type: String, required: true },
      landmark: { type: String },
      pincode: { type: String, required: true },
      line1: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "upi", "card", "netbanking"],
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentDetails: {
      sellerUpiId: { type: String, default: "" },
      sellerBankName: { type: String, default: "" },
      sellerAccountHolder: { type: String, default: "" },
      transactionId: { type: String, default: "" },
    },
    orderStatus: {
      type: String,
      enum: [
        "Processing",
        "Confirmed",
        "Shipped",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
        "Return Requested",
        "Returned",
      ],
      default: "Processing",
    },
    statusHistory: [statusHistorySchema],
    estimatedDelivery: {
      type: Date,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    couponCode: {
      type: String,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    deliveredAt: {
      type: Date,
    },
    // Return policy fields
    returnStatus: {
      type: String,
      enum: ["none", "requested", "approved", "rejected", "completed"],
      default: "none",
    },
    returnReason: {
      type: String,
      default: "",
    },
    returnRequestedAt: {
      type: Date,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual: is return still eligible (delivered within 5 days)
orderSchema.virtual("returnEligible").get(function () {
  if (this.orderStatus !== "Delivered" || this.returnStatus !== "none") {
    return false;
  }
  if (!this.deliveredAt) return false;
  const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(this.deliveredAt).getTime() <= fiveDaysMs;
});

// Virtual: days remaining for return
orderSchema.virtual("returnDaysRemaining").get(function () {
  if (!this.deliveredAt || this.returnStatus !== "none") return 0;
  const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - new Date(this.deliveredAt).getTime();
  const remaining = fiveDaysMs - elapsed;
  return remaining > 0 ? Math.ceil(remaining / (24 * 60 * 60 * 1000)) : 0;
});

orderSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
