const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");
const ApiFeatures = require("../utils/apiFeatures");

// @desc    Get all products (with filtering, sorting, search, pagination)
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res) => {
  // Count total matching documents (before pagination)
  const countQuery = new ApiFeatures(Product.find(), req.query)
    .search()
    .filter();
  const totalProducts = await Product.countDocuments(
    countQuery.query.getFilter()
  );

  // Build the actual query
  const apiFeatures = new ApiFeatures(Product.find(), req.query)
    .search()
    .filter()
    .sort()
    .paginate();

  let products = await apiFeatures.query;

  // Handle discount filter (post-query since discount is a virtual)
  if (req.query.minDiscount) {
    const minDisc = Number(req.query.minDiscount);
    products = products.filter((p) => {
      if (p.originalPrice && p.originalPrice > p.price) {
        const disc = Math.round(
          ((p.originalPrice - p.price) / p.originalPrice) * 100
        );
        return disc >= minDisc;
      }
      return false;
    });
  }

  // Sort by discount if requested
  if (req.query.sort === "discount") {
    products.sort((a, b) => {
      const discA =
        a.originalPrice && a.originalPrice > a.price
          ? ((a.originalPrice - a.price) / a.originalPrice) * 100
          : 0;
      const discB =
        b.originalPrice && b.originalPrice > b.price
          ? ((b.originalPrice - b.price) / b.originalPrice) * 100
          : 0;
      return discB - discA;
    });
  }

  res.status(200).json({
    success: true,
    count: products.length,
    totalProducts,
    page: apiFeatures.page || 1,
    totalPages: Math.ceil(totalProducts / (apiFeatures.limit || 20)),
    products,
  });
});

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  res.status(200).json({
    success: true,
    product,
  });
});

// @desc    Get all categories with product counts
// @route   GET /api/v1/products/categories
// @access  Public
exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { name: "$_id", count: 1, _id: 0 } },
  ]);

  res.status(200).json({
    success: true,
    categories,
  });
});

// @desc    Get all brands (optionally filtered by category)
// @route   GET /api/v1/products/brands
// @access  Public
exports.getBrands = asyncHandler(async (req, res) => {
  const match = {};
  if (req.query.category && req.query.category !== "All") {
    match.category = req.query.category;
  }

  const brands = await Product.aggregate([
    { $match: match },
    { $group: { _id: "$brand", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { name: "$_id", count: 1, _id: 0 } },
  ]);

  res.status(200).json({
    success: true,
    brands,
  });
});

// @desc    Get related products (same category, excluding current)
// @route   GET /api/v1/products/:id/related
// @access  Public
exports.getRelatedProducts = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  const related = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
  }).limit(4);

  res.status(200).json({
    success: true,
    products: related,
  });
});

// @desc    Create product (admin)
// @route   POST /api/v1/products
// @access  Private/Admin
exports.createProduct = asyncHandler(async (req, res) => {
  // Automatically set the seller to the admin creating the product
  req.body.seller = req.user._id;
  const product = await Product.create(req.body);

  res.status(201).json({
    success: true,
    product,
  });
});

// @desc    Update product (admin)
// @route   PUT /api/v1/products/:id
// @access  Private/Admin
exports.updateProduct = asyncHandler(async (req, res) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    product,
  });
});

// @desc    Delete product (admin)
// @route   DELETE /api/v1/products/:id
// @access  Private/Admin
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  await Product.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Product deleted successfully",
  });
});
