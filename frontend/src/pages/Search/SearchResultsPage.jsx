import { useState, useMemo, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { productAPI } from "../../services/api";
import ProductCard from "../../components/ProductCard";
import { SkeletonGrid } from "../../components/SkeletonCard";
import { useSearchStore } from "../../store/useSearchStore";
import localProducts from "../../data/product";
import { toast } from "../../components/GlobalToast";

const BRANDS = ["Meridian", "Obsidian", "Trendz", "Citizen", "Seiko", "Titan", "Casio", "Tommy Hilfiger", "Fossil", "Daniel Wellington", "Nike", "Adidas", "Puma"];
const GENDERS = ["Men", "Women", "Kids", "Unisex"];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11", "38", "40", "42", "44"];
const RATINGS = [4, 3, 2];
const SORT_OPTIONS = ["Relevance", "Price: Low to High", "Price: High to Low", "Top Rated", "Newest"];

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const currentCategory = searchParams.get("category") || "";
  const currentBrand = searchParams.get("brand") || "";
  const currentMinPrice = searchParams.get("minPrice") || "";
  const currentMaxPrice = searchParams.get("maxPrice") || "";
  const currentGender = searchParams.get("gender") || "";
  const currentSize = searchParams.get("size") || "";
  const currentRating = searchParams.get("minRating") || "";
  const currentSort = searchParams.get("sort") || "Relevance";

  const [searchTerm, setSearchTerm] = useState(query);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const [priceMinInput, setPriceMinInput] = useState(currentMinPrice);
  const [priceMaxInput, setPriceMaxInput] = useState(currentMaxPrice);

  const logSearch = useSearchStore(state => state.logSearch);

  // Sync inputs on url param change
  useEffect(() => {
    setSearchTerm(query);
    setPriceMinInput(currentMinPrice);
    setPriceMaxInput(currentMaxPrice);
  }, [query, currentMinPrice, currentMaxPrice]);

  // Debounced search term (300ms)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim() && searchTerm.trim() !== query) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("q", searchTerm.trim());
        setSearchParams(nextParams);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Fetch search results & categories
  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const catRes = await productAPI.getCategories();
        if (catRes.success) setCategories(catRes.categories || []);

        if (query.trim()) {
          const res = await productAPI.search(query);
          if (res.success) {
            setProducts(res.products || []);
            logSearch(query.trim());
          }
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load search results.");
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [query]);

  // Helper to update specific param
  const updateParam = (key, value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
    setSearchParams(nextParams);
  };

  const handlePriceApply = (e) => {
    e.preventDefault();
    const nextParams = new URLSearchParams(searchParams);
    if (priceMinInput) nextParams.set("minPrice", priceMinInput);
    else nextParams.delete("minPrice");
    if (priceMaxInput) nextParams.set("maxPrice", priceMaxInput);
    else nextParams.delete("maxPrice");
    setSearchParams(nextParams);
  };

  const clearFilters = () => {
    setSearchParams({ q: query });
  };

  // Local filtering based on ShopPage sidebar filters
  const filtered = useMemo(() => {
    let res = products;

    if (currentCategory) {
      res = res.filter(p => p.category?.toLowerCase() === currentCategory.toLowerCase());
    }
    if (currentBrand) {
      res = res.filter(p => p.brand?.toLowerCase() === currentBrand.toLowerCase());
    }
    if (currentMinPrice) {
      res = res.filter(p => p.price >= parseFloat(currentMinPrice));
    }
    if (currentMaxPrice) {
      res = res.filter(p => p.price <= parseFloat(currentMaxPrice));
    }
    if (currentGender) {
      res = res.filter(p => p.gender?.toLowerCase() === currentGender.toLowerCase() || p.specs?.gender?.toLowerCase() === currentGender.toLowerCase());
    }
    if (currentSize) {
      res = res.filter(p => p.sizes?.includes(currentSize));
    }
    if (currentRating) {
      res = res.filter(p => p.rating >= parseFloat(currentRating));
    }

    // Sort options
    if (currentSort === "Price: Low to High") {
      res = [...res].sort((a, b) => a.price - b.price);
    } else if (currentSort === "Price: High to Low") {
      res = [...res].sort((a, b) => b.price - a.price);
    } else if (currentSort === "Top Rated") {
      res = [...res].sort((a, b) => b.rating - a.rating);
    } else if (currentSort === "Newest") {
      res = [...res].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return res;
  }, [products, currentCategory, currentBrand, currentMinPrice, currentMaxPrice, currentGender, currentSize, currentRating, currentSort]);

  // "Did you mean" suggestion helper
  const suggestion = useMemo(() => {
    if (filtered.length >= 3 || !query.trim()) return null;
    const popularWords = ["Watches", "Shirts", "Footwear", "Grooming", "Accessories", "Apparel", "Men", "Women"];
    const match = popularWords.find(w => 
      w.toLowerCase().startsWith(query.toLowerCase().slice(0, 2)) || 
      query.toLowerCase().includes(w.toLowerCase()) || 
      w.toLowerCase().includes(query.toLowerCase())
    );
    return match && match.toLowerCase() !== query.toLowerCase() ? match : null;
  }, [filtered, query]);

  const activeFilterCount = [currentCategory, currentBrand, currentMinPrice, currentMaxPrice, currentGender, currentSize, currentRating].filter(Boolean).length;

  return (
    <div className="bg-[#FAFAF8] dark:bg-[#0A0A0A] min-h-screen pt-20">
      {sidebarOpen && <div className="fixed inset-0 z-40 lg:hidden bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* Header */}
      <div className="bg-white dark:bg-[#111111]/30 border-b border-[#E8E8E8] dark:border-white/5 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] font-semibold mb-2">Search Results</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-[#111111] dark:text-white">"{query}"</h1>
            <p className="text-xs text-[#6B6B6B] dark:text-gray-400 mt-1">{filtered.length} products found</p>
          </div>
          <div className="w-full md:max-w-xs">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search premium collections..."
              className="w-full px-4 py-2.5 rounded-xl text-xs bg-[#FAFAF8] dark:bg-[#151515] border border-[#E8E8E8] dark:border-white/5 text-[#111111] dark:text-white placeholder-[#6B6B6B]/60 focus:outline-none focus:border-[#C9A84C] transition-all"
            />
          </div>
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
                    checked={currentCategory.toLowerCase() === cat.toLowerCase()}
                    onChange={() => updateParam("category", currentCategory.toLowerCase() === cat.toLowerCase() ? "" : cat)}
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
              {BRANDS.map(br => (
                <label key={br} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={currentBrand.toLowerCase() === br.toLowerCase()}
                    onChange={() => updateParam("brand", currentBrand.toLowerCase() === br.toLowerCase() ? "" : br)}
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

              <input
                type="range"
                min="0"
                max="50000"
                step="500"
                value={priceMaxInput || "50000"}
                onChange={e => {
                  setPriceMaxInput(e.target.value);
                  const nextParams = new URLSearchParams(searchParams);
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
                    <span className="text-[11px] text-[#6B6B6B] dark:text-gray-400 font-medium ml-1">& up</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Results grid */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-[#6B6B6B] dark:text-gray-400 font-medium">
              Showing {filtered.length} products
            </p>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2 px-4 py-2 border border-[#E8E8E8] dark:border-white/5 rounded-xl text-xs text-[#111111] dark:text-white bg-white dark:bg-[#111111] hover:border-[#C9A84C] transition-colors font-semibold min-w-[170px] justify-between"
              >
                <span>{currentSort}</span>
                <svg className={`w-3 h-3 text-[#6B6B6B] transition-transform ${sortOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-1 w-full bg-white dark:bg-[#111111] border border-[#E8E8E8] dark:border-white/5 rounded-xl shadow-luxury z-50 py-1 overflow-hidden">
                  {SORT_OPTIONS.map(o => (
                    <button
                      key={o}
                      onClick={() => { updateParam("sort", o); setSortOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                        currentSort === o
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

          {/* Did you mean suggestion strip */}
          {suggestion && (
            <div className="mb-6 p-4 bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] text-xs font-semibold rounded-2xl flex items-center gap-2">
              <span>💡</span>
              Did you mean{" "}
              <Link to={`/search?q=${encodeURIComponent(suggestion)}`} className="underline font-bold hover:text-[#B5963F]">
                {suggestion}
              </Link>?
            </div>
          )}

          {/* Results cards */}
          {loading ? (
            <SkeletonGrid count={8} />
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-[#111111]/40 border border-[#E8E8E8] dark:border-white/5 rounded-2xl p-8 max-w-xl mx-auto shadow-sm">
              <span className="text-4xl block mb-4">🔍</span>
              <p className="text-[#111111] dark:text-white text-base font-bold mb-1">No matches found for "{query}"</p>
              <p className="text-[#6B6B6B] dark:text-gray-400 text-xs mb-6">Double check your spelling or search for popular categories.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["Watches", "Footwear", "Apparel", "Eyewear", "Accessories"].map(cat => (
                  <Link
                    key={cat}
                    to={`/search?q=${cat}`}
                    className="px-4 py-2 bg-white dark:bg-[#111111] border border-[#E8E8E8] dark:border-white/10 hover:border-[#C9A84C] text-xs text-[#6B6B6B] dark:text-gray-400 rounded-full font-bold transition-all"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
