import { useState, useEffect } from "react";
import { useCartStore } from "../../store/useCartStore";
import { couponAPI } from "../../services/api";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function CartPage() {
  const cartItems = useCartStore((state) => state.cartItems);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [showCoupons, setShowCoupons] = useState(false);
  const [coupons, setCoupons] = useState([]);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const res = await couponAPI.getAll();
        if (res.success) setCoupons(res.coupons || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCoupons();
  }, []);

  const subtotal = cartItems.reduce((t, i) => t + i.price * i.quantity, 0);
  const shipping = subtotal > 5000 ? 0 : 299;

  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === "percent") {
      couponDiscount = Math.round(subtotal * (appliedCoupon.discount / 100));
      if (appliedCoupon.max_discount) couponDiscount = Math.min(couponDiscount, appliedCoupon.max_discount);
    } else {
      couponDiscount = appliedCoupon.discount;
    }
  }

  const total = subtotal + shipping - couponDiscount;
  const formatPrice = (p) => `₹${p.toLocaleString("en-IN")}`;
  const totalItems = cartItems.reduce((t, i) => t + i.quantity, 0);

  const applyCoupon = async (code) => {
    const targetCode = code || couponCode;
    if (!targetCode) { toast.error("Please enter a coupon code"); return; }
    try {
      const res = await couponAPI.validate(targetCode, subtotal);
      if (res.success) {
        setAppliedCoupon(res.coupon);
        setCouponCode(res.coupon.code);
        setShowCoupons(false);
        toast.success(`Coupon "${res.coupon.code}" applied!`);
      }
    } catch (err) {
      toast.error(err.message || "Failed to apply coupon");
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast("Coupon removed");
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pt-28 pb-20 min-h-screen">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-white/40 tracking-wider mb-8">
        <Link to="/" className="hover:text-white transition-colors">Home</Link><span>/</span><span className="text-white/70">Cart</span>
      </div>

      <div className="flex items-center justify-between mb-10">
        <h1 className="display text-4xl font-black">Shopping Cart <span className="text-white/30 text-lg font-sans font-normal">({totalItems} items)</span></h1>
        {cartItems.length > 0 && (
          <button onClick={() => { clearCart(); setAppliedCoupon(null); toast.success("Cart cleared"); }}
            className="text-xs tracking-widest uppercase text-white/30 hover:text-red-400 transition-colors">Clear All</button>
        )}
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center py-24 border border-white/5 rounded-2xl bg-luxe-card">
          <svg className="w-16 h-16 mx-auto mb-6 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <p className="text-white/50 text-lg mb-2">Your cart is empty</p>
          <p className="text-white/30 text-sm mb-8">Looks like you haven't added any items yet.</p>
          <Link to="/shop" className="btn-gold px-8 py-3 rounded-full text-sm tracking-widest uppercase">Continue Shopping</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div key={`${item.id}-${item.selectedColor}-${item.selectedSize}`} className="flex gap-4 sm:gap-6 border border-white/5 p-4 rounded-2xl bg-luxe-card items-center hover:border-gold/10 transition-colors">
                <Link to={`/product/${item.id}`} className="flex-shrink-0">
                  <img src={item.img} alt={item.name} className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${item.id}`} className="font-medium hover:text-gold transition-colors line-clamp-1">{item.name}</Link>
                  <p className="text-white/40 text-xs tracking-wider mt-0.5">{item.category}</p>
                  {item.selectedColor && <p className="text-white/30 text-xs mt-0.5">Color: {item.selectedColor}</p>}
                  {item.selectedSize && <p className="text-white/30 text-xs">Size: {item.selectedSize}</p>}
                  <p className="gold font-semibold mt-1">{formatPrice(item.price)}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
                  <div className="flex items-center border border-white/10 rounded-full">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedColor, item.selectedSize)} className="px-3 py-1.5 text-white/50 hover:text-white text-sm">−</button>
                    <span className="px-3 text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedColor, item.selectedSize)} className="px-3 py-1.5 text-white/50 hover:text-white text-sm">+</button>
                  </div>
                  <p className="gold font-semibold text-sm whitespace-nowrap hidden sm:block">{formatPrice(item.price * item.quantity)}</p>
                  <button onClick={() => { removeFromCart(item.id, item.selectedColor, item.selectedSize); toast.success("Item removed"); }}
                    className="text-white/20 hover:text-red-400 transition-colors p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            {/* Coupon Section */}
            <div className="border border-white/5 p-6 rounded-2xl bg-luxe-card">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                Apply Coupon
              </h3>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3">
                  <div>
                    <span className="text-green-400 font-bold text-sm">{appliedCoupon.code}</span>
                    <p className="text-green-400/60 text-xs mt-0.5">Saving {formatPrice(couponDiscount)}</p>
                  </div>
                  <button onClick={removeCoupon} className="text-red-400 text-xs hover:underline">Remove</button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Enter code"
                      className="input-field flex-1 px-4 py-2.5 rounded-xl text-sm uppercase tracking-wider" />
                    <button onClick={() => applyCoupon()} className="text-gold text-sm font-semibold hover:underline px-2">Apply</button>
                  </div>
                  <button onClick={() => setShowCoupons(!showCoupons)} className="text-gold text-xs mt-3 hover:underline block">
                    {showCoupons ? "Hide" : "View"} available coupons
                  </button>
                  {showCoupons && (
                    <div className="mt-3 space-y-2">
                      {coupons.map(c => (
                        <div key={c.code} className="border border-dashed border-white/10 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <span className="font-mono text-sm font-bold gold">{c.code}</span>
                            <p className="text-white/40 text-xs mt-0.5">{c.description}</p>
                          </div>
                          <button onClick={() => applyCoupon(c.code)} className="text-xs text-gold font-semibold hover:underline whitespace-nowrap ml-3">Apply</button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="border border-white/5 p-6 rounded-2xl bg-luxe-card">
              <h2 className="text-lg font-bold mb-5">Price Details</h2>
              <div className="space-y-3 text-sm border-b border-white/10 pb-5 mb-5">
                <div className="flex justify-between"><span className="text-white/60">Price ({totalItems} items)</span><span>{formatPrice(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-white/60">Delivery</span><span className={shipping === 0 ? "text-green-400" : ""}>{shipping === 0 ? "FREE" : formatPrice(shipping)}</span></div>
                {appliedCoupon && (
                  <div className="flex justify-between text-green-400"><span>Coupon Discount</span><span>−{formatPrice(couponDiscount)}</span></div>
                )}
              </div>
              <div className="flex justify-between text-lg font-bold mb-6">
                <span>Total Amount</span><span className="gold">{formatPrice(total)}</span>
              </div>
              {appliedCoupon && (
                <p className="text-green-400 text-xs mb-4 bg-green-500/5 px-3 py-2 rounded-lg text-center">
                  You're saving {formatPrice(couponDiscount + (shipping === 0 ? 299 : 0))} on this order!
                </p>
              )}
              <Link to="/checkout" state={{ appliedCoupon, couponDiscount }} className="w-full btn-gold py-4 rounded-xl tracking-widest uppercase text-sm font-bold block text-center">
                Proceed to Checkout
              </Link>
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-white/30">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Safe & Secure Payment
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
