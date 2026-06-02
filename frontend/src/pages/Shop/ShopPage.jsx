import { useState, useMemo, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import ProductCard from "../../components/ProductCard";
import { SkeletonGrid } from "../../components/SkeletonCard";
import { productAPI } from "../../services/api";
import localProducts from "../../data/product";

const SORT_OPTIONS = ["Featured", "Price: Low to High", "Price: High to Low", "Newest", "Top Rated", "Discount"];
const RATING_FILTERS = [4, 3, 2, 1];
const ITEMS_PER_PAGE = 12;

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-6">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full mb-3 group">
        <h3 className="text-[10px] tracking-[0.2em] uppercase text-[#111111] dark:text-white font-bold">{title}</h3>
        <svg className={`w-3.5 h-3.5 text-[#6B6B6B] transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="space-y-1">{children}</div>}
    </div>
  );
}

function Checkbox({ checked, onChange, label, count }) {
  return (
    <label className="flex items-center gap-3 py-1.5 cursor-pointer group select-none">
      <div className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-all flex-shrink-0 ${
        checked
          ? "bg-[#C9A84C] border-[#C9A84C]"
          : "border-[#E8E8E8] dark:border-white/10 bg-white dark:bg-transparent group-hover:border-[#C9A84C]/50"
      }`}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`text-sm flex-1 transition-colors ${
        checked ? "text-[#111111] dark:text-white font-medium" : "text-[#6B6B6B] dark:text-gray-400 group-hover:text-[#111111] dark:group-hover:text-white"
      }`}>{label}</span>
      {count !== undefined && <span className="text-[10px] text-[#6B6B6B]/50 dark:text-gray-500 font-medium">{count}</span>}
      <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
    </label>
  );
}

