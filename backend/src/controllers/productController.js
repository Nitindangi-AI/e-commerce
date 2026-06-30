const asyncHandler = require("express-async-handler");
const productService = require("../services/productService");

exports.getProducts = asyncHandler(async (req, res) => {
  const result = await productService.getProducts(req.query);
  res.status(200).json({
    success: true,
    ...result
  });
});
exports.getAllProducts = exports.getProducts;

exports.getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProduct(req.params.id);
  res.status(200).json({ success: true, product });
});

exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await productService.getCategories();
  res.status(200).json({ success: true, categories });
});

exports.getBrands = asyncHandler(async (req, res) => {
  const brands = await productService.getBrands(req.query.category);
  res.status(200).json({ success: true, brands });
});

exports.getRelatedProducts = asyncHandler(async (req, res) => {
  const products = await productService.getRelatedProducts(req.params.id);
  res.status(200).json({ success: true, products });
});

exports.getProductBySlug = asyncHandler(async (req, res) => {
  const product = await productService.getProductBySlug(req.params.slug);
  res.status(200).json({ success: true, product });
});

exports.recordView = asyncHandler(async (req, res) => {
  const product = await productService.recordView(req.params.id);
  res.status(200).json({ success: true, product });
});

exports.searchProducts = asyncHandler(async (req, res) => {
  const products = await productService.searchProducts(req.query.q);
  res.status(200).json({ success: true, count: products.length, products });
});

exports.getTopSelling = asyncHandler(async (req, res) => {
  const products = await productService.getTopSelling();
  res.status(200).json({ success: true, products });
});

exports.getFeatured = asyncHandler(async (req, res) => {
  const products = await productService.getFeatured();
  res.status(200).json({ success: true, products });
});

exports.createProduct = asyncHandler(async (req, res) => {
  const sellerId = req.user._id.toString();
  const product = await productService.createProduct(sellerId, req.body);
  res.status(201).json({ success: true, product });
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const sellerId = req.user._id.toString();
  const product = await productService.updateProduct(req.params.id, sellerId, req.user.role, req.body);
  res.status(200).json({ success: true, product });
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const sellerId = req.user._id.toString();
  await productService.deleteProduct(req.params.id, sellerId, req.user.role);
  res.status(200).json({ success: true, message: "Product deleted successfully (soft deleted)" });
});
