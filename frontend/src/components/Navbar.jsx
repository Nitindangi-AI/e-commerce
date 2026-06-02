import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCartStore } from "../store/useCartStore";
import { useWishlistStore } from "../store/useWishlistStore";
import { insforge } from "../lib/insforge";
import { useThemeStore } from "../store/useThemeStore";
import { useSearchStore } from "../store/useSearchStore";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Heart, ShoppingBag, Menu, User, LogOut, ChevronRight, Sparkles, Sun, Moon, Home } from "lucide-react";
import products from "../data/product";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [searchVal, setSearchVal] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  const [user, setUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("auto");
    else setTheme("light");
  };
  
  const cartCount = useCartStore((state) => state.cartItems.reduce((t, i) => t + i.quantity, 0));
  const wishlistCount = useWishlistStore((state) => state.wishlistItems.length);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchFocused(false);
  }, [location.pathname]);

  // Click-outside listener for profile dropdown
  useEffect(() => {
    if (!profileOpen) return;
    const closeMenu = (e) => {
      if (!e.target.closest(".profile-dropdown-container")) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, [profileOpen]);

  // Click-outside listener for search input & dropdown
  useEffect(() => {
    if (!searchFocused) return;
    const handleOutsideClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [searchFocused]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const fetchProfile = async (u) => {
      if (!u) return;
      try {
        const { data: profile } = await insforge.database
          .from('profiles')
          .select('*')
          .eq('id', u.id)
          .maybeSingle();
        if (profile) {
          setUser({ ...u, profile });
        } else {
          setUser(u);
        }
      } catch (err) {
        setUser(u);
      }
    };

    insforge.auth.getUser().then(({ data }) => {
      if (data?.user) {
        fetchProfile(data.user);
      }
    }).catch(() => {});

    const { data: { subscription } } = insforge.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const navLinks = [
    { name: "Shop", to: "/shop" },
    { name: "Watches", to: "/shop?category=Watches" },
    { name: "Shirts", to: "/shop?category=Shirts" },
    { name: "Footwear", to: "/shop?category=Footwear" },
    { name: "Grooming", to: "/shop?category=Grooming" },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchVal.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`);
    setSearchFocused(false);
  };

  const q = searchVal.toLowerCase().trim();
  const matchedProducts = q.length >= 2
    ? products.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.brand.toLowerCase().includes(q) || 
        p.category.toLowerCase().includes(q)
      ).slice(0, 5)
    : [];

  return (
    <>
      <nav
        className={`sticky top-0 z-50 w-full transition-all duration-300 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md ${
          scrolled
            ? "border-b border-[#E8E8E8] dark:border-white/5 py-3 shadow-card"
            : "border-b border-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between relative w-full">
          {/* Left section: Hamburger menu & Desktop Links */}
          <div className="flex items-center gap-6">
            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 text-[#111111] dark:text-slate-100 hover:text-[#C9A84C] dark:hover:text-[#C9A84C] hover:scale-110 active:scale-90 transition-all"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-6 text-[10px] tracking-[0.25em] uppercase font-medium">
              {navLinks.map((l) => (
                <Link key={l.name} to={l.to}
                  className={`hover:text-[#C9A84C] dark:hover:text-[#C9A84C] hover:scale-105 active:scale-95 transition-all duration-300 ${
                    location.pathname + location.search === l.to 
                      ? "text-[#C9A84C] dark:text-[#C9A84C] font-semibold" 
                      : "text-[#111111] dark:text-slate-100"
                  }`}>
                  {l.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Center section: Logo */}
          <Link to="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10 py-1 group">
            <span className="font-display text-2xl md:text-3xl font-bold tracking-[0.25em] uppercase text-[#0A0A0A] dark:text-white transition-colors duration-300 group-hover:text-[#C9A84C] select-none">
              TRENDY
            </span>
          </Link>
          
          {/* Right icons */}
          <div className="flex items-center gap-2 sm:gap-4 z-10">
            {/* Pill-shaped expanding Search bar */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <div
                ref={searchContainerRef}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border bg-[#FAFAF8] dark:bg-[#111111] border-transparent transition-all duration-300 ease-in-out ${
                  searchFocused 
                    ? "w-48 md:w-64 border-[#C9A84C] ring-2 ring-[#C9A84C]/10 bg-white dark:bg-black" 
                    : "w-10 sm:w-36 md:w-44 hover:border-[#E8E8E8] dark:hover:border-white/10"
                }`}
              >
                <Search
                  size={16}
                  className={`text-[#6B6B6B] flex-shrink-0 cursor-pointer ${searchFocused ? "text-[#C9A84C]" : ""}`}
                  onClick={() => {
                    if (!searchFocused) {
                      setSearchFocused(true);
                      setTimeout(() => searchInputRef.current?.focus(), 100);
                    } else {
                      handleSearchSubmit({ preventDefault: () => {} });
                    }
                  }}
                />
                
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Search..."
                  className={`bg-transparent text-xs text-[#111111] dark:text-white placeholder-[#6B6B6B]/60 focus:outline-none w-full transition-all duration-300 ${
                    searchFocused 
                      ? "opacity-100 pointer-events-auto" 
                      : "opacity-0 sm:opacity-100 pointer-events-none sm:pointer-events-auto"
                  }`}
                />

                {searchVal && searchFocused && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchVal("");
                      searchInputRef.current?.focus();
                    }}
                    className="text-[#6B6B6B]/60 hover:text-[#111111] dark:hover:text-white transition-colors flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                )}
                
                {/* Inline Search Dropdown Card */}
                {searchFocused && (
                  <div className="absolute right-0 top-full mt-2 w-72 md:w-80 bg-white dark:bg-[#111111] border border-[#E8E8E8] dark:border-white/5 rounded-2xl shadow-luxury z-50 overflow-hidden py-3 animate-fade-in text-left">
                    <div className="max-h-[300px] overflow-y-auto px-4 space-y-3">
                      {!searchVal.trim() ? (
                        <div>
                          <p className="text-[9px] tracking-wider uppercase text-[#6B6B6B] dark:text-gray-400 font-bold mb-2">Popular Searches</p>
                          <div className="flex flex-wrap gap-1.5">
                            {["Watches", "Shirts", "Footwear", "Grooming"].map((term) => (
                              <button
                                key={term}
                                type="button"
                                onClick={() => {
                                  setSearchVal(term);
                                  navigate(`/search?q=${encodeURIComponent(term)}`);
                                  setSearchFocused(false);
                                }}
                                className="px-3 py-1 text-xs bg-[#FAFAF8] dark:bg-[#1A1A18] hover:bg-[#C9A84C]/10 border border-[#E8E8E8] dark:border-white/5 hover:border-[#C9A84C] text-[#111111] dark:text-white rounded-full transition-all duration-200"
                              >
                                {term}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[9px] tracking-wider uppercase text-[#6B6B6B] dark:text-gray-400 font-bold mb-2">Results</p>
                          {matchedProducts.length > 0 ? (
                            <div className="space-y-2">
                              {matchedProducts.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    navigate(`/product/${p.id}`);
                                    setSearchFocused(false);
                                    setSearchVal("");
                                  }}
                                  className="flex items-center gap-3 w-full text-left p-1.5 rounded-lg hover:bg-[#FAFAF8] dark:hover:bg-[#1A1A18] transition-colors"
                                >
                                  <img src={p.img} alt={p.name} className="w-8 h-8 rounded object-cover border border-[#E8E8E8] dark:border-white/5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-[#111111] dark:text-white truncate">{p.name}</p>
                                    <p className="text-[10px] text-[#6B6B6B] dark:text-gray-400">{p.category}</p>
                                  </div>
                                  <span className="text-xs font-bold text-[#C9A84C]">₹{p.price.toLocaleString("en-IN")}</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-[#6B6B6B] dark:text-gray-400 py-2">No products found for "{searchVal}"</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </form>

            {/* Wishlist */}
            <Link to="/wishlist" className="relative p-2 text-[#111111] dark:text-slate-100 hover:text-[#C9A84C] dark:hover:text-[#C9A84C] hover:scale-110 active:scale-90 transition-all hidden sm:block">
              <Heart size={20} strokeWidth={1.75} />
              <AnimatePresence mode="popLayout">
                {wishlistCount > 0 && (
                  <motion.span
                     key={wishlistCount}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#C9A84C] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-[0_2px_6px_rgba(201,168,76,0.4)]"
                  >
                    {wishlistCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {/* Cart */}
            <Link to="/cart" className="relative p-2 text-[#111111] dark:text-slate-100 hover:text-[#C9A84C] dark:hover:text-[#C9A84C] hover:scale-110 active:scale-90 transition-all">
              <ShoppingBag size={20} strokeWidth={1.75} />
              <AnimatePresence mode="popLayout">
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#C9A84C] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-[0_2px_6px_rgba(201,168,76,0.4)]"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={cycleTheme}
              className="p-2 text-[#111111] dark:text-slate-100 hover:text-[#C9A84C] dark:hover:text-[#C9A84C] hover:scale-110 transition-all focus:outline-none"
              aria-label="Toggle Theme"
            >
              {theme === "light" ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Profile Avatar / Dropdown */}
            {user ? (
              <div className="relative profile-dropdown-container">
                <button 
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="p-2 text-[#111111] dark:text-slate-100 hover:text-[#C9A84C] dark:hover:text-[#C9A84C] hover:scale-110 transition-all flex items-center justify-center focus:outline-none"
                  aria-label="Profile Menu"
                >
                  {user.profile?.avatar_url ? (
                    <img 
                      src={user.profile.avatar_url} 
                      alt="Avatar" 
                      className="w-6 h-6 rounded-full border border-accent/40 object-cover shadow-sm" 
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] flex items-center justify-center font-bold text-xs">
                      {user.profile?.first_name ? user.profile.first_name[0].toUpperCase() : "U"}
                    </div>
                  )}
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#111111] border border-[#E8E8E8] dark:border-white/5 rounded-xl overflow-hidden shadow-luxury z-50 py-1"
                    >
                      <div className="px-4 py-2.5 border-b border-[#E8E8E8] dark:border-white/5 bg-[#FAFAF8] dark:bg-white/[0.02]">
                        <p className="text-[9px] text-[#6B6B6B] dark:text-gray-400 tracking-wider uppercase font-semibold">Logged in as</p>
                        <p className="text-sm font-semibold text-[#C9A84C] truncate">
                          {user.profile?.first_name ? `${user.profile.first_name}` : "User"}
                        </p>
                      </div>
                      <Link 
                        to="/account" 
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[#111111] dark:text-white hover:text-[#C9A84C] dark:hover:text-[#C9A84C] hover:bg-[#FAFAF8] dark:hover:bg-white/[0.02] transition-colors font-medium"
                        onClick={() => setProfileOpen(false)}
                      >
                        👤 My Profile
                      </Link>
                      <Link 
                        to="/account" 
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[#111111] dark:text-white hover:text-[#C9A84C] dark:hover:text-[#C9A84C] hover:bg-[#FAFAF8] dark:hover:bg-white/[0.02] transition-colors font-medium"
                        onClick={() => setProfileOpen(false)}
                      >
                        📦 My Orders
                      </Link>
                      {user.profile?.role === "vendor" && (
                        <Link 
                          to="/vendor/dashboard" 
                          className="flex items-center gap-2 px-4 py-2 text-sm text-[#C9A84C] font-semibold hover:bg-[#FAFAF8] dark:hover:bg-white/[0.02] transition-colors border-t border-[#E8E8E8] dark:border-white/5"
                          onClick={() => setProfileOpen(false)}
                        >
                          📈 Vendor Dashboard
                        </Link>
                      )}
                      {user.profile?.role === "admin" && (
                        <Link 
                          to="/admin/dashboard" 
                          className="flex items-center gap-2 px-4 py-2 text-sm text-[#C9A84C] font-semibold hover:bg-[#FAFAF8] dark:hover:bg-white/[0.02] transition-colors border-t border-[#E8E8E8] dark:border-white/5"
                          onClick={() => setProfileOpen(false)}
                        >
                          🛡️ Admin Dashboard
                        </Link>
                      )}
                      <button 
                        onClick={async () => {
                          setProfileOpen(false);
                          await insforge.auth.signOut();
                          navigate("/");
                        }} 
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-500/5 transition-colors text-left font-medium"
                      >
                        🚪 Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/login" className="p-2 text-[#6B6B6B] hover:text-[#111111] dark:text-slate-300 dark:hover:text-white transition-colors flex items-center justify-center hover:scale-110" aria-label="Sign In">
                <User size={20} strokeWidth={1.75} />
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Slide-in Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Dark Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer Container */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
              className="fixed top-0 left-0 bottom-0 w-[280px] max-w-[80vw] bg-white dark:bg-[#0A0A0A] border-r border-[#E8E8E8] dark:border-white/5 z-50 md:hidden flex flex-col shadow-2xl p-6"
            >
              <div className="flex items-center justify-between border-b border-[#E8E8E8] dark:border-white/5 pb-4 mb-6">
                <Link to="/" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
                  <span className="font-display text-2xl font-bold tracking-[0.2em] uppercase text-[#0A0A0A] dark:text-white">
                    Trendy
                  </span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-[#111111] dark:text-white hover:text-[#C9A84C] transition-colors rounded-full border border-[#E8E8E8] dark:border-white/5"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Links inside Drawer */}
              <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
                <p className="text-[9px] tracking-widest uppercase text-[#6B6B6B] dark:text-gray-400 font-bold mb-2 px-2">Shop Categories</p>
                {navLinks.map((l) => (
                  <Link
                    key={l.name}
                    to={l.to}
                    className="flex items-center justify-between text-xs tracking-widest uppercase text-[#111111] dark:text-white hover:text-[#C9A84C] py-3 px-2 border-b border-[#E8E8E8]/40 dark:border-white/5 transition-colors font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>{l.name}</span>
                    <ChevronRight size={14} className="text-[#6B6B6B]" />
                  </Link>
                ))}
                <Link
                  to="/wishlist"
                  className="flex items-center justify-between text-xs tracking-widest uppercase text-[#111111] dark:text-white hover:text-[#C9A84C] py-3 px-2 border-b border-[#E8E8E8]/40 dark:border-white/5 transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>Wishlist</span>
                  <div className="flex items-center gap-1">
                    {wishlistCount > 0 && <span className="text-[#C9A84C] font-bold">({wishlistCount})</span>}
                    <ChevronRight size={14} className="text-[#6B6B6B]" />
                  </div>
                </Link>
              </div>

              {/* Drawer Footer */}
              <div className="border-t border-[#E8E8E8] dark:border-white/5 pt-4 mt-6">
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {user.profile?.avatar_url ? (
                        <img
                          src={user.profile.avatar_url}
                          alt="Avatar"
                          className="w-8 h-8 rounded-full border border-[#C9A84C] object-cover shadow-sm"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] flex items-center justify-center font-bold text-sm">
                          {user.profile?.first_name ? user.profile.first_name[0].toUpperCase() : "U"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] text-[#6B6B6B]">Logged in as</p>
                        <p className="text-xs font-bold text-[#111111] dark:text-white truncate">
                          {user.profile?.first_name || "User"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to="/account"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-center gap-1.5 py-2 border border-[#E8E8E8] dark:border-white/5 hover:border-[#C9A84C] text-[10px] font-bold uppercase rounded-lg text-[#111111] dark:text-white"
                      >
                        Account
                      </Link>
                      <button
                        onClick={async () => {
                          setMobileMenuOpen(false);
                          await insforge.auth.signOut();
                          navigate("/");
                        }}
                        className="flex items-center justify-center gap-1.5 py-2 border border-red-500/20 hover:bg-red-500/5 text-red-600 text-[10px] font-bold uppercase rounded-lg"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-[#C9A84C] text-white text-[10px] font-bold uppercase rounded-xl hover:bg-[#B5963F] shadow-lg transition-all"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation Bar (fixed, frosted glass) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/70 dark:bg-[#0A0A0A]/70 backdrop-blur-lg border-t border-black/[0.06] dark:border-white/5 py-2.5 px-4 flex items-center justify-around shadow-luxury">
        <Link to="/" className="flex flex-col items-center gap-1 text-[var(--text-secondary)] hover:text-gold transition-colors">
          <Home size={18} className={location.pathname === "/" ? "text-gold" : "text-[var(--text-secondary)]"} />
          <span className="text-[8px] uppercase tracking-wider font-bold">Home</span>
        </Link>
        <Link to="/search" className="flex flex-col items-center gap-1 text-[var(--text-secondary)] hover:text-gold transition-colors">
          <Search size={18} className={location.pathname === "/search" ? "text-gold" : "text-[var(--text-secondary)]"} />
          <span className="text-[8px] uppercase tracking-wider font-bold">Search</span>
        </Link>
        <Link to="/cart" className="relative flex flex-col items-center gap-1 text-[var(--text-secondary)] hover:text-gold transition-colors">
          <ShoppingBag size={18} className={location.pathname === "/cart" ? "text-gold" : "text-[var(--text-secondary)]"} />
          {cartCount > 0 && (
            <span className="absolute top-0 right-1.5 w-4 h-4 bg-gold text-black text-[9px] font-black rounded-full flex items-center justify-center shadow-md">
              {cartCount}
            </span>
          )}
          <span className="text-[8px] uppercase tracking-wider font-bold">Cart</span>
        </Link>
        <Link to="/account" className="flex flex-col items-center gap-1 text-[var(--text-secondary)] hover:text-gold transition-colors">
          <User size={18} className={location.pathname === "/account" ? "text-gold" : "text-[var(--text-secondary)]"} />
          <span className="text-[8px] uppercase tracking-wider font-bold">Profile</span>
        </Link>
      </div>
    </>
  );
}