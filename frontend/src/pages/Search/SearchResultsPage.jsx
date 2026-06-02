import { useState, useMemo, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { productAPI } from "../../services/api";
import ProductCard from "../../components/ProductCard";
import localProducts from "../../data/product";

const PRICE_RANGES = [
  { label: "Under ₹5,000", min: 0, max: 5000 },
  { label: "₹5,000 - ₹15,000", min: 5000, max: 15000 },
  { label: "₹15,000 - ₹30,000", min: 15000, max: 30000 },
  { label: "₹30,000 - ₹50,000", min: 30000, max: 50000 },
  { label: "Above ₹50,000", min: 50000, max: Infinity },
];
const DISCOUNT_FILTERS = [
  { label: "50% or more", min: 50 },
  { label: "30% or more", min: 30 },
  { label: "20% or more", min: 20 },
  { label: "10% or more", min: 10 },
];
const SORT_OPTIONS = ["Relevance", "Price: Low to High", "Price: High to Low", "Top Rated", "Newest", "Discount"];

function Checkbox({ checked, onChange, label, count }) {
  return (
    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0 ${checked ? "gold-bg border-transparent" : "border-white/20 group-hover:border-white/40"}`}>
        {checked && <svg className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className={`text-sm flex-1 ${checked ? "text-white" : "text-white/50"}`}>{label}</span>
      {count !== undefined && <span className="text-xs text-white/20">{count}</span>}
      <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
    </label>
  );
}

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-5 pb-5 border-b border-white/5 last:border-0">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full mb-2">
        <h3 className="text-xs tracking-[0.15em] uppercase text-white/50 font-semibold">{title}</h3>
        <svg className={`w-3.5 h-3.5 text-white/25 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && children}
    </div>
  );
}

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const q = query.toLowerCase().trim();

  const [products, setProducts] = useState(localProducts);
  const [loading, setLoading] = useState(false);

  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState(null);
  const [minRating, setMinRating] = useState(0);
  const [minDiscount, setMinDiscount] = useState(0);
  const [sort, setSort] = useState("Relevance");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await productAPI.getAll("limit=100");
        if (res.success && res.products?.length > 0) {
          setProducts(res.products);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchProducts();
  }, []);

  const toggle = (arr, setArr, val) => setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  const getDiscount = (p) => p.originalPrice ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;

  // All products matching the search query
  const searchMatches = useMemo(() => {
    if (!q) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) || (p.material || "").toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  }, [products, q]);

  // Category tabs from search results
  const categoryTabs = useMemo(() => {
    const cats = {};
    searchMatches.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [searchMatches]);

  // Dynamic brands/materials based on active category
  const availableBrands = useMemo(() => {
    const pool = activeCategory === "All" ? searchMatches : searchMatches.filter(p => p.category === activeCategory);
    return [...new Set(pool.map(p => p.brand))];
  }, [searchMatches, activeCategory]);

  const availableMaterials = useMemo(() => {
    const pool = activeCategory === "All" ? searchMatches : searchMatches.filter(p => p.category === activeCategory);
    return [...new Set(pool.map(p => p.material))];
  }, [searchMatches, activeCategory]);

  // Final filtered results
  const filtered = useMemo(() => {
    let res = activeCategory === "All" ? searchMatches : searchMatches.filter(p => p.category === activeCategory);
    if (selectedBrands.length) res = res.filter(p => selectedBrands.includes(p.brand));
    if (selectedMaterials.length) res = res.filter(p => selectedMaterials.includes(p.material));
    if (selectedPriceRange) res = res.filter(p => p.price >= selectedPriceRange.min && p.price <= selectedPriceRange.max);
    if (minRating) res = res.filter(p => p.rating >= minRating);
    if (minDiscount) res = res.filter(p => getDiscount(p) >= minDiscount);

    if (sort === "Price: Low to High") res = [...res].sort((a, b) => a.price - b.price);
    else if (sort === "Price: High to Low") res = [...res].sort((a, b) => b.price - a.price);
    else if (sort === "Top Rated") res = [...res].sort((a, b) => b.rating - a.rating);
    else if (sort === "Newest") res = [...res].sort((a, b) => b.id - a.id);
    else if (sort === "Discount") res = [...res].sort((a, b) => getDiscount(b) - getDiscount(a));
    return res;
  }, [searchMatches, activeCategory, selectedBrands, selectedMaterials, selectedPriceRange, minRating, minDiscount, sort]);

  const clearFilters = () => {
    setSelectedBrands([]); setSelectedMaterials([]); setSelectedPriceRange(null);
    setMinRating(0); setMinDiscount(0);
  };

  const activeFilterCount = [selectedBrands.length, selectedMaterials.length, selectedPriceRange, minRating, minDiscount].filter(Boolean).length;

  return (
    <div className="min-h-screen pt-16">
      {sidebarOpen && <div className="fixed inset-0 z-40 lg:hidden bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* Header */}
      <div className="border-b border-white/5 bg-luxe-dark py-6 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-white/40 text-sm mb-1">Showing results for</p>
          <h1 className="display text-3xl md:text-4xl font-black">"{query}"</h1>
          <p className="text-white/30 text-sm mt-1">{searchMatches.length} products found</p>
        </div>
      </div>

      {/* Category Tabs — Flipkart style */}
      {categoryTabs.length > 1 && (
        <div className="border-b border-white/5 bg-luxe-dark/50 px-6 overflow-x-auto">
          <div className="max-w-7xl mx-auto flex gap-1">
            <button onClick={() => { setActiveCategory("All"); clearFilters(); }}
              className={`px-5 py-3.5 text-sm whitespace-nowrap border-b-2 transition-all ${activeCategory === "All" ? "border-gold text-gold font-semibold" : "border-transparent text-white/40 hover:text-white/70"}`}>
              All ({searchMatches.length})
            </button>
            {categoryTabs.map(([cat, count]) => (
              <button key={cat} onClick={() => { setActiveCategory(cat); clearFilters(); }}
                className={`px-5 py-3.5 text-sm whitespace-nowrap border-b-2 transition-all ${activeCategory === cat ? "border-gold text-gold font-semibold" : "border-transparent text-white/40 hover:text-white/70"}`}>
                {cat} ({count})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar Filters */}
        <aside className={`fixed lg:sticky top-0 lg:top-16 z-50 lg:z-auto h-full lg:h-[calc(100vh-64px)] w-64 bg-luxe-dark lg:bg-transparent border-r border-white/5 overflow-y-auto py-5 px-4 flex-shrink-0 transition-all duration-300 ${sidebarOpen ? "left-0" : "-left-64"} lg:left-auto lg:block`}>
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <h3 className="font-semibold">Filters</h3>
            <button onClick={() => setSidebarOpen(false)} className="text-white/40 hover:text-white">✕</button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs tracking-widest uppercase text-white/40">Filters</h3>
            {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-gold hover:underline">Clear</button>}
          </div>

          {/* Brand */}
          {availableBrands.length > 1 && (
            <FilterSection title="Brand">
              {availableBrands.map(b => (
                <Checkbox key={b} checked={selectedBrands.includes(b)} onChange={() => toggle(selectedBrands, setSelectedBrands, b)}
                  label={b} count={filtered.filter(p => p.brand === b).length || searchMatches.filter(p => p.brand === b && (activeCategory === "All" || p.category === activeCategory)).length} />
              ))}
            </FilterSection>
          )}

          {/* Price */}
          <FilterSection title="Price">
            {PRICE_RANGES.map((r, i) => (
              <Checkbox key={i} checked={selectedPriceRange === r} onChange={() => setSelectedPriceRange(selectedPriceRange === r ? null : r)} label={r.label} />
            ))}
          </FilterSection>

          {/* Rating */}
          <FilterSection title="Customer Rating">
            {[4, 3, 2].map(r => (
              <Checkbox key={r} checked={minRating === r} onChange={() => setMinRating(minRating === r ? 0 : r)}
                label={<span className="flex items-center gap-1">{r}<svg className="w-3 h-3 text-gold" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg> & above</span>} />
            ))}
          </FilterSection>

          {/* Material */}
          {availableMaterials.length > 1 && (
            <FilterSection title="Material" defaultOpen={false}>
              {availableMaterials.map(m => (
                <Checkbox key={m} checked={selectedMaterials.includes(m)} onChange={() => toggle(selectedMaterials, setSelectedMaterials, m)} label={m} />
              ))}
            </FilterSection>
          )}

          {/* Discount */}
          <FilterSection title="Discount" defaultOpen={false}>
            {DISCOUNT_FILTERS.map(d => (
              <Checkbox key={d.min} checked={minDiscount === d.min} onChange={() => setMinDiscount(minDiscount === d.min ? 0 : d.min)} label={d.label} />
            ))}
          </FilterSection>
        </aside>

        {/* Results */}
        <main className="flex-1 px-6 py-6 min-w-0">
          {/* Sort + mobile filter button */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button className="lg:hidden btn-outline px-4 py-2 rounded-xl text-xs tracking-widest uppercase flex items-center gap-2" onClick={() => setSidebarOpen(true)}>
                Filters {activeFilterCount > 0 && <span className="w-5 h-5 gold-bg text-black text-[10px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>}
              </button>
              <p className="text-white/40 text-sm">{filtered.length} results</p>
            </div>
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="input-field px-4 py-2 rounded-xl text-sm text-white/70 bg-luxe-card cursor-pointer">
              {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          {/* Active pills */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {selectedBrands.map(b => <Pill key={b} label={b} onRemove={() => toggle(selectedBrands, setSelectedBrands, b)} />)}
              {selectedMaterials.map(m => <Pill key={m} label={m} onRemove={() => toggle(selectedMaterials, setSelectedMaterials, m)} />)}
              {selectedPriceRange && <Pill label={selectedPriceRange.label} onRemove={() => setSelectedPriceRange(null)} />}
              {minRating > 0 && <Pill label={`${minRating}★+`} onRemove={() => setMinRating(0)} />}
              {minDiscount > 0 && <Pill label={`${minDiscount}%+ off`} onRemove={() => setMinDiscount(0)} />}
              <button onClick={clearFilters} className="text-xs text-gold hover:underline px-2">Clear All</button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-24">
              <svg className="w-10 h-10 animate-spin text-gold" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-luxe-card border border-[var(--card-border)] rounded-2xl p-8 shadow-card max-w-xl mx-auto">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-[var(--text-primary)]/80 text-lg mb-2 font-bold">Nothing found for "{query}"</p>
              <p className="text-[var(--text-secondary)] text-sm mb-6">Try searching for other premium products or browse our curated categories below.</p>
              
              <div className="flex flex-wrap gap-2.5 justify-center mb-8">
                {["Watches", "Footwear", "Apparel", "Eyewear", "Accessories"].map(cat => (
                  <Link 
                    key={cat} 
                    to={`/search?q=${cat}`}
                    className="px-4 py-2 bg-[var(--bg-gradient)] border border-[var(--card-border)] text-xs text-[var(--text-secondary)] hover:text-gold hover:border-gold rounded-full font-bold transition-all"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
              <Link to="/shop" className="btn-gold px-8 py-3.5 rounded-xl text-xs tracking-widest uppercase font-bold border-0">Browse All</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Pill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-white/60">
      {label}<button onClick={onRemove} className="text-white/30 hover:text-white">×</button>
    </span>
  );
}
