import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { productAPI, reviewAPI } from "../../services/api";
import ProductCard from "../../components/ProductCard";
import { useCartStore } from "../../store/useCartStore";
import { useWishlistStore } from "../../store/useWishlistStore";
import { useRecentlyViewedStore } from "../../store/useRecentlyViewedStore";
import { insforge } from "../../lib/insforge";
import toast from "react-hot-toast";

function StarRating({ rating, size = "w-4 h-4" }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} className={`${size} ${s <= Math.round(rating) ? "text-gold" : "text-white/15"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function ProductDetails() {
  const { id } = useParams();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [freqBought, setFreqBought] = useState([]);
  const [vendorInfo, setVendorInfo] = useState(null);

  const addToCart = useCartStore(state => state.addToCart);
  const toggleWishlist = useWishlistStore(state => state.toggleWishlist);
  const isInWishlist = useWishlistStore(state => product ? state.isInWishlist(product.id) : false);
  const addToRecentlyViewed = useRecentlyViewedStore(state => state.addToRecentlyViewed);
  const navigate = useNavigate();

  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [pincode, setPincode] = useState("");
  const [pincodeResult, setPincodeResult] = useState(null);
  const [activeTab, setActiveTab] = useState("description");
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Review Form States
  const [currentUser, setCurrentUser] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchProductData = async () => {
    try {
      const prodRes = await productAPI.getById(id);
      if (prodRes.success) {
        setProduct(prodRes.product);

        // Load vendor/seller info for the seller badge
        if (prodRes.product.seller) {
          try {
            const { data: vData } = await insforge.database
              .from('vendors')
              .select('store_name, store_logo, status, user_id')
              .eq('user_id', prodRes.product.seller)
              .eq('status', 'approved')
              .maybeSingle();
            setVendorInfo(vData || null);
          } catch (vErr) {
            console.error('Failed to load vendor info:', vErr);
          }
        }

        // Load reviews
        const revRes = await reviewAPI.getForProduct(prodRes.product.id);
        if (revRes.success) setReviews(revRes.reviews || []);
        // Load related
        const relRes = await productAPI.getRelated(prodRes.product.id);
        if (relRes.success) {
          setRelatedProducts(relRes.products || []);
          setFreqBought(relRes.products.slice(0, 2));
        }
      }
    } catch (err) {
      console.error("Failed to load product data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchProductData();
  }, [id]);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await insforge.auth.getUser();
      setCurrentUser(data?.user || null);
    };
    checkUser();
  }, []);

  useEffect(() => {
    if (product) {
      addToRecentlyViewed(product);
      setSelectedImage(0);
      setSelectedColor(0);
      setSelectedSize(product.sizes?.length ? 0 : null);
      setQty(1);
      setPincodeResult(null);
    }
  }, [product]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await reviewAPI.create(product.id, {
        rating: reviewRating,
        title: reviewTitle,
        text: reviewText,
      });
      toast.success("Review submitted successfully!");
      setReviewTitle("");
      setReviewText("");
      await fetchProductData();
    } catch (err) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleHelpful = async (reviewId) => {
    try {
      await reviewAPI.markHelpful(reviewId);
      toast.success("Marked as helpful!");
      const revRes = await reviewAPI.getForProduct(product.id);
      if (revRes.success) setReviews(revRes.reviews || []);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-luxe-dark text-white flex items-center justify-center pt-24">
        <svg className="w-10 h-10 animate-spin text-gold" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center pt-24">
        <h2 className="display text-4xl font-black mb-4">Product Not Found</h2>
        <p className="text-white/50 mb-8">The product you're looking for doesn't exist.</p>
        <Link to="/shop" className="btn-gold px-8 py-3 rounded-full text-sm tracking-widest uppercase">Back to Shop</Link>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [product.img];
  const formatPrice = (price) => `₹${price.toLocaleString("en-IN")}`;
  const discount = product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + (product.deliveryDays || 3));
  const deliveryDateStr = deliveryDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  const handleAddToCart = () => {
    if (product.sizes?.length && selectedSize === null) { toast.error("Please select a size"); return; }
    const colorVal = product.colors?.[selectedColor] || '';
    const sizeVal = product.sizes?.[selectedSize] || '';
    addToCart(product, colorVal, sizeVal);
    toast.success(`${product.name} added to cart!`);
  };

  const checkPincode = () => {
    if (pincode.length !== 6) { toast.error("Enter a valid 6-digit pincode"); return; }
    setPincodeResult({ available: true, days: product.deliveryDays || 3, cod: true });
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const text = `Check out ${product.name} on LUXE!`;
    const links = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      copy: null,
    };
    if (platform === "copy") {
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    } else {
      window.open(links[platform], "_blank");
    }
    setShowShareMenu(false);
  };

  return (
    <div className="pt-20">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center gap-2 text-xs text-white/40 tracking-wider flex-wrap">
          <Link to="/" className="hover:text-white transition-colors">Home</Link><span>/</span>
          <Link to="/shop" className="hover:text-white transition-colors">Shop</Link><span>/</span>
          <Link to={`/shop?category=${product.category}`} className="hover:text-white transition-colors">{product.category}</Link><span>/</span>
          <span className="text-white/70">{product.name}</span>
        </div>
      </div>

      {/* Product Section */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col lg:flex-row gap-10">
        {/* Image Gallery */}
        <div className="lg:w-1/2">
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:max-h-[500px]">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all ${i === selectedImage ? "border-gold" : "border-white/10 hover:border-white/30"}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {/* Main Image */}
            <div className="relative flex-1 bg-luxe-card rounded-2xl overflow-hidden aspect-square border border-white/5 group">
              <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              {product.badge && (
                <span className={`absolute top-4 left-4 text-[10px] tracking-widest uppercase px-3 py-1 rounded-full font-semibold tag-${product.badge.toLowerCase()}`}>{product.badge}</span>
              )}
              {product.stock <= 5 && (
                <div className="absolute bottom-4 left-4 bg-red-500/90 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Only {product.stock} left!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="lg:w-1/2 flex flex-col">
          <p className="text-white/40 text-xs tracking-[0.3em] uppercase mb-1">{product.brand} · {product.category}</p>
          <h1 className="display text-3xl md:text-4xl font-black mb-3">{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1.5 bg-green-500/10 text-green-400 px-2.5 py-1 rounded-lg text-sm font-bold">
              {product.rating} <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            </div>
            <span className="text-white/50 text-sm">{product.reviews} Ratings & Reviews</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3 mb-1">
            <span className="gold font-bold text-3xl">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <>
                <span className="text-white/25 text-lg line-through">{formatPrice(product.originalPrice)}</span>
                <span className="text-green-400 text-sm font-semibold">{discount}% off</span>
              </>
            )}
          </div>
          <p className="text-green-400/70 text-xs mb-6">inclusive of all taxes</p>

          {/* Seller Badge */}
          {vendorInfo && (
            <Link to={`/store/${vendorInfo.user_id}`}
              className="flex items-center gap-3 mb-6 p-3 bg-white/[0.02] border border-white/8 rounded-xl hover:border-yellow-500/30 hover:bg-yellow-500/[0.02] transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#d4af37]/20 to-[#f5d26e]/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
                {vendorInfo.store_logo ? (
                  <img src={vendorInfo.store_logo} alt={vendorInfo.store_name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <span className="text-yellow-500 font-bold text-sm">{vendorInfo.store_name?.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white truncate">{vendorInfo.store_name}</span>
                  <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full font-bold tracking-wider uppercase">✓ Verified</span>
                </div>
                <p className="text-[10px] text-white/35 tracking-wider">TRENDZ Partner · View Storefront →</p>
              </div>
              <svg className="w-4 h-4 text-white/20 group-hover:text-yellow-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}

          {/* Colors */}
          {product.colors && (
            <div className="mb-5">
              <span className="text-xs tracking-widest uppercase text-white/40 block mb-2">Color: <span className="text-white/70">{product.colors[selectedColor]}</span></span>
              <div className="flex gap-2">
                {product.colors.map((c, i) => (
                  <button key={c} onClick={() => setSelectedColor(i)}
                    className={`px-4 py-2 rounded-lg text-xs border transition-all ${i === selectedColor ? "border-gold text-gold bg-gold/5" : "border-white/10 text-white/50 hover:border-white/30"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {product.sizes && (
            <div className="mb-6">
              <span className="text-xs tracking-widest uppercase text-white/40 block mb-2">Size</span>
              <div className="flex gap-2 flex-wrap">
                {product.sizes.map((s, i) => (
                  <button key={s} onClick={() => setSelectedSize(i)}
                    className={`w-14 h-10 rounded-lg text-xs border font-medium transition-all ${i === selectedSize ? "border-gold text-gold bg-gold/5" : "border-white/10 text-white/50 hover:border-white/30"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Add to Cart + Buy Now */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center border border-white/10 rounded-xl">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-4 py-3 text-white/50 hover:text-white">−</button>
              <span className="px-4 text-sm font-medium w-10 text-center">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="px-4 py-3 text-white/50 hover:text-white">+</button>
            </div>
            <button onClick={handleAddToCart} className="btn-gold px-6 py-3.5 rounded-xl text-sm tracking-widest uppercase font-semibold flex-1">Add to Cart</button>
            <button onClick={() => { toggleWishlist(product); toast(isInWishlist ? "Removed from wishlist" : "Added to wishlist ♡", { icon: isInWishlist ? "💔" : "❤️" }); }}
              className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all flex-shrink-0 ${isInWishlist ? "border-gold/50 text-gold bg-gold/10" : "border-white/15 text-white/40 hover:border-white/30"}`}>
              <svg className="w-5 h-5" fill={isInWishlist ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
          <div className="flex gap-3 mb-6">
            <button onClick={() => { handleAddToCart(); navigate("/checkout"); }} className="flex-1 py-3.5 rounded-xl text-sm tracking-widest uppercase font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors">Buy Now</button>
            <div className="relative">
              <button onClick={() => setShowShareMenu(!showShareMenu)} className="h-full px-4 rounded-xl border border-white/15 text-white/40 hover:border-white/30 flex items-center justify-center transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </button>
              {showShareMenu && (
                <div className="absolute right-0 top-14 bg-luxe-card border border-white/10 rounded-xl p-2 z-30 min-w-[140px] shadow-xl">
                  {[["whatsapp", "WhatsApp"], ["twitter", "Twitter"], ["copy", "Copy Link"]].map(([key, label]) => (
                    <button key={key} onClick={() => handleShare(key)} className="w-full text-left px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors">{label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Delivery Check */}
          <div className="border border-white/5 rounded-xl p-5 mb-6 bg-luxe-card/50">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span className="text-sm font-medium">Delivery & Availability</span>
            </div>
            <div className="flex gap-2">
              <input value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter Pincode"
                className="input-field flex-1 px-4 py-2.5 rounded-lg text-sm" maxLength={6} />
              <button onClick={checkPincode} className="text-gold text-sm font-semibold hover:underline px-2">Check</button>
            </div>
            {pincodeResult && (
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-green-400"><span>✓</span> Delivery by <strong>{deliveryDateStr}</strong></div>
                {pincodeResult.cod && <div className="flex items-center gap-2 text-white/50"><span>✓</span> Cash on Delivery available</div>}
                <div className="flex items-center gap-2 text-white/50"><span>✓</span> Free shipping {product.price >= 5000 ? "on this order" : "on orders above ₹5,000"}</div>
              </div>
            )}
            {!pincodeResult && (
              <p className="text-white/30 text-xs mt-2">Usually delivered in {product.deliveryDays || 3}-{(product.deliveryDays || 3) + 2} business days</p>
            )}
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-2 gap-3">
            {[["🚚", "Free Express Delivery"], ["🔒", "Secure Checkout"], ["↩️", "30-Day Returns"], ["✦", "100% Authentic"]].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-2.5 text-white/50 text-xs"><span className="text-base">{icon}</span>{text}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs: Description / Specifications / Reviews */}
      <div className="max-w-7xl mx-auto px-6 py-10 border-t border-white/5">
        <div className="flex gap-0 border-b border-white/5 mb-8 overflow-x-auto">
          {["description", "specifications", "reviews"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-sm tracking-widest uppercase whitespace-nowrap border-b-2 transition-all ${activeTab === tab ? "border-gold text-gold" : "border-transparent text-white/40 hover:text-white/70"}`}>
              {tab} {tab === "reviews" && `(${reviews.length})`}
            </button>
          ))}
        </div>

        {/* Description Tab */}
        {activeTab === "description" && (
          <div className="max-w-3xl">
            <p className="text-white/60 leading-relaxed text-sm">{product.description}</p>
          </div>
        )}

        {/* Specifications Tab */}
        {activeTab === "specifications" && product.specs && (
          <div className="max-w-2xl">
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(product.specs).map(([key, value], i) => (
                  <tr key={key} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
                    <td className="text-white/40 py-3 px-4 w-1/3">{key}</td>
                    <td className="text-white/80 py-3 px-4">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === "reviews" && (
          <div className="max-w-3xl">
            {/* Write a Review Form */}
            {currentUser ? (
              <form onSubmit={handleReviewSubmit} className="mb-8 bg-luxe-card p-6 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-lg font-bold text-white">Write a Customer Review</h3>
                
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/60">Rating:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button type="button" key={star} onClick={() => setReviewRating(star)} className="text-gold focus:outline-none">
                        <svg className={`w-6 h-6 ${star <= reviewRating ? "text-gold" : "text-white/15"}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-white/40 mb-1">Review Title</label>
                  <input value={reviewTitle} onChange={e => setReviewTitle(e.target.value)} required placeholder="Summarize your experience..." className="input-field w-full px-4 py-2.5 rounded-xl text-sm placeholder-white/20" />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-white/40 mb-1">Detailed Review</label>
                  <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} required placeholder="What did you like or dislike? How does the size fit?" rows={4} className="input-field w-full px-4 py-2.5 rounded-xl text-sm resize-none placeholder-white/20" />
                </div>

                <button type="submit" disabled={submittingReview} className="btn-gold px-6 py-3 rounded-xl text-xs font-bold tracking-widest uppercase disabled:opacity-50">
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </form>
            ) : (
              <div className="mb-8 p-6 bg-luxe-card/40 border border-white/5 rounded-2xl text-center">
                <p className="text-sm text-white/50 mb-3">You must be logged in to leave a review.</p>
                <Link to="/login" className="text-gold hover:underline text-sm font-semibold">Sign In to Continue</Link>
              </div>
            )}

            {/* Rating Summary */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-8 p-6 bg-luxe-card rounded-2xl border border-white/5">
              <div className="text-center w-full md:w-auto md:border-r md:border-white/5 md:pr-10">
                <div className="text-4xl font-bold gold mb-1">{product.rating}</div>
                <div className="flex justify-center mb-1"><StarRating rating={product.rating} /></div>
                <p className="text-white/40 text-xs">{reviews.length} reviews</p>
              </div>
              <div className="flex-1 w-full space-y-2">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = reviews.filter(r => r.rating === star).length;
                  const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="text-white/40 w-3">{star}</span>
                      <svg className="w-3 h-3 text-gold" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full gold-bg rounded-full" style={{ width: `${pct}%` }} /></div>
                      <span className="text-white/30 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
 
            {/* Individual Reviews */}
            <div className="space-y-6">
              {reviews.length === 0 ? (
                <p className="text-center py-10 text-white/35 text-sm">No reviews yet for this product. Be the first to share your thoughts!</p>
              ) : (
                reviews.map(review => (
                  <div key={review._id || review.id} className="border-b border-white/5 pb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1 bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-xs font-bold">
                        {review.rating} ★
                      </div>
                      <span className="font-medium text-sm">{review.title}</span>
                    </div>
                    <p className="text-white/50 text-sm mb-3">{review.text}</p>
                    <div className="flex items-center gap-4 text-xs text-white/30">
                      <span>{review.user?.firstName ? `${review.user.firstName} ${review.user.lastName || ""}` : "Guest"}</span>
                      {review.verified && <span className="text-green-400/70">✓ Verified Purchase</span>}
                      <span>{new Date(review.createdAt || review.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <button onClick={() => handleHelpful(review._id || review.id)} className="hover:text-white transition-colors flex items-center gap-1">👍 Helpful ({review.helpful || 0})</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Frequently Bought Together */}
      {freqBought.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-10 border-t border-white/5">
          <h2 className="display text-2xl font-black mb-8">Frequently Bought Together</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-luxe-card border border-white/5 rounded-2xl p-4 flex-shrink-0 w-36">
              <img src={product.img} alt="" className="w-full aspect-square object-cover rounded-xl mb-2" />
              <p className="text-xs truncate text-white/70">{product.name}</p>
              <p className="gold text-sm font-semibold">{formatPrice(product.price)}</p>
            </div>
            {freqBought.map(fp => (
              <div key={fp.id} className="flex items-center gap-4">
                <span className="text-2xl text-white/20 font-light">+</span>
                <Link to={`/product/${fp.id}`} className="bg-luxe-card border border-white/5 rounded-2xl p-4 w-36 hover:border-gold/20 transition-colors">
                  <img src={fp.img} alt="" className="w-full aspect-square object-cover rounded-xl mb-2" />
                  <p className="text-xs truncate text-white/70">{fp.name}</p>
                  <p className="gold text-sm font-semibold">{formatPrice(fp.price)}</p>
                </Link>
              </div>
            ))}
            <div className="flex items-center gap-4 ml-4">
              <span className="text-2xl text-white/20 font-light">=</span>
              <div className="text-center">
                <p className="text-white/40 text-xs mb-1">Total Price</p>
                <p className="gold text-xl font-bold">{formatPrice(product.price + freqBought.reduce((t, p) => t + p.price, 0))}</p>
                <button onClick={() => { addToCart(product); freqBought.forEach(p => addToCart(p)); toast.success("All items added to cart!"); }}
                  className="btn-gold px-5 py-2 rounded-lg text-xs tracking-widest uppercase mt-2">Add All to Cart</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-14 border-t border-white/5">
          <h2 className="display text-2xl font-black mb-8">Similar Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