export default function ShopPage() {
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get("category") || "All";
  const initialSearch = searchParams.get("search") || "";
  const initialMinDiscount = parseInt(searchParams.get("minDiscount")) || 0;

  const [products, setProducts] = useState(localProducts);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const [category, setCategory] = useState(initialCat);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(60000);
  const [minRating, setMinRating] = useState(0);
  const [minDiscount, setMinDiscount] = useState(initialMinDiscount);
  const [sort, setSort] = useState("Featured");
  const [search, setSearch] = useState(initialSearch);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await productAPI.getAll("limit=100");
        if (res.success && res.products?.length > 0) {
          setProducts(res.products);
        }
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(() => fetchProducts(), 500);
    return () => clearTimeout(timer);
  }, []);

  const CATEGORIES = useMemo(() => ["All", ...new Set(products.map(p => p.category))], [products]);
  const BRANDS = useMemo(() => [...new Set(products.map(p => p.brand))], [products]);

  const toggleBrand = (b) => {
    setSelectedBrands(prev => prev.includes(b) ? prev.filter(v => v !== b) : [...prev, b]);
  };

  const getDiscount = (p) => p.originalPrice ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;

  const filtered = useMemo(() => {
    let res = products.filter(p => {
      if (category !== "All" && p.category !== category) return false;
      if (selectedBrands.length && !selectedBrands.includes(p.brand)) return false;
      if (p.price < priceMin || p.price > priceMax) return false;
      if (minRating && p.rating < minRating) return false;
      if (minDiscount && getDiscount(p) < minDiscount) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    if (sort === "Price: Low to High") res = [...res].sort((a, b) => a.price - b.price);
    else if (sort === "Price: High to Low") res = [...res].sort((a, b) => b.price - a.price);
    else if (sort === "Top Rated") res = [...res].sort((a, b) => b.rating - a.rating);
    else if (sort === "Newest") res = [...res].sort((a, b) => b.id - a.id);
    else if (sort === "Discount") res = [...res].sort((a, b) => getDiscount(b) - getDiscount(a));
    return res;
  }, [products, category, selectedBrands, priceMin, priceMax, minRating, minDiscount, sort, search]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [category, selectedBrands, priceMin, priceMax, minRating, minDiscount, sort, search]);

  const visibleProducts = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const activeFilterCount = [category !== "All", selectedBrands.length, minRating, minDiscount, search].filter(Boolean).length;

  const clearAll = () => {
    setCategory("All"); setSelectedBrands([]); setMinRating(0); setMinDiscount(0); setPriceMin(0); setPriceMax(60000); setSearch("");
  };

  return (
    <div className="min-h-screen relative">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 lg:hidden bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* Header */}
      <div className="bg-white dark:bg-[#0A0A0A] border-b border-[#E8E8E8] dark:border-white/5 py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] font-semibold mb-2">Browse</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[#111111] dark:text-white">The Collection</h1>
          <p className="text-[#6B6B6B] dark:text-gray-400 text-sm mt-2 font-medium">
            {loading ? "Loading products..." : `${filtered.length} products found`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex relative z-10">
        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-0 lg:top-[73px] z-40 lg:z-auto h-full lg:h-[calc(100vh-73px)] w-72 bg-white dark:bg-[#0A0A0A] lg:bg-transparent border-r border-[#E8E8E8] dark:border-white/5 lg:border-r-0 overflow-y-auto py-6 px-5 flex-shrink-0 transition-all duration-300 ${sidebarOpen ? "left-0" : "-left-72"} lg:left-auto lg:block`}>
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <h3 className="font-bold tracking-wide text-[#111111] dark:text-white">Filters</h3>
            <button onClick={() => setSidebarOpen(false)} className="text-[#6B6B6B] hover:text-[#C9A84C] text-lg font-bold">✕</button>
          </div>

          {/* Active filters summary */}
          {activeFilterCount > 0 && (
            <div className="mb-6 flex items-center justify-between">
              <span className="text-[10px] text-[#6B6B6B] font-medium">{activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active</span>
              <button onClick={clearAll} className="text-[10px] text-[#C9A84C] hover:underline font-bold">Clear All</button>
            </div>
          )}

          {/* Category */}
          <FilterSection title="Category">
            {CATEGORIES.map(c => (
              <Checkbox key={c} checked={category === c} onChange={() => { setCategory(c); setSidebarOpen(false); }}
                label={c} count={c === "All" ? products.length : products.filter(p => p.category === c).length} />
            ))}
          </FilterSection>

          {/* Brand */}
          <FilterSection title="Brand">
            {BRANDS.map(b => (
              <Checkbox key={b} checked={selectedBrands.includes(b)} onChange={() => toggleBrand(b)}
                label={b} count={products.filter(p => p.brand === b).length} />
            ))}
          </FilterSection>

          {/* Price Range Slider */}
          <FilterSection title="Price Range">
            <div className="px-1">
              <div className="flex items-center justify-between text-xs text-[#6B6B6B] dark:text-gray-400 mb-3 font-medium">
                <span>₹{priceMin.toLocaleString("en-IN")}</span>
                <span>₹{priceMax.toLocaleString("en-IN")}</span>
              </div>
              <input
                type="range"
                min={0}
                max={60000}
                step={1000}
                value={priceMax}
                onChange={e => setPriceMax(+e.target.value)}
                className="w-full h-1 bg-[#E8E8E8] dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-[#C9A84C]"
              />
            </div>
          </FilterSection>

          {/* Rating */}
          <FilterSection title="Customer Rating">
            {RATING_FILTERS.map(r => (
              <Checkbox key={r} checked={minRating === r} onChange={() => setMinRating(minRating === r ? 0 : r)}
                label={
                  <span className="flex items-center gap-1">
                    {r}
                    <svg className="w-3 h-3 text-[#C9A84C]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    &nbsp;& above
                  </span>
                }
                count={products.filter(p => p.rating >= r).length}
              />
            ))}
          </FilterSection>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-6 py-6 min-w-0">
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              {/* Mobile filter toggle */}
              <button
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 border border-[#E8E8E8] dark:border-white/5 rounded-xl text-xs tracking-widest uppercase font-bold text-[#111111] dark:text-white hover:border-[#C9A84C] transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 bg-[#C9A84C] text-white text-[10px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>

              {/* Search (desktop) */}
              <div className="hidden lg:block relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="pl-9 pr-4 py-2.5 border border-[#E8E8E8] dark:border-white/5 rounded-xl text-sm bg-white dark:bg-[#111111] text-[#111111] dark:text-white placeholder-[#6B6B6B]/50 focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/20 w-64 transition-all"
                />
              </div>
            </div>

            {/* Custom Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2 px-4 py-2.5 border border-[#E8E8E8] dark:border-white/5 rounded-xl text-sm text-[#111111] dark:text-white bg-white dark:bg-[#111111] hover:border-[#C9A84C] transition-colors font-medium min-w-[180px] justify-between"
              >
                <span className="text-xs">{sort}</span>
                <svg className={`w-3.5 h-3.5 text-[#6B6B6B] transition-transform ${sortOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-1 w-full bg-white dark:bg-[#111111] border border-[#E8E8E8] dark:border-white/5 rounded-xl shadow-luxury z-50 py-1 overflow-hidden">
                  {SORT_OPTIONS.map(o => (
                    <button
                      key={o}
                      onClick={() => { setSort(o); setSortOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                        sort === o
                          ? "text-[#C9A84C] font-bold bg-[#C9A84C]/5"
                          : "text-[#6B6B6B] hover:text-[#111111] dark:hover:text-white hover:bg-[#FAFAF8] dark:hover:bg-white/[0.02]"
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active filter pills */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {category !== "All" && <FilterPill label={category} onRemove={() => setCategory("All")} />}
              {selectedBrands.map(b => <FilterPill key={b} label={b} onRemove={() => toggleBrand(b)} />)}
              {minRating > 0 && <FilterPill label={`${minRating}★ & above`} onRemove={() => setMinRating(0)} />}
              {minDiscount > 0 && <FilterPill label={`${minDiscount}%+ off`} onRemove={() => setMinDiscount(0)} />}
              {search && <FilterPill label={`"${search}"`} onRemove={() => setSearch("")} />}
              <button onClick={clearAll} className="text-[10px] text-[#C9A84C] hover:underline px-2 font-bold">Clear All</button>
            </div>
          )}

          {/* Products Grid */}
          {loading ? (
            <SkeletonGrid count={8} />
          ) : filtered.length === 0 ? (
            /* Elegant empty state */
            <div className="text-center py-24">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#FAFAF8] dark:bg-white/[0.02] border border-[#E8E8E8] dark:border-white/5 flex items-center justify-center">
                <svg className="w-10 h-10 text-[#E8E8E8] dark:text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="font-display text-2xl font-bold text-[#111111] dark:text-white mb-2">No products found</h3>
              <p className="text-[#6B6B6B] dark:text-gray-400 text-sm mb-8 max-w-sm mx-auto">
                We couldn't find any products matching your filters. Try adjusting your search or filters.
              </p>
              <button
                onClick={clearAll}
                className="bg-[#C9A84C] hover:bg-[#B5963F] text-white px-8 py-3.5 rounded-full text-xs tracking-[0.2em] uppercase font-bold shadow-[0_4px_16px_rgba(201,168,76,0.25)] hover:shadow-[0_8px_28px_rgba(201,168,76,0.35)] transition-all duration-300"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <>
              {/* 4-col desktop, 2-col tablet, 1-col mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {visibleProducts.map(p => <ProductCard key={p.id} product={p} />)}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center mt-12">
                  <button
                    onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                    className="bg-[#C9A84C] hover:bg-[#B5963F] text-white px-10 py-3.5 rounded-full text-xs tracking-[0.2em] uppercase font-bold shadow-[0_4px_16px_rgba(201,168,76,0.25)] hover:shadow-[0_8px_28px_rgba(201,168,76,0.35)] hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
                  >
                    Load More Products
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function FilterPill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-white dark:bg-[#111111] border border-[#E8E8E8] dark:border-white/5 rounded-full px-3 py-1.5 text-xs text-[#111111] dark:text-white shadow-sm font-medium">
      {label}
      <button onClick={onRemove} className="text-[#6B6B6B] hover:text-red-500 font-bold text-xs ml-0.5">×</button>
    </span>
  );
}

function ListProductCard({ product }) {
  const formatPrice = (p) => `₹${p.toLocaleString("en-IN")}`;
  const discount = product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
  return (
    <a href={`/product/${product.id}`} className="flex gap-6 border border-[#E8E8E8] dark:border-white/5 rounded-2xl bg-white dark:bg-[#111111] p-4 hover:border-[#C9A84C]/35 hover:shadow-card shadow-sm group transition-all duration-300">
      <div className="w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-[#FAFAF8] dark:bg-white/[0.02]">
        <img src={product.img} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#6B6B6B] text-[10px] tracking-widest uppercase font-semibold">{product.brand} · {product.category}</p>
        <h3 className="font-semibold text-[#111111] dark:text-white group-hover:text-[#C9A84C] transition-colors mt-0.5 line-clamp-1">{product.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="flex items-center gap-0.5 bg-green-500/10 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded text-xs font-bold">{product.rating} ★</span>
          <span className="text-[#6B6B6B] text-xs font-medium">{product.numReviews || 0} reviews</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[#C9A84C] font-bold text-lg">{formatPrice(product.price)}</span>
          {product.originalPrice && <span className="text-[#6B6B6B]/40 text-sm line-through">{formatPrice(product.originalPrice)}</span>}
          {discount > 0 && <span className="text-green-600 text-xs font-bold">{discount}% off</span>}
        </div>
        <p className="text-[#6B6B6B] text-xs mt-1 line-clamp-1 font-medium">{product.description}</p>
      </div>
    </a>
  );
}
