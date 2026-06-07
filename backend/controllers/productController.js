const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");
const db = require("../config/db");

// @desc    Get all products (with filtering, sorting, search, pagination)
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res) => {
  const { gender, badge, stock_status, is_featured, minPrice, maxPrice, minRating, sort, page = 1, limit = 24, search, category, brand } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  let queryText = "SELECT * FROM products WHERE is_active = true";
  const params = [];
  let paramCount = 1;

  if (gender) {
    queryText += ` AND gender = $${paramCount}`;
    params.push(gender);
    paramCount++;
  }
  if (badge) {
    queryText += ` AND badge = $${paramCount}`;
    params.push(badge);
    paramCount++;
  }
  if (stock_status) {
    queryText += ` AND stock_status = $${paramCount}`;
    params.push(stock_status);
    paramCount++;
  }
  if (is_featured !== undefined) {
    queryText += ` AND is_featured = $${paramCount}`;
    params.push(is_featured === "true" || is_featured === true);
    paramCount++;
  }
  if (minPrice) {
    queryText += ` AND price >= $${paramCount}`;
    params.push(parseFloat(minPrice));
    paramCount++;
  }
  if (maxPrice) {
    queryText += ` AND price <= $${paramCount}`;
    params.push(parseFloat(maxPrice));
    paramCount++;
  }
  if (minRating) {
    queryText += ` AND avg_rating >= $${paramCount}`;
    params.push(parseFloat(minRating));
    paramCount++;
  }
  if (category && category !== "All") {
    queryText += ` AND category = $${paramCount}`;
    params.push(category);
    paramCount++;
  }
  if (brand) {
    queryText += ` AND brand = $${paramCount}`;
    params.push(brand);
    paramCount++;
  }
  if (search) {
    queryText += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount} OR brand ILIKE $${paramCount})`;
    params.push(`%${search}%`);
    paramCount++;
  }

  // Count total matching
  const countRes = await db.query(queryText.replace("SELECT *", "SELECT COUNT(*)"), params);
  const totalProducts = parseInt(countRes.rows[0].count);

  // Sorting
  if (sort === "price_asc") {
    queryText += " ORDER BY price ASC";
  } else if (sort === "price_desc") {
    queryText += " ORDER BY price DESC";
  } else if (sort === "newest") {
    queryText += " ORDER BY created_at DESC";
  } else if (sort === "rating") {
    queryText += " ORDER BY avg_rating DESC";
  } else if (sort === "popular") {
    queryText += " ORDER BY total_sold DESC";
  } else {
    queryText += " ORDER BY created_at DESC";
  }

  // Pagination
  queryText += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(parseInt(limit), offset);

  const result = await db.query(queryText, params);

  res.status(200).json({
    success: true,
    count: result.rows.length,
    totalProducts,
    page: parseInt(page),
    totalPages: Math.ceil(totalProducts / parseInt(limit)),
    products: result.rows,
  });
});
exports.getAllProducts = exports.getProducts;

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
exports.getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await db.query("SELECT * FROM products WHERE id = $1 AND is_active = true", [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }
  res.status(200).json({
    success: true,
    product: result.rows[0],
  });
});

// @desc    Get all categories
// @route   GET /api/v1/products/categories
// @access  Public
exports.getCategories = asyncHandler(async (req, res) => {
  const result = await db.query("SELECT DISTINCT category FROM products WHERE is_active = true");
  const categories = result.rows.map(row => ({ name: row.category }));
  res.status(200).json({
    success: true,
    categories,
  });
});

// @desc    Get all brands
// @route   GET /api/v1/products/brands
// @access  Public
exports.getBrands = asyncHandler(async (req, res) => {
  const { category } = req.query;
  let result;
  if (category && category !== "All") {
    result = await db.query("SELECT DISTINCT brand FROM products WHERE category = $1 AND is_active = true", [category]);
  } else {
    result = await db.query("SELECT DISTINCT brand FROM products WHERE is_active = true");
  }
  const brands = result.rows.map(row => ({ name: row.brand }));
  res.status(200).json({
    success: true,
    brands,
  });
});

// @desc    Get related products
// @route   GET /api/v1/products/:id/related
// @access  Public
exports.getRelatedProducts = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const productRes = await db.query("SELECT category FROM products WHERE id = $1", [id]);
  if (productRes.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }
  const category = productRes.rows[0].category;

  const result = await db.query(
    "SELECT * FROM products WHERE category = $1 AND id != $2 AND is_active = true ORDER BY avg_rating DESC LIMIT 8",
    [category, id]
  );
  res.status(200).json({
    success: true,
    products: result.rows,
  });
});

// @desc    Get product by slug
// @route   GET /api/v1/products/slug/:slug
// @access  Public
exports.getProductBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const query = `
    SELECT p.*, v.store_name 
    FROM products p
    LEFT JOIN vendors v ON p.seller_id = v.user_id
    WHERE p.slug = $1 AND p.is_active = true
  `;
  const result = await db.query(query, [slug]);
  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }
  res.status(200).json({
    success: true,
    product: result.rows[0],
  });
});

// @desc    Record product view
// @route   POST /api/v1/products/:id/view
// @access  Public
exports.recordView = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const productRes = await db.query("SELECT stock FROM products WHERE id = $1", [id]);
  if (productRes.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }
  const currentStock = productRes.rows[0].stock;

  await db.query(
    "INSERT INTO inventory_log (product_id, change_type, quantity_change, quantity_after, note) VALUES ($1, 'adjustment', 0, $2, 'Product view recorded')",
    [id, currentStock]
  );

  const result = await db.query(
    "UPDATE products SET view_count = view_count + 1 WHERE id = $1 RETURNING *",
    [id]
  );

  res.status(200).json({
    success: true,
    product: result.rows[0],
  });
});

// @desc    Search products using ts_vector
// @route   GET /api/v1/products/search
// @access  Public
exports.searchProducts = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({
      success: false,
      message: "Search query required",
    });
  }
  const query = `
    SELECT *, ts_rank(to_tsvector('english', name || ' ' || brand || ' ' || coalesce(description,'')), plainto_tsquery($1)) as ts_rank
    FROM products 
    WHERE to_tsvector('english', name || ' ' || brand || ' ' || coalesce(description,'')) @@ plainto_tsquery($1) AND is_active = true 
    ORDER BY ts_rank DESC
  `;
  const result = await db.query(query, [q]);
  res.status(200).json({
    success: true,
    count: result.rows.length,
    products: result.rows,
  });
});

// @desc    Get top selling products
// @route   GET /api/v1/products/top-selling
// @access  Public
exports.getTopSelling = asyncHandler(async (req, res) => {
  const result = await db.query(
    "SELECT * FROM products WHERE is_active = true ORDER BY total_sold DESC LIMIT 20"
  );
  res.status(200).json({
    success: true,
    products: result.rows,
  });
});

// @desc    Get featured products
// @route   GET /api/v1/products/featured
// @access  Public
exports.getFeatured = asyncHandler(async (req, res) => {
  const result = await db.query(
    "SELECT * FROM products WHERE is_featured = true AND is_active = true"
  );
  res.status(200).json({
    success: true,
    products: result.rows,
  });
});

// @desc    Create product
// @route   POST /api/v1/products
// @access  Private/Admin
exports.createProduct = asyncHandler(async (req, res) => {
  const { name, price, original_price, category, brand, material, badge, img, images, description, stock, specs, colors = [], sizes = [], delivery_days, return_policy, slug, sku, short_description, meta_title, meta_description, tags, gender, age_group, is_featured, low_stock_threshold, warranty, weight_grams, video_url } = req.body;

  const seller_id = req.user._id.toString();

  let productSlug = slug;
  if (!productSlug) {
    productSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).substring(2, 8);
  }

  const query = `
    INSERT INTO products (
      name, price, original_price, category, brand, material, badge, img, images, description, stock, specs, colors, sizes, delivery_days, return_policy, slug, sku, short_description, meta_title, meta_description, tags, gender, age_group, is_featured, low_stock_threshold, warranty, weight_grams, video_url, seller_id, is_active
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, true
    ) RETURNING *
  `;

  const values = [
    name, price, original_price, category, brand, material, badge, img, images, description, stock, specs || {}, colors, sizes, delivery_days || 3, return_policy || {}, productSlug, sku || ('SKU-' + Math.random().toString(36).substring(2, 10).toUpperCase()), short_description, meta_title, meta_description, tags || [], gender, age_group, is_featured || false, low_stock_threshold || 5, warranty, weight_grams || 0, video_url, seller_id
  ];

  const result = await db.query(query, values);
  const product = result.rows[0];

  if (colors.length > 0 && sizes.length > 0) {
    for (const color of colors) {
      for (const size of sizes) {
        const variantSku = `VAR-${product.id.substring(0, 4).toUpperCase()}-${color.substring(0, 2).toUpperCase()}-${size.substring(0, 2).toUpperCase()}`;
        await db.query(
          "INSERT INTO product_variants (product_id, sku, color, size, price_modifier, stock, img, is_active) VALUES ($1, $2, $3, $4, 0, $5, $6, true)",
          [product.id, variantSku, color, size, Math.floor(stock / (colors.length * sizes.length)) || 0, img]
        );
      }
    }
  }

  try {
    const mongoBody = {
      ...req.body,
      _id: product.id,
      seller: req.user._id,
    };
    await Product.create(mongoBody);
  } catch (err) {
    console.error("MongoDB product sync error:", err);
  }

  res.status(201).json({
    success: true,
    product,
  });
});

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private/Admin
exports.updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const keys = Object.keys(updates).filter(k => k !== "id" && k !== "created_at" && k !== "updated_at");
  if (keys.length === 0) {
    return res.status(400).json({ success: false, message: "No update fields provided" });
  }

  const setClause = keys.map((key, index) => `"${key}" = $${index + 2}`).join(", ");
  const values = keys.map(key => updates[key]);

  const queryText = `UPDATE products SET ${setClause}, updated_at = now() WHERE id = $1 RETURNING *`;
  const result = await db.query(queryText, [id, ...values]);

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  try {
    await Product.findByIdAndUpdate(id, updates);
  } catch (err) {}

  res.status(200).json({
    success: true,
    product: result.rows[0],
  });
});

// @desc    Soft delete product
// @route   DELETE /api/v1/products/:id
// @access  Private/Admin
exports.deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await db.query("UPDATE products SET is_active = false WHERE id = $1 RETURNING *", [id]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  try {
    await Product.findByIdAndUpdate(id, { is_active: false });
  } catch (err) {}

  res.status(200).json({
    success: true,
    message: "Product deleted successfully (soft deleted)",
  });
});
