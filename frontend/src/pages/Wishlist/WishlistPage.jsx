import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useWishlistStore } from "../../store/useWishlistStore";
import ProductCard from "../../components/ProductCard";

export default function WishlistPage() {
  const wishlistItems = useWishlistStore((state) => state.wishlistItems);
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);
  const fetchWishlist = useWishlistStore((state) => state.fetchWishlist);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  return (
    <div className="max-w-7xl mx-auto px-6 pt-28 pb-20 min-h-screen">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-white/40 tracking-wider mb-8">
        <Link to="/" className="hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <span className="text-white/70">Wishlist</span>
      </div>

      <div className="flex items-center justify-between mb-10">
        <h1 className="display text-4xl font-black">Your Wishlist</h1>
        {wishlistItems.length > 0 && (
          <button onClick={clearWishlist}
            className="text-xs tracking-widest uppercase text-white/30 hover:text-red-400 transition-colors">
            Clear All
          </button>
        )}
      </div>

      {wishlistItems.length === 0 ? (
        <div className="text-center py-24 border border-white/5 rounded-2xl bg-luxe-card">
          <svg className="w-16 h-16 mx-auto mb-6 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <p className="text-[var(--text-primary)]/80 text-lg mb-2">No saved items yet</p>
          <p className="text-[var(--text-secondary)] text-sm mb-8">Save items you love to your wishlist to check them later.</p>
          <Link to="/shop" className="btn-gold px-8 py-3.5 rounded-xl text-xs tracking-widest uppercase font-bold border-0">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {wishlistItems.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
