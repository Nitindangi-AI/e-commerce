import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { insforge } from "../../lib/insforge";
import ProductCard from "../../components/ProductCard";
import { SkeletonGrid } from "../../components/SkeletonCard";
import { toast } from "../../components/GlobalToast";

export default function StorefrontView() {
  const { vendorId } = useParams();
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    loadStorefront();
  }, [vendorId]);

  const loadStorefront = async () => {
    setLoading(true);
    try {
      // 1. Fetch vendor profile (allow finding it by user_id OR vendor id)
      // Since products table links seller_id -> profiles.id, the sellerId we pass will be profiles.id (which is user_id in vendors table).
      const { data: vendorData, error: vErr } = await insforge.database
        .from("vendors")
        .select("*, profiles:user_id(*)")
        .eq("user_id", vendorId)
        .maybeSingle();

      if (vErr) throw vErr;

      setVendor(vendorData);

      if (vendorData) {
        // 2. Fetch products owned by this seller
        const { data: pData, error: pErr } = await insforge.database
          .from("products")
          .select("*")
          .eq("seller_id", vendorId)
          .order("created_at", { ascending: false });

        if (pErr) throw pErr;

        // Normalize products for ProductCard
        const normalized = (pData || []).map(p => ({
          _id: p.id,
          id: p.id,
          name: p.name,
          price: p.price,
          originalPrice: p.original_price,
          category: p.category,
          brand: p.brand,
          material: p.material,
          badge: p.badge,
          img: p.img,
          images: p.images || [],
          description: p.description,
          rating: parseFloat(p.rating) || 0,
          numReviews: p.num_reviews || 0,
          stock: p.stock,
          specs: p.specs || {},
          colors: p.colors || [],
          sizes: p.sizes || [],
          deliveryDays: p.delivery_days,
          seller: p.seller_id,
          slug: p.slug,
        }));

        setProducts(normalized);
      }
    } catch (err) {
      console.error("Failed to load vendor storefront:", err);
      toast.error("Failed to load merchant storefront.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0A0A0A] pb-20 animate-pulse">
        {/* Banner skeleton */}
        <div className="h-64 sm:h-80 w-full bg-[#E8E8E8] dark:bg-white/5" />
        
        {/* Header content skeleton */}
        <div className="max-w-7xl mx-auto px-6 -mt-16 sm:-mt-20 relative z-20">
          <div className="flex flex-col sm:flex-row sm:items-end gap-6 pb-8 border-b border-[#E8E8E8] dark:border-white/5">
            {/* Logo placeholder */}
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-[#FAFAF8] dark:bg-[#111] border border-[#E8E8E8] dark:border-white/5 flex-shrink-0" />
            
            {/* Details placeholders */}
            <div className="flex-1 space-y-3">
              <div className="h-8 w-48 bg-[#E8E8E8] dark:bg-white/5 rounded-lg" />
              <div className="h-4 w-full max-w-xl bg-[#E8E8E8] dark:bg-white/5 rounded-full" />
              <div className="h-4 w-2/3 max-w-md bg-[#E8E8E8] dark:bg-white/5 rounded-full" />
            </div>
          </div>
        </div>

        {/* Catalog grid skeleton */}
        <div className="max-w-7xl mx-auto px-6 pt-12">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-2">
              <div className="h-6 w-36 bg-[#E8E8E8] dark:bg-white/5 rounded-lg" />
              <div className="h-4 w-64 bg-[#E8E8E8] dark:bg-white/5 rounded-full" />
            </div>
            <div className="h-8 w-24 bg-[#E8E8E8] dark:bg-white/5 rounded-full" />
          </div>
          <SkeletonGrid count={4} />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] via-[#f3f0e6] to-[#e8e4d5] text-[#2b2721] flex flex-col items-center justify-center text-center px-6 pt-24 relative grain">
        <div className="absolute top-[-100px] left-[-150px] w-[500px] h-[500px] rounded-full bg-rose-300/10 blur-[120px] pointer-events-none z-0" />
        <span className="text-6xl mb-6">🏪</span>
        <h2 className="display text-3xl font-black mb-3 text-[#3d3522]">Storefront Not Found</h2>
        <p className="text-[#2b2721]/50 max-w-sm mb-8 leading-relaxed font-semibold">
          The merchant profile you are trying to visit is either private or does not exist on our marketplace.
        </p>
        <Link to="/shop" className="btn-gold px-8 py-3 rounded-full text-xs font-bold tracking-widest uppercase">
          Browse Marketplace
        </Link>
      </div>
    );
  }

  const defaultBanner = "linear-gradient(135deg, #f7f5ed 0%, #e2ddcf 100%)";
  const bannerStyle = vendor.store_banner 
    ? { backgroundImage: `url(${vendor.store_banner})`, backgroundPosition: "center", backgroundSize: "cover" }
    : { background: defaultBanner };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] via-[#f3f0e6] to-[#e8e4d5] text-[#2b2721] pb-20 relative grain">
      {/* Ambient Pastels */}
      <div className="absolute top-[-100px] left-[-150px] w-[500px] h-[500px] rounded-full bg-rose-300/10 blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[60%] left-[-100px] w-[550px] h-[550px] rounded-full bg-amber-300/10 blur-[110px] pointer-events-none z-0" />
      
      {/* Dynamic Store Banner */}
      <div className="h-64 sm:h-80 w-full relative z-10" style={bannerStyle}>
        <div className="absolute inset-0 bg-gradient-to-t from-[#f3f0e6] via-[#2b2721]/10 to-transparent" />
        
        {/* Verification seal */}
        <div className="absolute top-6 right-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/80 backdrop-blur-md border border-[#e8e4d5] text-[#7c5d1b] rounded-full text-[10px] font-extrabold tracking-wider uppercase shadow-sm">
            ✓ Verified Merchant
          </span>
        </div>
      </div>

      {/* Store Metadata Header */}
      <div className="max-w-7xl mx-auto px-6 -mt-16 sm:-mt-20 relative z-20">
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 pb-8 border-b border-[#e8e4d5]">
          
          {/* Logo container */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-white/70 border border-[#e8e4d5] backdrop-blur-md flex items-center justify-center font-bold text-[#7c5d1b] text-4xl shadow-2xl relative overflow-hidden flex-shrink-0">
            {vendor.store_logo ? (
              <img src={vendor.store_logo} alt={vendor.store_name} loading="lazy" width="144" height="144" className="w-full h-full object-cover" />
            ) : (
              vendor.store_name?.charAt(0).toUpperCase()
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h1 className="display text-3xl sm:text-4xl font-black tracking-tight mb-2 truncate text-[#3d3522]">{vendor.store_name}</h1>
            <p className="text-[#2b2721]/60 text-xs sm:text-sm max-w-2xl leading-relaxed font-semibold">
              Curated and verified partner boutique under Trendz Marketplace. 
              Delivering premium luxury goods and bespoke design products direct to your doorstep.
            </p>
          </div>
        </div>
      </div>

      {/* Active Inventory Listings */}
      <div className="max-w-7xl mx-auto px-6 pt-12 relative z-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="display text-2xl font-bold text-[#3d3522]">Active Inventory</h2>
            <p className="text-[#2b2721]/50 text-xs font-semibold">Exquisite styles and luxury designs curated by this merchant.</p>
          </div>
          <span className="text-xs font-extrabold text-[#2b2721]/60 border border-[#e8e4d5] px-3.5 py-1.5 rounded-full uppercase tracking-wider bg-white/50 shadow-sm">
            {products.length} Products
          </span>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-24 bg-white/50 border border-[#e8e4d5] rounded-2xl shadow-sm">
            <span className="text-5xl">📦</span>
            <h3 className="font-bold text-lg mt-4 mb-2 text-[#3d3522]">No Active Catalog Listings</h3>
            <p className="text-[#2b2721]/50 text-sm max-w-xs mx-auto leading-relaxed font-semibold">
              This seller has not loaded any product listings yet. Check back soon for exclusive drops!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
