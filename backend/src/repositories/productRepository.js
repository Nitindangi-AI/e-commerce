const db = require("../../config/db");
const { softDelete } = require("./softDelete");

exports.findAll = async (filters, limit, offset) => {
  const { gender, badge, stock_status, is_featured, minPrice, maxPrice, minRating, sort, search, category, brand } = filters;
  let queryText = "SELECT * FROM products WHERE is_active = true AND deleted_at IS NULL";
  const params = [];
  let paramCount = 1;
  let searchParamIndex = null;

  if (gender) { queryText += ` AND gender = $${paramCount}`; params.push(gender); paramCount++; }
  if (badge) { queryText += ` AND badge = $${paramCount}`; params.push(badge); paramCount++; }
  if (stock_status) { queryText += ` AND stock_status = $${paramCount}`; params.push(stock_status); paramCount++; }
  if (is_featured !== undefined) { queryText += ` AND is_featured = $${paramCount}`; params.push(is_featured === "true" || is_featured === true); paramCount++; }
  if (minPrice) { queryText += ` AND price >= $${paramCount}`; params.push(parseFloat(minPrice)); paramCount++; }
  if (maxPrice) { queryText += ` AND price <= $${paramCount}`; params.push(parseFloat(maxPrice)); paramCount++; }
  if (minRating) { queryText += ` AND avg_rating >= $${paramCount}`; params.push(parseFloat(minRating)); paramCount++; }
  if (category && category !== "All") { queryText += ` AND category = $${paramCount}`; params.push(category); paramCount++; }
  if (brand) { queryText += ` AND brand = $${paramCount}`; params.push(brand); paramCount++; }
  if (search) {
    searchParamIndex = paramCount;
    queryText += ` AND search_vector @@ plainto_tsquery('english', $${paramCount})`;
    params.push(search);
    paramCount++;
  }

  // Count query
  const countText = queryText.replace("SELECT *", "SELECT COUNT(*)");
  const countRes = await db.query(countText, params);
  const total = parseInt(countRes.rows[0].count, 10);

  if (sort === "price_asc") queryText += " ORDER BY price ASC";
  else if (sort === "price_desc") queryText += " ORDER BY price DESC";
  else if (sort === "newest") queryText += " ORDER BY created_at DESC";
  else if (sort === "rating") queryText += " ORDER BY avg_rating DESC";
  else if (sort === "popular") queryText += " ORDER BY total_sold DESC";
  else if (searchParamIndex) queryText += ` ORDER BY ts_rank(search_vector, plainto_tsquery('english', $${searchParamIndex})) DESC`;
  else queryText += " ORDER BY created_at DESC";

  queryText += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const result = await db.query(queryText, params);
  return { products: result.rows, total };
};


exports.findById = async (id) => {
  const result = await db.query("SELECT * FROM products WHERE id = $1 AND is_active = true AND deleted_at IS NULL", [id]);
  return result.rows[0] || null;
};

exports.findRawById = async (id) => {
  const result = await db.query("SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL", [id]);
  return result.rows[0] || null;
};

exports.findCategories = async () => {
  const result = await db.query("SELECT DISTINCT category FROM products WHERE is_active = true AND deleted_at IS NULL");
  return result.rows;
};

exports.findBrands = async (category) => {
  const query = category && category !== "All"
    ? db.query("SELECT DISTINCT brand FROM products WHERE category = $1 AND is_active = true AND deleted_at IS NULL", [category])
    : db.query("SELECT DISTINCT brand FROM products WHERE is_active = true AND deleted_at IS NULL");
  const result = await query;
  return result.rows;
};

exports.findRelated = async (category, id) => {
  const result = await db.query(
    "SELECT * FROM products WHERE category = $1 AND id != $2 AND is_active = true AND deleted_at IS NULL ORDER BY avg_rating DESC LIMIT 8",
    [category, id]
  );
  return result.rows;
};

exports.findBySlug = async (slug) => {
  const result = await db.query(
    `SELECT p.*, v.store_name
       FROM products p
       LEFT JOIN vendors v ON p.seller_id = v.user_id
      WHERE p.slug = $1 AND p.is_active = true AND p.deleted_at IS NULL`,
    [slug]
  );
  return result.rows[0] || null;
};

exports.incrementViewCount = async (id) => {
  const result = await db.query("UPDATE products SET view_count = view_count + 1 WHERE id = $1 RETURNING *", [id]);
  return result.rows[0] || null;
};

exports.logInventory = async (productId, currentStock, note) => {
  return db.query(
    "INSERT INTO inventory_log (product_id, change_type, quantity_change, quantity_after, note) VALUES ($1, 'adjustment', 0, $2, $3)",
    [productId, currentStock, note]
  );
};

exports.search = async (q) => {
  const query = `
    SELECT *,
           ts_rank(search_vector, plainto_tsquery('english', $1)) AS ts_rank
      FROM products
     WHERE search_vector @@ plainto_tsquery('english', $1)
       AND is_active = true
       AND deleted_at IS NULL
     ORDER BY ts_rank DESC
  `;
  const result = await db.query(query, [q]);
  return result.rows;
};

exports.findTopSelling = async () => {
  const result = await db.query("SELECT * FROM products WHERE is_active = true AND deleted_at IS NULL ORDER BY total_sold DESC LIMIT 20");
  return result.rows;
};

exports.findFeatured = async () => {
  const result = await db.query("SELECT * FROM products WHERE is_featured = true AND is_active = true AND deleted_at IS NULL");
  return result.rows;
};

exports.create = async (productData) => {
  const query = `
    INSERT INTO products (
      name, price, original_price, category, brand, material, badge, img, images,
      description, stock, specs, colors, sizes, delivery_days, return_policy, slug, sku,
      short_description, meta_title, meta_description, tags, gender, age_group, is_featured,
      low_stock_threshold, warranty, weight_grams, video_url, seller_id, is_active
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,true
    ) RETURNING *
  `;
  const values = [
    productData.name, productData.price, productData.original_price, productData.category, productData.brand,
    productData.material, productData.badge, productData.img, productData.images, productData.description,
    productData.stock, productData.specs, productData.colors, productData.sizes, productData.delivery_days,
    productData.return_policy, productData.slug, productData.sku, productData.short_description,
    productData.meta_title, productData.meta_description, productData.tags, productData.gender, productData.age_group,
    productData.is_featured, productData.low_stock_threshold, productData.warranty, productData.weight_grams,
    productData.video_url, productData.seller_id
  ];
  const result = await db.query(query, values);
  return result.rows[0];
};

exports.createVariant = async (variantData) => {
  return db.query(
    "INSERT INTO product_variants (product_id, sku, color, size, price_modifier, stock, img, is_active) VALUES ($1,$2,$3,$4,0,$5,$6,true)",
    [variantData.productId, variantData.sku, variantData.color, variantData.size, variantData.stock, variantData.img]
  );
};

exports.update = async (id, updates) => {
  const keys = Object.keys(updates).filter(k => k !== "id" && k !== "created_at" && k !== "updated_at");
  if (keys.length === 0) return null;

  const setClause = keys.map((key, index) => `"${key}" = $${index + 2}`).join(", ");
  const values = keys.map(key => updates[key]);
  const queryText = `UPDATE products SET ${setClause}, updated_at = now() WHERE id = $1 RETURNING *`;
  const result = await db.query(queryText, [id, ...values]);
  return result.rows[0] || null;
};

exports.softDelete = async (id) => {
  const result = await softDelete("products", id);
  return result.rows[0] || null;
};
