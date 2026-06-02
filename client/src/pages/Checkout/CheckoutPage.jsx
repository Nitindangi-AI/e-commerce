import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCartStore } from "../../store/useCartStore";
import { orderAPI, authAPI, addressAPI } from "../../services/api";
import toast from "react-hot-toast";

import AddressForm from "../../components/AddressForm";

const STEPS = ["Address", "Payment", "Review"];

export default function CheckoutPage() {
  const cartItems = useCartStore(s => s.cartItems);
  const clearCart = useCartStore(s => s.clearCart);
  const navigate = useNavigate();
  const location = useLocation();
  
  const appliedCoupon = location.state?.appliedCoupon || null;
  const couponDiscount = location.state?.couponDiscount || 0;

  const [step, setStep] = useState(0);
  const [address, setAddress] = useState({ name: "", phone: "", line1: "", city: "", state: "", pincode: "", country: "India", district: "", area: "", landmark: "", label: "Home" });
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [payment, setPayment] = useState("cod");
  const [placing, setPlacing] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    authAPI.getMe().then(d => setUser(d.user)).catch(() => {});
  }, []);

  const subtotal = cartItems.reduce((t, i) => t + i.price * i.quantity, 0);
  const shipping = subtotal > 5000 ? 0 : 299;
  const total = subtotal + shipping - couponDiscount;
  const fmt = (p) => `₹${p.toLocaleString("en-IN")}`;
  const totalItems = cartItems.reduce((t, i) => t + i.quantity, 0);

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center pt-28">
        <p className="text-white/50 text-lg mb-4">Your cart is empty</p>
        <Link to="/shop" className="btn-gold px-8 py-3 rounded-full text-sm tracking-widest uppercase">Continue Shopping</Link>
      </div>
    );
  }

  const handleNextStep1 = () => {
    const { name, phone, line1, city, state, pincode, area } = address;
    if (!name || !phone || !line1 || !city || !state || !pincode || !area) {
      toast.error("Please fill all required fields");
      return;
    }
    if (pincode.length !== 6) {
      toast.error("Enter a valid 6-digit pincode");
      return;
    }
    if (!isAddressValid) {
      toast.error("Delivery is unavailable for this location");
      return;
    }
    setStep(1);
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error("Please login to place an order");
      navigate("/login");
      return;
    }

    setPlacing(true);
    try {
      const orderData = {
        orderItems: cartItems.map(item => ({
          product: item._id || item.id,
          quantity: item.quantity,
          color: item.selectedColor || "",
          size: item.selectedSize || "",
        })),
        shippingAddress: address,
        paymentMethod: payment,
        couponCode: appliedCoupon?.code || null,
        discount: couponDiscount,
      };

      const data = await orderAPI.create(orderData);
      
      // Save this address in the permanent InsForge addresses table
      try {
        await addressAPI.add(address);
      } catch (addrErr) {
        console.warn("Failed to permanently save address to profile:", addrErr);
      }

      clearCart();
      navigate("/order-success", { state: { order: data.order } });
    } catch (err) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 pt-28 pb-20 min-h-screen">
      {/* Steps */}
      <div className="flex items-center justify-center gap-2 mb-12">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= step ? "gold-bg text-black" : "bg-white/5 text-white/30"}`}>{i + 1}</div>
            <span className={`text-xs tracking-widest uppercase hidden sm:block ${i <= step ? "text-white" : "text-white/30"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`w-12 sm:w-20 h-px ${i < step ? "bg-gold" : "bg-white/10"}`} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Form */}
        <div className="lg:col-span-2">
          {/* Step 0: Address */}
          {step === 0 && (
            <div className="bg-luxe-card border border-white/5 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">📍 Delivery Address</h2>
              
              <AddressForm 
                address={address} 
                setAddress={setAddress} 
                onValidate={setIsAddressValid} 
              />
              
              <button onClick={handleNextStep1} className="btn-gold w-full py-4 rounded-xl text-sm tracking-widest uppercase font-bold mt-6">Deliver Here</button>
            </div>
          )}

          {/* Step 1: Payment */}
          {step === 1 && (
            <div className="bg-luxe-card border border-white/5 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">💳 Payment Method</h2>
              <div className="space-y-3">
                {[["cod","Cash on Delivery","Pay when your order arrives","🏠"],["upi","UPI / Google Pay","Instant payment via UPI","📱"],["card","Credit / Debit Card","Visa, Mastercard, Rupay","💳"],["netbanking","Net Banking","All major banks supported","🏦"]].map(([val, title, desc, icon]) => (
                  <label key={val} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${payment === val ? "border-gold/50 bg-gold/5" : "border-white/5 hover:border-white/15"}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${payment === val ? "border-gold" : "border-white/20"}`}>
                      {payment === val && <div className="w-2.5 h-2.5 rounded-full gold-bg" />}
                    </div>
                    <div className="flex-1"><p className="text-sm font-medium">{icon} {title}</p><p className="text-xs text-white/40">{desc}</p></div>
                    <input type="radio" name="payment" value={val} checked={payment === val} onChange={() => setPayment(val)} className="hidden" />
                  </label>
                ))}
              </div>
              {payment !== "cod" && (
                <div className="mt-4 p-3 rounded-xl bg-gold/5 border border-gold/20">
                  <p className="text-xs text-gold">💡 Payment will be processed securely. The seller's payment details will be shown after order confirmation.</p>
                </div>
              )}
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(0)} className="btn-outline px-6 py-3 rounded-xl text-sm">← Back</button>
                <button onClick={() => setStep(2)} className="btn-gold flex-1 py-3 rounded-xl text-sm tracking-widest uppercase font-bold">Continue</button>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-luxe-card border border-white/5 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">📍 Delivery Address</h3>
                  <button onClick={() => setStep(0)} className="text-xs text-gold hover:underline">Change</button>
                </div>
                <p className="text-sm text-white/70">{address.name} · {address.phone}</p>
                <p className="text-xs text-white/40">{address.line1}{address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} - {address.pincode}</p>
              </div>
              <div className="bg-luxe-card border border-white/5 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">💳 Payment</h3>
                  <button onClick={() => setStep(1)} className="text-xs text-gold hover:underline">Change</button>
                </div>
                <p className="text-sm text-white/70 capitalize">{payment === "cod" ? "Cash on Delivery" : payment === "upi" ? "UPI / Google Pay" : payment === "card" ? "Credit / Debit Card" : "Net Banking"}</p>
              </div>
              <div className="bg-luxe-card border border-white/5 rounded-2xl p-5">
                <h3 className="text-sm font-semibold mb-4">📦 Items ({totalItems})</h3>
                <div className="space-y-3">
                  {cartItems.map(item => (
                    <div key={item.id || item._id} className="flex items-center gap-4">
                      <img src={item.img} alt="" className="w-14 h-14 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0"><p className="text-sm truncate">{item.name}</p><p className="text-xs text-white/40">Qty: {item.quantity}</p></div>
                      <span className="gold text-sm font-semibold">{fmt(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Return Policy Notice */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
                <span className="text-lg">🔄</span>
                <div>
                  <p className="text-sm font-medium text-emerald-400">5-Day Free Returns</p>
                  <p className="text-xs text-white/40">All items are eligible for free returns within 5 days of delivery. No return shipping costs.</p>
                </div>
              </div>
              <button onClick={handlePlaceOrder} disabled={placing}
                className="btn-gold w-full py-4 rounded-xl text-sm tracking-widest uppercase font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                {placing ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Placing Order...</>) : `Place Order · ${fmt(total)}`}
              </button>
            </div>
          )}
        </div>

        {/* Right: Summary */}
        <div className="bg-luxe-card border border-white/5 rounded-2xl p-6 h-fit sticky top-24">
          <h3 className="font-bold mb-4">Order Summary</h3>
          <div className="space-y-2 text-sm border-b border-white/10 pb-4 mb-4">
            <div className="flex justify-between"><span className="text-white/50">Items ({totalItems})</span><span>{fmt(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-white/50">Delivery</span><span className={shipping === 0 ? "text-green-400" : ""}>{shipping === 0 ? "FREE" : fmt(shipping)}</span></div>
            {appliedCoupon && (
              <div className="flex justify-between text-green-400"><span>Coupon ({appliedCoupon.code})</span><span>−{fmt(couponDiscount)}</span></div>
            )}
          </div>
          <div className="flex justify-between font-bold text-lg mb-2"><span>Total</span><span className="gold">{fmt(total)}</span></div>
          <p className="text-green-400/70 text-xs">You save {fmt((cartItems.reduce((t, i) => t + ((i.originalPrice || i.price) - i.price) * i.quantity, 0)) + (shipping === 0 ? 299 : 0) + couponDiscount)} on this order</p>
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span>🔄</span>
              <span>5-Day Free Return Policy on all items</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
