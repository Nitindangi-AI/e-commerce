import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ProductCard from "../../components/ProductCard";
import { SkeletonGrid } from "../../components/SkeletonCard";
import { productAPI } from "../../services/api";
import { toast } from "../../components/GlobalToast";

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Top Rated", value: "rating" },
  { label: "Most Popular", value: "popular" }
];

const GENDERS = ["Men", "Women", "Kids", "Unisex"];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const RATINGS = [5, 4, 3, 2, 1];

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // SEO helpers (computed before any early return)
  const seoCategory = searchParams.get("category") || "";
  const seoTitle = seoCategory ? `${seoCategory} | Trendy` : "Shop All Products | Trendy";
  const seoDescription = seoCategory
    ? `Shop ${seoCategory} on Trendy.`
    : "Shop all products on Trendy — premium fashion, accessories, watches, footwear & more.";

  // Read URL query params
  const currentPage = parseInt(searchParams.get("page")) || 1;
  const currentCategory = searchParams.get("category") || "";
  const currentBrand = searchParams.get("brand") || "";
  const currentMinPrice = searchParams.get("minPrice") || "";
  const currentMaxPrice = searchParams.get("maxPrice") || "";
  const currentGender = searchParams.get("gender") || "";
  const currentSize = searchParams.get("size") || "";
  const currentRating = searchParams.get("minRating") || "";
  const currentSort = searchParams.get("sort") || "newest";
  const currentSearch = searchParams.get("search") || "";

  // Component states
  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [priceMinInput, setPriceMinInput] = useState(currentMinPrice);
  const [priceMaxInput, setPriceMaxInput] = useState(currentMaxPrice);
  const [sortOpen, setSortOpen] = useState(false);

  // Sync inputs with URL changes
  useEffect(() => {
    setPriceMinInput(currentMinPrice);
    setPriceMaxInput(currentMaxPrice);
  }, [currentMinPrice, currentMaxPrice]);

  // Load categories and brands on mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          productAPI.getCategories(),
          productAPI.getBrands()
        ]);
        if (catRes.success) setCategories(catRes.categories || []);
        if (brandRes.success) setBrands(brandRes.brands || []);
      } catch (err) {
        console.error("Failed to load filter options:", err);
        toast.error("Failed to load filter options.");
      }
    };
    loadFilters();
  }, []);

  // Fetch products when query parameters change
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // Construct query string for backend API
        const qParams = new URLSearchParams();
        qParams.set("page", currentPage);
        qParams.set("limit", 24);
        if (currentCategory) qParams.set("category", currentCategory);
        if (currentBrand) qParams.set("brand", currentBrand);
        if (currentMinPrice) qParams.set("minPrice", currentMinPrice);
        if (currentMaxPrice) qParams.set("maxPrice", currentMaxPrice);
        if (currentGender) qParams.set("gender", currentGender);
        if (currentRating) qParams.set("minRating", currentRating);
        if (currentSort) qParams.set("sort", currentSort);
        if (currentSearch) qParams.set("search", currentSearch);

        const res = await productAPI.getAll(qParams.toString());
        if (res.success) {
          let filteredList = res.products || [];
          
          // Client-side size filter since it's not handled on the server
          if (currentSize) {
            filteredList = filteredList.filter(p => p.sizes?.includes(currentSize));
          }

          setProducts(filteredList);
          setTotalProducts(res.total);
          setTotalPages(res.pages);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
        toast.error("Failed to load products.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [
    currentPage,
    currentCategory,
    currentBrand,
    currentMinPrice,
    currentMaxPrice,
    currentGender,
    currentSize,
    currentRating,
    currentSort,
    currentSearch
  ]);

  // Helper to update specific param
  const updateParam = (key, value) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", "1"); // Reset to page 1 on filter change
    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
    setSearchParams(nextParams);
  };

  const clearAllFilters = () => {
    setSearchParams({});
  };

  const handlePriceApply = (e) => {
    e.preventDefault();
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", "1");
    if (priceMinInput) nextParams.set("minPrice", priceMinInput);
    else nextParams.delete("minPrice");
    if (priceMaxInput) nextParams.set("maxPrice", priceMaxInput);
    else nextParams.delete("maxPrice");
    setSearchParams(nextParams);
  };

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === currentSort)?.label || "Newest";

  // Showing range calculations
  const showingFrom = totalProducts === 0 ? 0 : (currentPage - 1) * 24 + 1;
  const showingTo = Math.min(currentPage * 24, totalProducts);

  return (
    <div className="bg-[#FAFAF8] dark:bg-[#0A0A0A] min-h-screen pt-20">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="website" />
      </Helmet>
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#111111]/30 border-b border-[#E8E8E8] dark:border-white/5 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] font-semibold mb-2">Browse</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-[#111111] dark:text-white" style={{ fontFamily: "'Playfair Display', serif" }}>The Collection</h1>
          </div>
          {currentSearch && (
            <div className="text-sm text-[#6B6B6B] dark:text-gray-400 font-medium">
              Search results for: <span className="text-[#C9A84C] font-bold">"{currentSearch}"</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
          {/* Category Filter */}
          <div className="bg-white dark:bg-[#111111]/40 border border-[#E8E8E8] dark:border-white/5 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-white mb-4">Category</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={currentCategory === ""}
                  onChange={() => updateParam("category", "")}
                  className="w-4 h-4 rounded border-gray-300 text-[#C9A84C] focus:ring-[#C9A84C] accent-[#C9A84C]"
                />
                <span className="text-sm font-medium text-[#6B6B6B] dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">All Categories</span>
              </label>
              {categories.map(cat => (
                <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={currentCategory === cat}
                    onChange={() => updateParam("category", currentCategory === cat ? "" : cat)}
                    className="w-4 h-4 rounded border-gray-300 text-[#C9A84C] focus:ring-[#C9A84C] accent-[#C9A84C]"
                  />
                  <span className="text-sm font-medium text-[#6B6B6B] dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors capitalize">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Brand Filter */}
          <div className="bg-white dark:bg-[#111111]/40 border border-[#E8E8E8] dark:border-white/5 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-white mb-4">Brand</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin pr-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={currentBrand === ""}
                  onChange={() => updateParam("brand", "")}
                  className="w-4 h-4 rounded border-gray-300 text-[#C9A84C] focus:ring-[#C9A84C] accent-[#C9A84C]"
                />
                <span className="text-sm font-medium text-[#6B6B6B] dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">All Brands</span>
              </label>
              {brands.map(br => (
                <label key={br} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={currentBrand === br}
                    onChange={() => updateParam("brand", currentBrand === br ? "" : br)}
                    className="w-4 h-4 rounded border-gray-300 text-[#C9A84C] focus:ring-[#C9A84C] accent-[#C9A84C]"
                  />
                  <span className="text-sm font-medium text-[#6B6B6B] dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">{br}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range Slider / Inputs */}
          <div className="bg-white dark:bg-[#111111]/40 border border-[#E8E8E8] dark:border-white/5 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-white mb-4">Price Range</h3>
            <form onSubmit={handlePriceApply} className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[9px] uppercase tracking-wider text-[#6B6B6B] font-bold block mb-1">Min (₹)</label>
                  <input
                    type="number"
                    value={priceMinInput}
                    onChange={e => setPriceMinInput(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#FAFAF8] dark:bg-[#151515] border border-[#E8E8E8] dark:border-white/5 rounded-lg p-2 text-xs text-[#111111] dark:text-white focus:outline-none focus:border-[#C9A84C]"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[9px] uppercase tracking-wider text-[#6B6B6B] font-bold block mb-1">Max (₹)</label>
                  <input
                    type="number"
                    value={priceMaxInput}
                    onChange={e => setPriceMaxInput(e.target.value)}
                    placeholder="50000"
                    className="w-full bg-[#FAFAF8] dark:bg-[#151515] border border-[#E8E8E8] dark:border-white/5 rounded-lg p-2 text-xs text-[#111111] dark:text-white focus:outline-none focus:border-[#C9A84C]"
                  />
                </div>
              </div>

              {/* Slider for priceMax */}
              <input
                type="range"
                min="0"
                max="50000"
                step="500"
                value={priceMaxInput || "50000"}
                onChange={e => {
                  setPriceMaxInput(e.target.value);
                  const nextParams = new URLSearchParams(searchParams);
                  nextParams.set("page", "1");
                  nextParams.set("maxPrice", e.target.value);
                  setSearchParams(nextParams);
                }}
                className="w-full h-1 bg-[#E8E8E8] dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-[#C9A84C]"
              />

              <button
                type="submit"
                className="w-full py-2 bg-[#0A0A0A] hover:bg-[#222] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black rounded-lg text-[10px] font-bold tracking-widest uppercase transition-colors"
              >
                Apply Price
              </button>
            </form>
          </div>

          {/* Gender Filter */}
          <div className="bg-white dark:bg-[#111111]/40 border border-[#E8E8E8] dark:border-white/5 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-white mb-4">Gender</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={currentGender === ""}
                  onChange={() => updateParam("gender", "")}
                  className="w-4 h-4 rounded border-gray-300 text-[#C9A84C] focus:ring-[#C9A84C] accent-[#C9A84C]"
                />
                <span className="text-sm font-medium text-[#6B6B6B] dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">All</span>
              </label>
              {GENDERS.map(g => (
                <label key={g} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={currentGender.toLowerCase() === g.toLowerCase()}
                    onChange={() => updateParam("gender", currentGender.toLowerCase() === g.toLowerCase() ? "" : g.toLowerCase())}
                    className="w-4 h-4 rounded border-gray-300 text-[#C9A84C] focus:ring-[#C9A84C] accent-[#C9A84C]"
                  />
                  <span className="text-sm font-medium text-[#6B6B6B] dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">{g}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Size Filter */}
          <div className="bg-white dark:bg-[#111111]/40 border border-[#E8E8E8] dark:border-white/5 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-white mb-4">Size</h3>
            <div className="flex flex-wrap gap-2">
              {SIZES.map(s => {
                const isSelected = currentSize === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateParam("size", isSelected ? "" : s)}
                    className={`w-10 h-10 rounded-lg text-xs font-bold border flex items-center justify-center transition-all ${
                      isSelected 
                        ? "bg-[#C9A84C] text-white border-[#C9A84C] shadow-sm"
                        : "border-[#E8E8E8] dark:border-white/10 text-[#6B6B6B] dark:text-gray-400 hover:border-[#C9A84C] bg-white dark:bg-[#111111]"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rating Filter */}
          <div className="bg-white dark:bg-[#111111]/40 border border-[#E8E8E8] dark:border-white/5 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-white mb-4">Customer Rating</h3>
            <div className="space-y-1">
              {RATINGS.map(r => {
                const isSelected = currentRating === r.toString();
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => updateParam("minRating", isSelected ? "" : r.toString())}
                    className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left text-xs transition-all ${
                      isSelected 
                        ? "bg-[#C9A84C]/10 text-[#C9A84C] font-bold"
                        : "text-[#6B6B6B] dark:text-gray-400 hover:bg-[#FAFAF8] dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center text-[#C9A84C]">
                      {"★".repeat(r)}{"☆".repeat(5 - r)}
                    </span>
                    <span className="font-semibold">{r} & Up</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {/* Top Bar Sort and Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#E8E8E8] dark:border-white/5 pb-6">
            <div className="text-sm font-semibold text-[#111111] dark:text-white">
              Showing {showingFrom}–{showingTo} of {totalProducts} products
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2 px-4 py-2.5 border border-[#E8E8E8] dark:border-white/5 rounded-xl text-xs text-[#111111] dark:text-white bg-white dark:bg-[#111111] hover:border-[#C9A84C] transition-colors font-bold tracking-wider uppercase min-w-[180px] justify-between shadow-sm"
              >
                <span>{currentSortLabel}</span>
                <svg className={`w-3.5 h-3.5 text-[#6B6B6B] transition-transform duration-200 ${sortOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-1 w-full bg-white dark:bg-[#111111] border border-[#E8E8E8] dark:border-white/5 rounded-xl shadow-luxury z-50 py-1 overflow-hidden animate-fade-in">
                  {SORT_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => { updateParam("sort", o.value); setSortOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                        currentSort === o.value
                          ? "text-[#C9A84C] font-bold bg-[#C9A84C]/5"
                          : "text-[#6B6B6B] hover:text-[#111111] dark:hover:text-white hover:bg-[#FAFAF8] dark:hover:bg-white/[0.02]"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Products Grid or Skeleton Loaders */}
          {loading ? (
            <SkeletonGrid count={24} />
          ) : products.length === 0 ? (
            /* Elegant empty state */
            <div className="text-center py-24 bg-white dark:bg-[#111111]/30 border border-[#E8E8E8] dark:border-white/5 rounded-3xl p-8 shadow-sm">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#FAFAF8] dark:bg-white/[0.02] border border-[#E8E8E8] dark:border-white/5 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="font-display text-2xl font-bold text-[#111111] dark:text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>No products matched your filters</h3>
              <p className="text-[#6B6B6B] dark:text-gray-400 text-sm mb-8 max-w-sm mx-auto font-medium">
                Try widening your price range, choosing a different category, or clearing active filters.
              </p>
              <button
                onClick={clearAllFilters}
                className="bg-[#C9A84C] hover:bg-[#B5963F] text-white px-8 py-3.5 rounded-full text-xs tracking-[0.2em] uppercase font-bold shadow-md shadow-[#C9A84C]/10 transition-all duration-300"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-12">
              {/* 3-col Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-6 border-t border-[#E8E8E8] dark:border-white/5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => updateParam("page", (currentPage - 1).toString())}
                    className="px-4 py-2 border border-[#E8E8E8] dark:border-white/10 rounded-lg text-xs font-bold uppercase tracking-widest text-[#6B6B6B] hover:border-[#C9A84C] hover:text-[#C9A84C] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    Prev
                  </button>

                  <div className="flex gap-1.5">
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pNum = idx + 1;
                      const isCurrent = pNum === currentPage;
                      return (
                        <button
                          key={pNum}
                          onClick={() => updateParam("page", pNum.toString())}
                          className={`w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center border transition-all ${
                            isCurrent 
                              ? "bg-[#C9A84C] text-white border-[#C9A84C] shadow-sm"
                              : "border-[#E8E8E8] dark:border-white/10 text-[#6B6B6B] dark:text-gray-400 hover:border-[#C9A84C]"
                          }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => updateParam("page", (currentPage + 1).toString())}
                    className="px-4 py-2 border border-[#E8E8E8] dark:border-white/10 rounded-lg text-xs font-bold uppercase tracking-widest text-[#6B6B6B] hover:border-[#C9A84C] hover:text-[#C9A84C] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
