import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../../components/ProductCard";
import { productAPI } from "../../services/api";
import localProducts from "../../data/product";

const SORT_OPTIONS = ["Featured", "Price: Low to High", "Price: High to Low", "Newest", "Top Rated", "Discount"];
const RATING_FILTERS = [4, 3, 2, 1];
const DISCOUNT_FILTERS = [
  { label: "50% or more", min: 50 },
  { label: "30% or more", min: 30 },
  { label: "20% or more", min: 20 },
  { label: "10% or more", min: 10 },
];
const PRICE_RANGES = [
  { label: "Under ₹10,000", min: 0, max: 10000 },
  { label: "₹10,000 - ₹20,000", min: 10000, max: 20000 },
  { label: "₹20,000 - ₹35,000", min: 20000, max: 35000 },
  { label: "₹35,000 - ₹50,000", min: 35000, max: 50000 },
  { label: "Above ₹50,000", min: 50000, max: Infinity },
];

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-6">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full mb-3">
        <h3 className="text-xs tracking-[0.2em] uppercase text-[#2b2721]/70 font-extrabold">{title}</h3>
        <svg className={`w-4 h-4 text-[#2b2721]/50 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && children}
    </div>
  );
}

function Checkbox({ checked, onChange, label, count }) {
  return (
    <label className="flex items-center gap-3 py-1.5 cursor-pointer group select-none">
      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0 ${checked ? "gold-bg border-transparent" : "border-white/30 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] group-hover:border-[#d4af37]/45"}`}>
        {checked && <svg className="w-2.5 h-2.5 text-white font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className={`text-sm flex-1 transition-colors ${checked ? "text-[var(--text-primary)] font-bold" : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]/85"}`}>{label}</span>
      {count !== undefined && <span className="text-xs text-[var(--text-secondary)]/50 font-semibold">{count}</span>}
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
  const [loading, setLoading] = useState(false);

  const [category, setCategory] = useState(initialCat);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState(null);
  const [minRating, setMinRating] = useState(0);
  const [minDiscount, setMinDiscount] = useState(initialMinDiscount);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(60000);
  const [sort, setSort] = useState("Featured");
  const [search, setSearch] = useState(initialSearch);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await productAPI.getAll("limit=100");
        if (res.success && res.products?.length > 0) {
          setProducts(res.products);
        }
      } catch (err) {
        console.error("Failed to load products:", err);
      }
    };
    fetchProducts();
  }, []);

  const CATEGORIES = useMemo(() => ["All", ...new Set(products.map(p => p.category))], [products]);
  const BRANDS = useMemo(() => [...new Set(products.map(p => p.brand))], [products]);
  const MATERIALS = useMemo(() => [...new Set(products.map(p => p.material || ""))].filter(Boolean), [products]);

  const toggleArray = (arr, setArr, val) => {
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const getDiscount = (p) => p.originalPrice ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;

  const filtered = useMemo(() => {
    let res = products.filter(p => {
      if (category !== "All" && p.category !== category) return false;
      if (selectedBrands.length && !selectedBrands.includes(p.brand)) return false;
      if (selectedMaterials.length && !selectedMaterials.includes(p.material)) return false;
      if (selectedPriceRange) {
        if (p.price < selectedPriceRange.min || p.price > selectedPriceRange.max) return false;
      } else {
        if (p.price < priceMin || p.price > priceMax) return false;
      }
      if (minRating && p.rating < minRating) return false;
      if (minDiscount && getDiscount(p) < minDiscount) return false;
      if (inStockOnly && p.stock <= 0) return false;
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
  }, [products, category, selectedBrands, selectedMaterials, selectedPriceRange, priceMin, priceMax, minRating, minDiscount, inStockOnly, sort, search]);

  const activeFilterCount = [category !== "All", selectedBrands.length, selectedMaterials.length, selectedPriceRange, minRating, minDiscount, inStockOnly, search].filter(Boolean).length;

  const clearAll = () => {
    setCategory("All"); setSelectedBrands([]); setSelectedMaterials([]); setSelectedPriceRange(null);
    setMinRating(0); setMinDiscount(0); setInStockOnly(false); setPriceMin(0); setPriceMax(60000); setSearch("");
  };

  const sidebarContent = (
    <>
      {/* Search (mobile) */}
      <div className="mb-6 lg:hidden">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2b2721]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="input-field w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white/70 border border-[#e8e4d5] text-[#2b2721]" />
        </div>
      </div>

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className="mb-6 flex items-center justify-between">
          <span className="text-xs text-[#2b2721]/50 font-bold">{activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active</span>
          <button onClick={clearAll} className="text-xs text-gold hover:underline font-bold">Clear All</button>
        </div>
      )}

      {/* Category */}
      <FilterSection title="Category">
        <div className="space-y-0.5">
          {CATEGORIES.map(c => (
            <Checkbox key={c} checked={category === c} onChange={() => { setCategory(c); setSidebarOpen(false); }}
              label={c} count={c === "All" ? products.length : products.filter(p => p.category === c).length} />
          ))}
        </div>
      </FilterSection>

      {/* Price Range (Quick) */}
      <FilterSection title="Price">
        <div className="space-y-0.5">
          {PRICE_RANGES.map((r, i) => (
            <Checkbox key={i} checked={selectedPriceRange === r} onChange={() => setSelectedPriceRange(selectedPriceRange === r ? null : r)} label={r.label}
              count={products.filter(p => p.price >= r.min && p.price <= r.max).length} />
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-[#e8e4d5]">
          <p className="text-xs text-[#2b2721]/50 mb-2 font-bold">Custom Range</p>
          <div className="flex gap-2 items-center">
            <input type="number" value={priceMin} onChange={e => { setPriceMin(+e.target.value); setSelectedPriceRange(null); }}
              placeholder="Min" className="input-field w-full px-3 py-2 rounded-lg text-xs" />
            <span className="text-[#2b2721]/40">—</span>
            <input type="number" value={priceMax} onChange={e => { setPriceMax(+e.target.value); setSelectedPriceRange(null); }}
              placeholder="Max" className="input-field w-full px-3 py-2 rounded-lg text-xs" />
          </div>
        </div>
      </FilterSection>

      {/* Brand */}
      <FilterSection title="Brand">
        <div className="space-y-0.5">
          {BRANDS.map(b => (
            <Checkbox key={b} checked={selectedBrands.includes(b)} onChange={() => toggleArray(selectedBrands, setSelectedBrands, b)}
              label={b} count={products.filter(p => p.brand === b).length} />
          ))}
        </div>
      </FilterSection>

      {/* Customer Rating */}
      <FilterSection title="Customer Rating">
        <div className="space-y-0.5">
          {RATING_FILTERS.map(r => (
            <Checkbox key={r} checked={minRating === r} onChange={() => setMinRating(minRating === r ? 0 : r)}
              label={<span className="flex items-center gap-1">{r}<svg className="w-3 h-3 text-[#7c5d1b]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg> & above</span>}
              count={products.filter(p => p.rating >= r).length} />
          ))}
        </div>
      </FilterSection>

      {/* Discount */}
      <FilterSection title="Discount" defaultOpen={false}>
        <div className="space-y-0.5">
          {DISCOUNT_FILTERS.map(d => (
            <Checkbox key={d.min} checked={minDiscount === d.min} onChange={() => setMinDiscount(minDiscount === d.min ? 0 : d.min)}
              label={d.label} count={products.filter(p => getDiscount(p) >= d.min).length} />
          ))}
        </div>
      </FilterSection>

      {/* Material */}
      <FilterSection title="Material" defaultOpen={false}>
        <div className="space-y-0.5">
          {MATERIALS.map(m => (
            <Checkbox key={m} checked={selectedMaterials.includes(m)} onChange={() => toggleArray(selectedMaterials, setSelectedMaterials, m)}
              label={m} count={products.filter(p => p.material === m).length} />
          ))}
        </div>
      </FilterSection>

      {/* Availability */}
      <FilterSection title="Availability" defaultOpen={false}>
        <Checkbox checked={inStockOnly} onChange={() => setInStockOnly(!inStockOnly)} label="In Stock Only"
          count={products.filter(p => p.stock > 0).length} />
      </FilterSection>
    </>
  );

  return (
    <div className="min-h-screen relative transition-colors duration-500">
      {sidebarOpen && <div className="fixed inset-0 z-40 lg:hidden bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* Header */}
      <div className="border-b border-white/20 dark:border-white/5 bg-white/10 dark:bg-[#1A1A18]/15 backdrop-blur-md pt-24 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs tracking-[0.4em] uppercase gold font-extrabold mb-2">Browse</p>
          <h1 className="display text-4xl md:text-5xl font-black text-[var(--text-primary)]">The Collection</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-2 font-semibold">{filtered.length} of {products.length} products</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex relative z-10">
        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-0 lg:top-[73px] z-40 lg:z-auto h-full lg:h-[calc(100vh-73px)] w-72 bg-white/95 dark:bg-[#1A1A18]/95 lg:bg-white/10 lg:dark:bg-[#1A1A18]/15 backdrop-blur-md border-r border-white/20 dark:border-white/5 overflow-y-auto py-6 px-5 flex-shrink-0 transition-all duration-300 ${sidebarOpen ? "left-0" : "-left-72"} lg:left-auto lg:block`}>
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <h3 className="font-extrabold tracking-wide text-[var(--text-primary)]">Filters</h3>
            <button onClick={() => setSidebarOpen(false)} className="text-[var(--text-secondary)] hover:text-[#d4af37] text-lg font-black">✕</button>
          </div>
          {sidebarContent}
        </aside>

        {/* Main */}
        <main className="flex-1 px-6 py-6 min-w-0">
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="hidden lg:block relative flex-1 max-w-sm">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products, brands..."
                className="input-field w-full pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-[var(--text-secondary)]/50 font-medium" />
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <button className="lg:hidden btn-outline px-4 py-2.5 rounded-xl text-xs tracking-widest uppercase flex items-center gap-2" onClick={() => setSidebarOpen(true)}>
                Filters {activeFilterCount > 0 && <span className="w-5 h-5 gold-bg text-white text-[10px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>}
              </button>
              {/* View toggle */}
              <div className="hidden sm:flex border border-white/20 dark:border-white/5 bg-white/20 dark:bg-[#1A1A18]/20 rounded-lg overflow-hidden">
                <button onClick={() => setViewMode("grid")} className={`p-2 ${viewMode === "grid" ? "bg-[#d4af37]/15 text-[var(--text-primary)] font-bold" : "text-[var(--text-secondary)] hover:text-[#d4af37]"}`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z" /></svg>
                </button>
                <button onClick={() => setViewMode("list")} className={`p-2 ${viewMode === "list" ? "bg-[#d4af37]/15 text-[var(--text-primary)] font-bold" : "text-[var(--text-secondary)] hover:text-[#d4af37]"}`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M2.5 12a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z" /></svg>
                </button>
              </div>
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="input-field px-4 py-2.5 rounded-xl text-sm text-[var(--text-primary)] bg-white/50 dark:bg-[#1A1A18]/50 border border-white/20 dark:border-white/5 cursor-pointer font-bold">
                {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Active filter pills */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {category !== "All" && <FilterPill label={category} onRemove={() => setCategory("All")} />}
              {selectedBrands.map(b => <FilterPill key={b} label={b} onRemove={() => toggleArray(selectedBrands, setSelectedBrands, b)} />)}
              {selectedMaterials.map(m => <FilterPill key={m} label={m} onRemove={() => toggleArray(selectedMaterials, setSelectedMaterials, m)} />)}
              {selectedPriceRange && <FilterPill label={selectedPriceRange.label} onRemove={() => setSelectedPriceRange(null)} />}
              {minRating > 0 && <FilterPill label={`${minRating}★ & above`} onRemove={() => setMinRating(0)} />}
              {minDiscount > 0 && <FilterPill label={`${minDiscount}%+ off`} onRemove={() => setMinDiscount(0)} />}
              {inStockOnly && <FilterPill label="In Stock" onRemove={() => setInStockOnly(false)} />}
              {search && <FilterPill label={`"${search}"`} onRemove={() => setSearch("")} />}
              <button onClick={clearAll} className="text-xs text-gold hover:underline px-2 font-bold">Clear All</button>
            </div>
          )}

          {/* Products */}
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <svg className="w-10 h-10 animate-spin text-gold" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 text-[#2b2721]/50 font-bold">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm mt-1 mb-6">Try adjusting your filters</p>
              <button onClick={clearAll} className="btn-gold px-8 py-3 rounded-full text-sm tracking-widest uppercase">Clear Filters</button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(p => <ListProductCard key={p.id} product={p} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function FilterPill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-white/80 border border-[#e8e4d5] rounded-full px-3 py-1 text-xs text-[#2b2721] shadow-sm font-semibold">
      {label}
      <button onClick={onRemove} className="text-[#2b2721]/40 hover:text-red-500 font-extrabold text-xs">×</button>
    </span>
  );
}

function ListProductCard({ product }) {
  const formatPrice = (p) => `₹${p.toLocaleString("en-IN")}`;
  const discount = product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
  return (
    <a href={`/product/${product.id}`} className="flex gap-6 border border-[#e8e4d5] rounded-2xl bg-white/60 backdrop-blur-sm p-4 hover:border-[#d4af37]/35 shadow-sm group">
      <div className="w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-[#f3f0e6]">
        <img src={product.img} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#2b2721]/50 text-[10px] tracking-widest uppercase font-bold">{product.brand} · {product.category}</p>
        <h3 className="font-bold text-[#3d3522] group-hover:text-gold transition-colors mt-0.5 line-clamp-1">{product.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="flex items-center gap-0.5 bg-green-500/10 text-green-700 px-1.5 py-0.5 rounded text-xs font-bold">{product.rating} ★</span>
          <span className="text-[#2b2721]/50 text-xs font-semibold">{product.numReviews || 0} reviews</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="gold font-bold text-lg">{formatPrice(product.price)}</span>
          {product.originalPrice && <span className="text-[#2b2721]/40 text-sm line-through">{formatPrice(product.originalPrice)}</span>}
          {discount > 0 && <span className="text-green-600 text-xs font-bold">{discount}% off</span>}
        </div>
        <p className="text-[#2b2721]/60 text-xs mt-1 line-clamp-1 font-medium">{product.description}</p>
      </div>
    </a>
  );
}
