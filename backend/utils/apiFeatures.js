/**
 * API Features — chainable query builder for search, filter, sort, paginate
 */
class ApiFeatures {
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = queryStr;
  }

  // Text search on name/description/brand
  search() {
    if (this.queryStr.search) {
      const regex = new RegExp(this.queryStr.search, "i");
      this.query = this.query.find({
        $or: [
          { name: regex },
          { description: regex },
          { brand: regex },
          { category: regex },
        ],
      });
    }
    return this;
  }

  // Field-level filtering
  filter() {
    const queryCopy = { ...this.queryStr };

    // Remove fields used for other features
    const removeFields = ["search", "sort", "page", "limit", "fields"];
    removeFields.forEach((key) => delete queryCopy[key]);

    // Category filter
    if (queryCopy.category && queryCopy.category !== "All") {
      this.query = this.query.find({ category: queryCopy.category });
    }
    delete queryCopy.category;

    // Brand filter (comma separated)
    if (queryCopy.brand) {
      const brands = queryCopy.brand.split(",");
      this.query = this.query.find({ brand: { $in: brands } });
    }
    delete queryCopy.brand;

    // Material filter (comma separated)
    if (queryCopy.material) {
      const materials = queryCopy.material.split(",");
      this.query = this.query.find({ material: { $in: materials } });
    }
    delete queryCopy.material;

    // Price range
    if (queryCopy.minPrice || queryCopy.maxPrice) {
      const priceFilter = {};
      if (queryCopy.minPrice) priceFilter.$gte = Number(queryCopy.minPrice);
      if (queryCopy.maxPrice) priceFilter.$lte = Number(queryCopy.maxPrice);
      this.query = this.query.find({ price: priceFilter });
    }
    delete queryCopy.minPrice;
    delete queryCopy.maxPrice;

    // Min rating
    if (queryCopy.minRating) {
      this.query = this.query.find({
        rating: { $gte: Number(queryCopy.minRating) },
      });
    }
    delete queryCopy.minRating;

    // In stock only
    if (queryCopy.inStock === "true") {
      this.query = this.query.find({ stock: { $gt: 0 } });
    }
    delete queryCopy.inStock;

    // Min discount (needs aggregation-like logic, handled via post-filter or virtual)
    // We handle this at the controller level since discount is a virtual
    delete queryCopy.minDiscount;

    return this;
  }

  // Sorting
  sort() {
    if (this.queryStr.sort) {
      const sortMap = {
        price_asc: { price: 1 },
        price_desc: { price: -1 },
        rating: { rating: -1 },
        newest: { createdAt: -1 },
        name_asc: { name: 1 },
        name_desc: { name: -1 },
      };
      const sortOption = sortMap[this.queryStr.sort] || { createdAt: -1 };
      this.query = this.query.sort(sortOption);
    } else {
      this.query = this.query.sort({ createdAt: -1 });
    }
    return this;
  }

  // Pagination
  paginate() {
    const page = parseInt(this.queryStr.page) || 1;
    const limit = parseInt(this.queryStr.limit) || 20;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    this.page = page;
    this.limit = limit;

    return this;
  }
}

module.exports = ApiFeatures;
