import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useSearchStore } from "../store/useSearchStore";
import products, { getAllCategories } from "../data/product";
import { Search, Tag, Building2, Sparkles, X, ChevronRight } from "lucide-react";

const POPULAR_SEARCHES = ["Watches", "Leather", "Silk Shirt", "Sneakers", "Perfume", "Loafers"];

export default function SearchDropdown() {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const searchOpen = useSearchStore((state) => state.searchOpen);
  const setSearchOpen = useSearchStore((state) => state.setSearchOpen);

  useEffect(() => {
    inputRef.current?.focus();
    // Add Esc key listener to close search
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSearchOpen]);

  const q = query.toLowerCase().trim();

  // Match products
  const matchedProducts = q.length >= 2
    ? products.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.brand.toLowerCase().includes(q) || 
        p.category.toLowerCase().includes(q) || 
        p.material.toLowerCase().includes(q)
      ).slice(0, 5)
    : [];

  // Match categories
  const matchedCategories = q.length >= 1
    ? getAllCategories().filter(c => c.toLowerCase().includes(q))
    : [];

  // Match brands
  const matchedBrands = q.length >= 2
    ? [...new Set(products.map(p => p.brand))].filter(b => b.toLowerCase().includes(q))
    : [];

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    setSearchOpen(false);
  };

  const goToSearch = (term) => {
    navigate(`/search?q=${encodeURIComponent(term)}`);
    setSearchOpen(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 overflow-y-auto"
      onClick={() => setSearchOpen(false)}
    >
      {/* Layer 2: Focus Overlay (backdrop saturation, brightness & blur spec) */}
      <div 
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          backgroundColor: "rgba(20, 20, 20, 0.32)",
          backdropFilter: "blur(10px) saturate(0.8) brightness(0.82)",
          WebkitBackdropFilter: "blur(10px) saturate(0.8) brightness(0.82)",
        }}
      />
      
      {/* Layer 3: Search Modal Panel */}
      <motion.div 
        initial={{ opacity: 0, y: -12, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.99 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl z-10 flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        {/* Dominant Search Input (72px height exactly to spec) */}
        <form onSubmit={handleSubmit} className="relative w-full shadow-lg rounded-2xl overflow-hidden mb-3">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5.5 h-5.5 text-[#7A766F]" />
          
          <input 
            ref={inputRef} 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            placeholder="Search for products, brands, categories..."
            className="w-full h-[72px] pl-16 pr-14 py-4 bg-white border border-[#DAD5CB] rounded-2xl text-[#2B2B28] text-base placeholder-[#7A766F] focus:outline-none focus:border-[#5B7FFF] focus:ring-4 focus:ring-[#5B7FFF]/12 transition-all duration-300 font-sans shadow-inner" 
          />
          
          {query && (
            <button 
              type="button" 
              onClick={() => setQuery("")} 
              className="absolute right-6 top-1/2 -translate-y-1/2 text-[#7A766F]/60 hover:text-[#2B2B28] transition-colors p-1"
            >
              <X size={18} />
            </button>
          )}
        </form>

        {/* Elevated Floating Modal Body (96% opaque, huge shadow) */}
        <div 
          className="bg-white/96 border border-[#E7E2D8] rounded-2xl overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.18)] max-h-[60vh] flex flex-col"
          style={{
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div className="overflow-y-auto flex-1 scrollbar-none">
            {!q ? (
              /* Popular Searches & Category Quick Browse */
              <div className="p-6">
                {/* Popular Tags */}
                <p className="text-[10px] tracking-[0.25em] uppercase text-[#66635D] font-extrabold mb-4">Popular Searches</p>
                <div className="flex flex-wrap gap-2.5 mb-8">
                  {POPULAR_SEARCHES.map(s => (
                    <button 
                      key={s} 
                      onClick={() => goToSearch(s)}
                      className="px-4.5 py-2.5 rounded-full border border-[#DAD5CB] bg-white text-sm text-[#4A453F] hover:border-[#C6A86B] hover:bg-[#F8F6F2] transition-all duration-300 transform hover:scale-104 font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Sparkles size={12} className="text-[#C6A86B]" />
                      {s}
                    </button>
                  ))}
                </div>
                
                {/* Categories Browse */}
                <p className="text-[10px] tracking-[0.25em] uppercase text-[#66635D] font-extrabold mb-4">Browse Categories</p>
                <div className="grid grid-cols-2 gap-3">
                  {getAllCategories().map(cat => (
                    <button 
                      key={cat} 
                      onClick={() => goToSearch(cat)}
                      className="text-left px-5 py-4 rounded-xl border border-[#E7E2D8]/40 hover:border-[#5B7FFF]/30 bg-white/50 hover:bg-[#F8F6F2] transition-all flex items-center justify-between gap-3 font-extrabold text-[#2B2B28] shadow-sm group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl flex-shrink-0">{{"Watches":"⌚","Eyewear":"🕶️","Footwear":"👟","Accessories":"👜","Shirts":"👔","Pants":"👖","Grooming":"✨"}[cat] || "📦"}</span>
                        <span className="text-sm tracking-wide">{cat}</span>
                      </div>
                      <ChevronRight size={14} className="text-[#66635D]/30 group-hover:text-[#5B7FFF] group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Search Results Lists with High Hierarchy & Legibility */
              <div className="py-2 divide-y divide-[#E7E2D8]/40">
                {/* Category matches */}
                {matchedCategories.length > 0 && (
                  <div className="px-6 py-4.5">
                    <p className="text-[9px] tracking-[0.25em] uppercase text-[#66635D] font-extrabold mb-3">Categories</p>
                    <div className="space-y-1">
                      {matchedCategories.map(cat => (
                        <button 
                          key={cat} 
                          onClick={() => goToSearch(cat)}
                          className="flex items-center justify-between w-full text-left px-4 py-3 rounded-xl hover:bg-[#F8F6F2] border border-transparent hover:border-[#E7E2D8]/40 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <Tag size={14} className="text-[#66635D] group-hover:text-[#5B7FFF]" />
                            <span className="text-sm text-[#4A453F] font-bold">Shop in <strong className="text-[#2B2B28] font-extrabold">{cat}</strong></span>
                          </div>
                          <ChevronRight size={14} className="text-[#66635D]/30 group-hover:text-[#5B7FFF] group-hover:translate-x-0.5 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Brand matches */}
                {matchedBrands.length > 0 && (
                  <div className="px-6 py-4.5">
                    <p className="text-[9px] tracking-[0.25em] uppercase text-[#66635D] font-extrabold mb-3">Brands</p>
                    <div className="space-y-1">
                      {matchedBrands.map(b => (
                        <button 
                          key={b} 
                          onClick={() => goToSearch(b)}
                          className="flex items-center justify-between w-full text-left px-4 py-3 rounded-xl hover:bg-[#F8F6F2] border border-transparent hover:border-[#E7E2D8]/40 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <Building2 size={14} className="text-[#66635D] group-hover:text-[#5B7FFF]" />
                            <span className="text-sm text-[#2B2B28] font-bold">{b}</span>
                          </div>
                          <ChevronRight size={14} className="text-[#66635D]/30 group-hover:text-[#5B7FFF] group-hover:translate-x-0.5 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product matches (100% Opacity Images) */}
                {matchedProducts.length > 0 && (
                  <div className="px-6 py-4.5">
                    <p className="text-[9px] tracking-[0.25em] uppercase text-[#66635D] font-extrabold mb-3">Products</p>
                    <div className="space-y-1.5">
                      {matchedProducts.map(p => (
                        <Link 
                          key={p.id} 
                          to={`/product/slug/${p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`} 
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-[#F8F6F2] border border-transparent hover:border-[#E7E2D8]/40 transition-all group"
                        >
                          <img 
                            src={p.img} 
                            alt={p.name} 
                            loading="lazy"
                            width="48"
                            height="48"
                            className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-[#E7E2D8] bg-[#F5F3EE]" 
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#2B2B28] font-black truncate">{p.name}</p>
                            <p className="text-xs text-[#66635D] font-bold">{p.brand} · {p.category}</p>
                          </div>
                          <span className="text-[#C6A86B] text-sm font-black whitespace-nowrap">₹{p.price.toLocaleString("en-IN")}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {matchedProducts.length === 0 && matchedCategories.length === 0 && matchedBrands.length === 0 && (
                  <div className="py-16 px-6 text-center text-[#66635D] text-sm font-bold bg-[#F8F6F2]/30">No results found for "{query}"</div>
                )}
              </div>
            )}
          </div>

          {/* Search trigger button at bottom */}
          {q.length >= 2 && (
            <button 
              onClick={() => handleSubmit()}
              className="w-full border-t border-[#E7E2D8] px-6 py-5.5 text-left text-sm text-[#5B7FFF] bg-white hover:bg-[#F8F6F2] transition-colors flex items-center gap-3 font-extrabold shadow-inner"
            >
              <Search className="w-4.5 h-4.5 text-[#5B7FFF]" />
              Search for "{query}"
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
