const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter product name"],
      trim: true,
      maxLength: [200, "Product name cannot exceed 200 characters"],
    },
    price: {
      type: Number,
      required: [true, "Please enter product price"],
      min: [0, "Price cannot be negative"],
    },
    originalPrice: {
      type: Number,
      default: null,
    },
    category: {
      type: String,
      required: [true, "Please enter product category"],
      trim: true,
    },
    brand: {
      type: String,
      required: [true, "Please enter product brand"],
      trim: true,
    },
    material: {
      type: String,
      trim: true,
    },
    badge: {
      type: String,
      trim: true,
      default: "",
    },
    img: {
      type: String,
      required: [true, "Please provide a product image"],
    },
    images: [{ type: String }],
    description: {
      type: String,
      required: [true, "Please enter product description"],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    stock: {
      type: Number,
      required: [true, "Please enter stock quantity"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    specs: {
      type: Map,
      of: String,
      default: {},
    },
    colors: [{ type: String }],
    sizes: [{ type: String }],
    deliveryDays: {
      type: Number,
      default: 3,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    returnPolicy: {
      returnable: { type: Boolean, default: true },
      returnDays: { type: Number, default: 5 },
    },
  },
  { timestamps: true }
);

// Indexes for efficient filtering and sorting
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ name: "text", description: "text", brand: "text", category: "text" });

// Virtual: discount percentage
productSchema.virtual("discount").get(function () {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Product", productSchema);
