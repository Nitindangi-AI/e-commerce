import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCartStore } from "../store/useCartStore";
import { useWishlistStore } from "../store/useWishlistStore";
import { insforge } from "../lib/insforge";
import { useThemeStore } from "../store/useThemeStore";
import { useSearchStore } from "../store/useSearchStore";
import { Sun, Moon, Sparkles } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchOpen = useSearchStore((state) => state.searchOpen);
  const setSearchOpen = useSearchStore((state) => state.setSearchOpen);
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
    setSearchOpen(false);
  }, [location.pathname]);

  // Click-outside listener to dismiss the profile dropdown safely
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

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
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

  return (
    <>
      <nav
        className={`fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-500 w-[95%] max-w-7xl ${
          scrolled
            ? "top-4 bg-white/70 dark:bg-[#1A1A18]/70 backdrop-blur-xl border border-[#E7E2D8] dark:border-white/5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] py-3 rounded-full"
            : "top-6 bg-white/30 dark:bg-[#1A1A18]/30 backdrop-blur-md border border-white/10 dark:border-white/5 py-4 rounded-3xl"
        }`}
      >
        <div className="px-6 md:px-8 flex items-center justify-between relative w-full">
          {/* Left section: Hamburger menu & Desktop Links */}
          <div className="flex items-center gap-6">
            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 text-[#2B2B28] dark:text-slate-100 hover:text-[#5B7FFF] dark:hover:text-[#5B7FFF] hover:scale-110 active:scale-90 transition-all duration-200"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-6 text-xs tracking-widest uppercase font-bold">
              {navLinks.map((l) => (
                <Link key={l.name} to={l.to}
                  className={`hover:text-[#5B7FFF] dark:hover:text-[#5B7FFF] hover:scale-110 active:scale-95 transition-all duration-300 ${
                    location.pathname + location.search === l.to ? "text-[#5B7FFF] dark:text-[#5B7FFF] font-extrabold scale-105" : "text-[#2B2B28] dark:text-slate-100"
                  }`}>
                  {l.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Center section: Logo */}
          <Link to="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10 py-1 group">
            <span className="display text-2xl md:text-3xl font-black tracking-[0.25em] uppercase gold transition-all duration-300 group-hover:scale-105 select-none gold-gradient-text">
              Trendz
            </span>
          </Link>

          {/* Right icons */}
          <div className="flex items-center gap-1 sm:gap-3 z-10">
            {/* Search */}
            <button onClick={() => setSearchOpen(true)}
              className="p-2 text-[#2B2B28] dark:text-slate-100 hover:text-[#5B7FFF] dark:hover:text-[#5B7FFF] hover:scale-120 active:scale-90 transition-all duration-250" aria-label="Search">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Wishlist */}
            <Link to="/wishlist" className="relative p-2 text-[#2B2B28] dark:text-slate-100 hover:text-[#5B7FFF] dark:hover:text-[#5B7FFF] hover:scale-120 active:scale-90 transition-all duration-250 hidden sm:block">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 gold-bg text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">{wishlistCount}</span>
              )}
            </Link>

            {/* Cart */}
            <Link to="/cart" className="relative p-2 text-[#2B2B28] dark:text-slate-100 hover:text-[#5B7FFF] dark:hover:text-[#5B7FFF] hover:scale-120 active:scale-90 transition-all duration-250">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 gold-bg text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">{cartCount}</span>
              )}
            </Link>

            {/* Profile Avatar / Dropdown */}
            {user ? (
              <div className="relative profile-dropdown-container">
                <button 
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="p-2 text-[#2B2B28] dark:text-slate-100 hover:text-[#5B7FFF] dark:hover:text-[#5B7FFF] hover:scale-115 active:scale-90 transition-all duration-250 flex items-center justify-center focus:outline-none"
                  aria-label="Profile Menu"
                >
                  {user.profile?.avatar_url ? (
                    <img 
                      src={user.profile.avatar_url} 
                      alt="Avatar" 
                      className="w-6 h-6 rounded-full border border-gold/40 object-cover shadow-sm" 
                    />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white/95 dark:bg-[#1A1A18]/95 backdrop-blur-xl border border-[#E7E2D8] dark:border-white/5 rounded-xl overflow-hidden shadow-2xl z-50 animate-fade-in py-1">
                    <div className="px-4 py-2.5 border-b border-white/10 dark:border-white/5 bg-white/5 dark:bg-white/[0.02]">
                      <p className="text-xs text-[var(--text-secondary)] tracking-wider uppercase font-semibold">Logged in as</p>
                      <p className="text-sm font-semibold gold truncate">
                        {user.profile?.first_name ? `${user.profile.first_name}` : "User"}
                      </p>
                    </div>
                    <Link 
                      to="/account" 
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-primary)] hover:text-[var(--gold-text)] hover:bg-white/5 transition-colors font-medium"
                      onClick={() => setProfileOpen(false)}
                    >
                      👤 My Profile
                    </Link>
                    <Link 
                      to="/account" 
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-primary)] hover:text-[var(--gold-text)] hover:bg-white/5 transition-colors font-medium"
                      onClick={() => setProfileOpen(false)}
                    >
                      📦 My Orders
                    </Link>
                    {user.profile?.role === "vendor" && (
                      <Link 
                        to="/vendor/dashboard" 
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--gold-text)] font-semibold hover:text-[var(--gold-text)] hover:bg-white/5 transition-colors border-t border-white/10 dark:border-white/5"
                        onClick={() => setProfileOpen(false)}
                      >
                        📈 Vendor Dashboard
                      </Link>
                    )}
                    {user.profile?.role === "admin" && (
                      <Link 
                        to="/admin/dashboard" 
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--gold-text)] font-semibold hover:text-[var(--gold-text)] hover:bg-white/5 transition-colors border-t border-white/10 dark:border-white/5"
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
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="p-2 text-[#3d3522]/60 hover:text-[#3d3522] transition-colors flex items-center justify-center hover:scale-110" aria-label="Sign In">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-[#faf8f5]/98 backdrop-blur-2xl pt-24 px-8 flex flex-col gap-1">
          {navLinks.map((l) => (
            <Link key={l.name} to={l.to}
              className="text-lg tracking-widest uppercase text-[#3d3522]/80 hover:text-[#9d7d3a] py-3 border-b border-[#3d3522]/10 transition-colors font-medium"
              onClick={() => setMobileMenuOpen(false)}>
              {l.name}
            </Link>
          ))}
          <Link to="/wishlist" className="text-lg tracking-widest uppercase text-[#3d3522]/80 hover:text-[#9d7d3a] py-3 border-b border-[#3d3522]/10 font-medium" onClick={() => setMobileMenuOpen(false)}>
            Wishlist {wishlistCount > 0 && <span className="gold">({wishlistCount})</span>}
          </Link>
          {user ? (
            <>
              <Link to="/account" className="text-lg tracking-widest uppercase text-[#3d3522]/80 hover:text-[#9d7d3a] py-3 border-b border-[#3d3522]/10 font-medium" onClick={() => setMobileMenuOpen(false)}>
                Account ({user.profile?.first_name || "Profile"})
              </Link>
              <button onClick={async () => { await insforge.auth.signOut(); setMobileMenuOpen(false); navigate("/"); }} className="text-lg text-left tracking-widest uppercase text-red-600 hover:text-red-700 py-3 font-semibold">
                Sign Out
              </button>
            </>
          ) : (
            <Link to="/login" className="text-lg tracking-widest uppercase text-[#3d3522]/80 hover:text-[#9d7d3a] py-3 font-medium" onClick={() => setMobileMenuOpen(false)}>
              Sign In
            </Link>
          )}
        </div>
      )}
    </>
  );
}