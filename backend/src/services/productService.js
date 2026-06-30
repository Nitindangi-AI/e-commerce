const productRepository = require("../repositories/productRepository");
const { NotFoundError, ForbiddenError, BadRequestError } = require("../middleware/errors");

exports.getProducts = async (query) => {
  const { gender, badge, stock_status, is_featured, minPrice, maxPrice, minRating, sort, page = 1, limit = 24, search, category, brand } = query;
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);
  const offset = (parsedPage - 1) * parsedLimit;

  const { products, total } = await productRepository.findAll({
    gender, badge, stock_status, is_featured, minPrice, maxPrice, minRating, sort, search, category, brand
  }, parsedLimit, offset);

  return {
    data: products,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit)
    }
  };
};

exports.getProduct = async (id) => {
  const product = await productRepository.findById(id);
  if (!product) throw new NotFoundError("Product not found");
  return product;
};

exports.getCategories = async () => {
  const rows = await productRepository.findCategories();
  return rows.map(r => ({ name: r.category }));
};

exports.getBrands = async (category) => {
  const rows = await productRepository.findBrands(category);
  return rows.map(r => ({ name: r.brand }));
};

exports.getRelatedProducts = async (id) => {
  const product = await productRepository.findRawById(id);
  if (!product) throw new NotFoundError("Product not found");
  return productRepository.findRelated(product.category, id);
};

exports.getProductBySlug = async (slug) => {
  const product = await productRepository.findBySlug(slug);
  if (!product) throw new NotFoundError("Product not found");
  return product;
};

exports.recordView = async (id) => {
  const product = await productRepository.findRawById(id);
  if (!product) throw new NotFoundError("Product not found");

  await productRepository.logInventory(id, product.stock, "Product view recorded");
  return productRepository.incrementViewCount(id);
};

exports.searchProducts = async (q) => {
  if (!q) throw new BadRequestError("Search query required");
  return productRepository.search(q);
};

exports.getTopSelling = async () => {
  return productRepository.findTopSelling();
};

exports.getFeatured = async () => {
  return productRepository.findFeatured();
};

exports.createProduct = async (sellerId, productData) => {
  const {
    name, price, original_price, category, brand, material, badge, img, images,
    description, stock, specs, colors = [], sizes = [], delivery_days, return_policy,
    slug, sku, short_description, meta_title, meta_description, tags, gender,
    age_group, is_featured, low_stock_threshold, warranty, weight_grams, video_url,
  } = productData;

  let productSlug = slug;
  if (!productSlug) {
    productSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).substring(2, 8);
  }

  const product = await productRepository.create({
    name, price, original_price, category, brand, material, badge, img, images,
    description, stock, specs: specs || {}, colors, sizes, delivery_days: delivery_days || 3,
    return_policy: return_policy || {}, slug: productSlug, sku: sku || ("SKU-" + Math.random().toString(36).substring(2, 10).toUpperCase()),
    short_description, meta_title, meta_description, tags: tags || [], gender, age_group,
    is_featured: is_featured || false, low_stock_threshold: low_stock_threshold || 5, warranty,
    weight_grams: weight_grams || 0, video_url, seller_id: sellerId
  });

  if (colors.length > 0 && sizes.length > 0) {
    for (const color of colors) {
      for (const size of sizes) {
        const variantSku = `VAR-${product.id.substring(0, 4).toUpperCase()}-${color.substring(0, 2).toUpperCase()}-${size.substring(0, 2).toUpperCase()}`;
        await productRepository.createVariant({
          productId: product.id,
          sku: variantSku,
          color,
          size,
          stock: Math.floor(stock / (colors.length * sizes.length)) || 0,
          img
        });
      }
    }
  }

  return product;
};

exports.updateProduct = async (id, sellerId, userRole, updates) => {
  const checkRes = await productRepository.findRawById(id);
  if (!checkRes) throw new NotFoundError("Product not found");

  if (userRole !== "admin" && checkRes.seller_id !== sellerId) {
    throw new ForbiddenError("Not authorized to update this product");
  }

  const updated = await productRepository.update(id, updates);
  if (!updated) throw new NotFoundError("Product not found");

  return updated;
};

exports.deleteProduct = async (id, sellerId, userRole) => {
  const checkRes = await productRepository.findRawById(id);
  if (!checkRes) throw new NotFoundError("Product not found");

  if (userRole !== "admin" && checkRes.seller_id !== sellerId) {
    throw new ForbiddenError("Not authorized to delete this product");
  }

  const deleted = await productRepository.softDelete(id);
  if (!deleted) throw new NotFoundError("Product not found");

  return deleted;
};
