import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCartStore } from "../../store/useCartStore";
import { orderAPI, authAPI, addressAPI } from "../../services/api";
import toast from "react-hot-toast";
import AddressForm from "../../components/AddressForm";

const STEPS = ["Address", "Payment", "Confirm"];

export default function CheckoutPage() {
  const cartItems = useCartStore(s => s.cartItems);
  const clearCart = useCartStore(s => s.clearCart);
  const navigate = useNavigate();
  const location = useLocation();
  
  const appliedCoupon = location.state?.appliedCoupon || null;
  const couponDiscount = location.state?.couponDiscount || 0;
  const shippingFee = location.state?.shippingFee ?? 99;

  const [step, setStep] = useState(0);
  
  // Address States
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [address, setAddress] = useState({ 
    name: "", phone: "", line1: "", city: "", state: "", 
    pincode: "", country: "India", district: "", area: "", 
    landmark: "", label: "Home" 
  });
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Payment States
  const [payment, setPayment] = useState("cod");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [netBank, setNetBank] = useState("sbi");

  const [placing, setPlacing] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;
    
    async function init() {
      try {
        const meRes = await authAPI.getMe();
        if (meRes?.user) {
          if (active) setUser(meRes.user);
          
          setLoadingAddresses(true);
          const addrRes = await addressAPI.getAll();
          if (active && addrRes.success && addrRes.addresses) {
            setSavedAddresses(addrRes.addresses);
            
            // Auto-select default address if available
            const defaultAddr = addrRes.addresses.find(a => a.isDefault) || addrRes.addresses[0];
            if (defaultAddr) {
              setAddress(defaultAddr);
              setSelectedAddressId(defaultAddr.id);
              setIsAddressValid(true);
            } else {
              setSelectedAddressId("new");
            }
          }
        }
      } catch (err) {
        console.error("Failed to load user or address details:", err);
      } finally {
        if (active) setLoadingAddresses(false);
      }
    }

    init();
    return () => { active = false; };
  }, []);

  const subtotal = cartItems.reduce((t, i) => t + i.price * i.quantity, 0);
  const total = subtotal + shippingFee - couponDiscount;
  const fmt = (p) => `₹${p.toLocaleString("en-IN")}`;
  const totalItems = cartItems.reduce((t, i) => t + i.quantity, 0);

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center pt-28">
        <p className="text-[var(--text-secondary)] text-lg mb-4">Your cart is empty</p>
        <Link to="/shop" className="btn-gold px-8 py-3 rounded-full text-sm tracking-widest uppercase font-bold">Continue Shopping</Link>
      </div>
    );
  }

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(addr.id);
    setAddress(addr);
    setIsAddressValid(true);
  };

  const handleNextStep1 = () => {
    if (selectedAddressId === "new") {
      const { name, phone, line1, city, state, pincode, area } = address;
      if (!name || !phone || !line1 || !city || !state || !pincode || !area) {
        toast.error("Please fill all required address fields");
        return;
      }
      if (phone.length !== 10) {
        toast.error("Enter a valid 10-digit phone number");
        return;
      }
      if (pincode.length !== 6) {
        toast.error("Enter a valid 6-digit pincode");
        return;
      }
      if (!isAddressValid) {
        toast.error("Delivery address details are invalid");
        return;
      }
    } else {
      // Saved address selected
      if (!address || !address.name || !address.line1) {
        toast.error("Please select a valid address");
        return;
      }
    }
    setStep(1);
  };

  const handleNextStep2 = () => {
    // Validate Payment details based on choice
    if (payment === "upi") {
      if (!upiId.trim() || !upiId.includes("@")) {
        toast.error("Please enter a valid UPI ID (e.g., name@okaxis)");
        return;
      }
    } else if (payment === "card") {
      if (!cardHolder.trim()) {
        toast.error("Please enter the cardholder's name");
        return;
      }
      if (cardNumber.replace(/\s/g, "").length < 16) {
        toast.error("Please enter a valid 16-digit card number");
        return;
      }
      if (cardExpiry.length < 5 || !cardExpiry.includes("/")) {
        toast.error("Please enter card expiry date in MM/YY format");
        return;
      }
      if (cardCvv.length < 3) {
        toast.error("Please enter a valid 3-digit CVV");
        return;
      }
    }
    setStep(2);
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error("Please login to place an order");
      navigate("/login");
      return;
    }

    setPlacing(true);
    try {
      let finalDetails = {};
      if (payment === "upi") {
        finalDetails.upiId = upiId;
      } else if (payment === "card") {
        finalDetails.cardHolder = cardHolder;
        finalDetails.cardNumberLast4 = cardNumber.slice(-4);
      } else if (payment === "netbanking") {
        finalDetails.bankName = netBank;
      }

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
        paymentDetails: finalDetails
      };

      const data = await orderAPI.create(orderData);
      
      // If it was a new address and checkout succeeds, save it permanently to addresses table
      if (selectedAddressId === "new") {
        try {
          await addressAPI.add(address);
        } catch (addrErr) {
          console.warn("Failed to permanently save address to profile:", addrErr);
        }
      }

      clearCart();
      toast.success("Order placed successfully!");
      navigate("/order-success", { state: { order: data.order } });
    } catch (err) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  // Helper variables for theme styling
  const cardBg = "bg-luxe-card border border-[var(--card-border)] shadow-card rounded-2xl p-6";
  const textTitle = "text-[var(--text-primary)]";
  const textSubtle = "text-[var(--text-secondary)]";
  const inputStyle = "w-full px-4 py-2.5 rounded-xl text-xs bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:border-gold";

  return (
    <div className="max-w-5xl mx-auto px-6 pt-28 pb-20 min-h-screen">
      {/* Steps progress indicator */}
      <div className="flex items-center justify-center mb-12">
        <div className="flex items-center w-full max-w-lg justify-between relative">
          {/* Progress track line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-[var(--card-border)] z-0" />
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gold transition-all duration-500 z-0"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />

          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-col items-center relative z-10">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                  i <= step 
                    ? "bg-gold text-black shadow-lg shadow-gold/20" 
                    : "bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)]"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-[10px] tracking-widest uppercase mt-2 font-bold ${i <= step ? "text-gold" : "text-[var(--text-secondary)]"}`}>
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Form sections */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Step 1: Address */}
          {step === 0 && (
            <div className={cardBg}>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gold">📍 Delivery Address</h2>
              
              {loadingAddresses ? (
                <p className="text-xs py-4 text-center">Loading saved addresses...</p>
              ) : (
                <div className="space-y-4 mb-6">
                  {savedAddresses.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)] block">Saved Addresses</span>
                      <div className="grid grid-cols-1 gap-3">
                        {savedAddresses.map(addr => (
                          <div 
                            key={addr.id}
                            onClick={() => handleSelectSavedAddress(addr)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                              selectedAddressId === addr.id 
                                ? "border-gold bg-gold/[0.03]" 
                                : "border-[var(--card-border)] hover:border-gold/30 bg-[var(--bg-gradient)]"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-black text-gold uppercase tracking-wider">{addr.label || "Address"}</span>
                              {addr.isDefault && (
                                <span className="text-[9px] bg-gold/10 text-gold px-2 py-0.5 rounded-full font-bold uppercase">Default</span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-[var(--text-primary)]">{addr.name} · {addr.phone}</p>
                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                              {addr.line1}, {addr.city}, {addr.state} - {addr.pincode}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Radio trigger to Add New Address */}
                  <label 
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                      selectedAddressId === "new" 
                        ? "border-gold bg-gold/[0.03]" 
                        : "border-[var(--card-border)] hover:border-gold/30"
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="address_select" 
                      value="new" 
                      checked={selectedAddressId === "new"} 
                      onChange={() => {
                        setSelectedAddressId("new");
                        setAddress({ 
                          name: "", phone: "", line1: "", city: "", state: "", 
                          pincode: "", country: "India", district: "", area: "", 
                          landmark: "", label: "Home" 
                        });
                        setIsAddressValid(false);
                      }}
                      className="accent-gold h-4 w-4"
                    />
                    <span className="text-xs font-bold text-[var(--text-primary)]">➕ Add a New Delivery Address</span>
                  </label>
                </div>
              )}

              {/* Show Inline Address Form if "new" address is selected */}
              {selectedAddressId === "new" && (
                <div className="border-t border-[var(--card-border)] pt-6 mt-6">
                  <AddressForm 
                    address={address} 
                    setAddress={setAddress} 
                    onValidate={setIsAddressValid} 
                  />
                </div>
              )}
              
              <button 
                onClick={handleNextStep1} 
                className="btn-gold w-full py-4 rounded-xl text-xs tracking-widest uppercase font-bold mt-6 border-0"
              >
                Deliver Here
              </button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 1 && (
            <div className={cardBg}>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gold">💳 Payment Method</h2>
              
              <div className="space-y-4">
                {/* COD option */}
                <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${payment === "cod" ? "border-gold bg-gold/[0.02]" : "border-[var(--card-border)] hover:border-gold/20"}`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="payment" 
                      value="cod" 
                      checked={payment === "cod"} 
                      onChange={() => setPayment("cod")} 
                      className="accent-gold h-4 w-4" 
                    />
                    <span className="text-sm font-bold text-[var(--text-primary)]">🏠 Cash on Delivery (COD)</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] pl-7 mt-0.5">Pay in cash or digital scan when your package is delivered.</p>
                </label>

                {/* UPI option */}
                <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${payment === "upi" ? "border-gold bg-gold/[0.02]" : "border-[var(--card-border)] hover:border-gold/20"}`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="payment" 
                      value="upi" 
                      checked={payment === "upi"} 
                      onChange={() => setPayment("upi")} 
                      className="accent-gold h-4 w-4" 
                    />
                    <span className="text-sm font-bold text-[var(--text-primary)]">📱 UPI (Google Pay, PhonePe, Paytm)</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] pl-7 mt-0.5">Instant secure payment using your personal UPI address.</p>
                  
                  {payment === "upi" && (
                    <div className="mt-3 pl-7 space-y-1.5 animate-slide-up" onClick={e => e.stopPropagation()}>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">UPI ID *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. name@okaxis" 
                        value={upiId} 
                        onChange={e => setUpiId(e.target.value)} 
                        className={inputStyle} 
                      />
                    </div>
                  )}
                </label>

                {/* Card option */}
                <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${payment === "card" ? "border-gold bg-gold/[0.02]" : "border-[var(--card-border)] hover:border-gold/20"}`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="payment" 
                      value="card" 
                      checked={payment === "card"} 
                      onChange={() => setPayment("card")} 
                      className="accent-gold h-4 w-4" 
                    />
                    <span className="text-sm font-bold text-[var(--text-primary)]">💳 Credit / Debit Card</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] pl-7 mt-0.5">Visa, Mastercard, RuPay, and American Express.</p>
                  
                  {payment === "card" && (
                    <div className="mt-4 pl-7 space-y-3 animate-slide-up" onClick={e => e.stopPropagation()}>
                      <div className="space-y-1">
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">Cardholder Name *</label>
                        <input 
                          type="text" 
                          placeholder="John Doe" 
                          value={cardHolder} 
                          onChange={e => setCardHolder(e.target.value)} 
                          className={inputStyle} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">Card Number *</label>
                        <input 
                          type="text" 
                          maxLength={19} 
                          placeholder="4111 2222 3333 4444" 
                          value={cardNumber} 
                          onChange={e => {
                            const val = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
                            const parts = [];
                            for (let i = 0; i < val.length; i += 4) {
                              parts.push(val.substring(i, i + 4));
                            }
                            setCardNumber(parts.join(" "));
                          }} 
                          className={inputStyle} 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">Expiry Date *</label>
                          <input 
                            type="text" 
                            maxLength={5} 
                            placeholder="MM/YY" 
                            value={cardExpiry} 
                            onChange={e => {
                              let val = e.target.value.replace(/[^0-9]/g, "");
                              if (val.length >= 2) {
                                val = val.substring(0, 2) + "/" + val.substring(2, 4);
                              }
                              setCardExpiry(val);
                            }} 
                            className={inputStyle} 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">CVV *</label>
                          <input 
                            type="password" 
                            maxLength={3} 
                            placeholder="•••" 
                            value={cardCvv} 
                            onChange={e => setCardCvv(e.target.value.replace(/[^0-9]/g, ""))} 
                            className={inputStyle} 
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </label>

                {/* Netbanking option */}
                <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${payment === "netbanking" ? "border-gold bg-gold/[0.02]" : "border-[var(--card-border)] hover:border-gold/20"}`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="payment" 
                      value="netbanking" 
                      checked={payment === "netbanking"} 
                      onChange={() => setPayment("netbanking")} 
                      className="accent-gold h-4 w-4" 
                    />
                    <span className="text-sm font-bold text-[var(--text-primary)]">🏦 Net Banking</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] pl-7 mt-0.5">Direct transfers from all major Indian banking partners.</p>
                  
                  {payment === "netbanking" && (
                    <div className="mt-3 pl-7 space-y-1.5 animate-slide-up" onClick={e => e.stopPropagation()}>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">Select Bank *</label>
                      <select 
                        value={netBank} 
                        onChange={e => setNetBank(e.target.value)} 
                        className={inputStyle} 
                      >
                        <option value="sbi">State Bank of India</option>
                        <option value="hdfc">HDFC Bank</option>
                        <option value="icici">ICICI Bank</option>
                        <option value="axis">Axis Bank</option>
                        <option value="kotak">Kotak Mahindra Bank</option>
                      </select>
                    </div>
                  )}
                </label>
              </div>

              {payment !== "cod" && (
                <div className="mt-5 p-3.5 rounded-xl bg-gold/5 border border-gold/15">
                  <p className="text-[11px] text-gold font-medium leading-relaxed">
                    💡 Payment processes securely. Transaction tokens are exchanged via InsForge gateway nodes.
                  </p>
                </div>
              )}
              
              <div className="flex gap-4 mt-6">
                <button 
                  onClick={() => setStep(0)} 
                  className="px-6 py-3.5 rounded-xl border border-[var(--card-border)] text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  ← Back
                </button>
                
                <button 
                  onClick={handleNextStep2} 
                  className="btn-gold flex-1 py-3.5 rounded-xl text-xs tracking-widest uppercase font-bold border-0"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Address detail review card */}
              <div className="bg-luxe-card border border-[var(--card-border)] rounded-2xl p-5 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs uppercase tracking-widest font-black text-gold">📍 Delivery Address</h3>
                  <button onClick={() => setStep(0)} className="text-xs text-gold font-bold hover:underline">Change</button>
                </div>
                <p className="text-sm font-bold text-[var(--text-primary)]">{address.name} · {address.phone}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {address.line1}{address.landmark ? `, Near ${address.landmark}` : ""}, {address.city}, {address.state} - {address.pincode}
                </p>
              </div>

              {/* Payment detail review card */}
              <div className="bg-luxe-card border border-[var(--card-border)] rounded-2xl p-5 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs uppercase tracking-widest font-black text-gold">💳 Payment Method</h3>
                  <button onClick={() => setStep(1)} className="text-xs text-gold font-bold hover:underline">Change</button>
                </div>
                <p className="text-sm font-bold text-[var(--text-primary)] capitalize">
                  {payment === "cod" ? "Cash on Delivery" : payment === "upi" ? `UPI (${upiId})` : payment === "card" ? `Credit/Debit Card (•••• ${cardNumber.slice(-4)})` : "Net Banking"}
                </p>
              </div>

              {/* Items card */}
              <div className="bg-luxe-card border border-[var(--card-border)] rounded-2xl p-5 shadow-card">
                <h3 className="text-xs uppercase tracking-widest font-black text-gold mb-4">📦 Review Items ({totalItems})</h3>
                <div className="space-y-3">
                  {cartItems.map(item => (
                    <div key={`${item.id}-${item.selectedColor}-${item.selectedSize}`} className="flex items-center gap-4 py-2 border-b border-[var(--card-border)]/5 last:border-0">
                      <img src={item.img} alt={item.name} className="w-12 h-12 rounded-lg object-cover border border-[var(--card-border)]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">{item.name}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                          Qty: {item.quantity} {item.selectedSize && `· Size: ${item.selectedSize}`} {item.selectedColor && `· Color: ${item.selectedColor}`}
                        </p>
                      </div>
                      <span className="gold text-xs font-bold">{fmt(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Return Policy Notice */}
              <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4 flex items-start gap-3 shadow-card">
                <span className="text-lg">🔄</span>
                <div>
                  <p className="text-sm font-bold text-green-500">5-Day Free Returns</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">All items are eligible for returns within 5 days of delivery based on merchant guidelines.</p>
                </div>
              </div>

              {/* Submit button */}
              <button 
                onClick={handlePlaceOrder} 
                disabled={placing}
                className="btn-gold w-full py-4 rounded-xl text-xs tracking-widest uppercase font-bold flex items-center justify-center gap-2 disabled:opacity-60 border-0"
              >
                {placing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Placing Order...
                  </>
                ) : (
                  `Place Order · ${fmt(total)}`
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right: Order summary card sticky */}
        <div className="bg-luxe-card border border-[var(--card-border)] rounded-2xl p-6 h-fit sticky top-24 shadow-card">
          <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--text-primary)] mb-5">Summary details</h3>
          
          <div className="space-y-3 text-sm border-b border-[var(--card-border)] pb-4 mb-4 text-[var(--text-secondary)]">
            <div className="flex justify-between">
              <span>Subtotal ({totalItems} items)</span>
              <span className="text-[var(--text-primary)] font-semibold">{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping Fee</span>
              <span className={shippingFee === 0 ? "text-green-500 font-bold" : "text-[var(--text-primary)] font-semibold"}>
                {shippingFee === 0 ? "FREE" : fmt(shippingFee)}
              </span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-green-500 font-semibold">
                <span>Coupon ({appliedCoupon.code})</span>
                <span>−{fmt(couponDiscount)}</span>
              </div>
            )}
          </div>
          
          <div className="flex justify-between font-black text-lg mb-3 text-[var(--text-primary)]">
            <span>Total Amount</span>
            <span className="text-gold font-bold">{fmt(total)}</span>
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--card-border)] flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
            <span>🔄</span>
            <span>5-Day Free Return Policy on all products</span>
          </div>
        </div>
      </div>
    </div>
  );
}
