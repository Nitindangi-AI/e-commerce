import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCartStore } from "../../store/useCartStore";
import { orderAPI, authAPI, addressAPI } from "../../services/api";
import { toast } from "../../components/GlobalToast";
import AddressForm from "../../components/AddressForm";
import DeliverySlotPicker from "../../components/DeliverySlotPicker";
import axios from "axios";

const STEPS = ["1. Address", "2. Payment", "3. Confirm"];

export default function CheckoutPage() {
  const cartItems = useCartStore(s => s.cartItems);
  const clearCart = useCartStore(s => s.clearCart);
  const navigate = useNavigate();
  const location = useLocation();
  
  const initialCoupon = location.state?.appliedCoupon || null;
  const initialDiscount = location.state?.couponDiscount || 0;
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

  const [paymentErrors, setPaymentErrors] = useState({});
  const [placing, setPlacing] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState("slot1");

  // Coupon & Loyalty States
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(initialCoupon);
  const [couponDiscount, setCouponDiscount] = useState(initialDiscount);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [useLoyalty, setUseLoyalty] = useState(false);

  useEffect(() => {
    let active = true;
    
    async function init() {
      try {
        const meRes = await authAPI.getMe();
        if (meRes?.user) {
          if (active) setUser(meRes.user);
          
          // Fetch user profile to get loyalty points
          try {
            const profileRes = await axios.get("/api/auth/profile");
            const profile = profileRes.data.profile || profileRes.data.user || profileRes.data;
            if (active && profile) {
              setLoyaltyPoints(profile.loyalty_points || 0);
            }
          } catch (profileErr) {
            console.error("Failed to load loyalty points:", profileErr);
          }

          setLoadingAddresses(true);
          const addrRes = await addressAPI.getAll();
          if (active && addrRes.success && addrRes.addresses) {
            setSavedAddresses(addrRes.addresses);
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
        toast.error("Failed to load checkout details.");
      } finally {
        if (active) setLoadingAddresses(false);
      }
    }

    init();
    return () => { active = false; };
  }, []);

  // Total Calculations using NUMERIC (precise decimal) representation
  const subtotal = parseFloat(cartItems.reduce((t, i) => t + i.price * i.quantity, 0).toFixed(2));
  const gstAmount = parseFloat((subtotal * 0.18).toFixed(2));
  
  // Loyalty Point conversion: 1 point = ₹1 discount
  const maxLoyaltyDiscount = Math.min(loyaltyPoints, subtotal + gstAmount + shippingFee - couponDiscount);
  const loyaltyDiscount = useLoyalty ? maxLoyaltyDiscount : 0;
  
  const total = parseFloat((subtotal + gstAmount + shippingFee - couponDiscount - loyaltyDiscount).toFixed(2));
  
  const fmt = (p) => `₹${p.toLocaleString("en-IN")}`;
  const totalItems = cartItems.reduce((t, i) => t + i.quantity, 0);

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center pt-28">
        <p className="text-[#6B6B6B] dark:text-gray-400 text-lg mb-4">Your cart is empty</p>
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
      if (!address || !address.name || !address.line1) {
        toast.error("Please select a valid address");
        return;
      }
    }
    setStep(1);
  };

  const handleNextStep2 = () => {
    const errs = {};
    if (payment === "upi") {
      if (!upiId.trim() || !upiId.includes("@")) {
        errs.upiId = "Please enter a valid UPI ID (e.g., name@okaxis)";
      }
    } else if (payment === "card") {
      if (!cardHolder.trim()) {
        errs.cardHolder = "Cardholder name is required";
      }
      if (cardNumber.replace(/\s/g, "").length < 16) {
        errs.cardNumber = "Please enter a valid 16-digit card number";
      }
      if (cardExpiry.length < 5 || !cardExpiry.includes("/")) {
        errs.cardExpiry = "Expiry date in MM/YY format is required";
      }
      if (cardCvv.length < 3) {
        errs.cardCvv = "Please enter a valid 3-digit CVV";
      }
    }

    if (Object.keys(errs).length > 0) {
      setPaymentErrors(errs);
      toast.error("Please correct the validation errors on the form");
      return;
    }

    setPaymentErrors({});
    setStep(2);
  };

  const handleApplyCouponSubmit = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    setValidatingCoupon(true);
    try {
      const res = await axios.post("/api/v1/coupons/validate", {
        code: couponCode.trim().toUpperCase(),
        orderValue: subtotal,
      });

      if (res.data.success) {
        setAppliedCoupon(res.data.coupon || { code: couponCode.trim().toUpperCase() });
        setCouponDiscount(res.data.discountAmount || 0);
        toast.success(`Coupon "${couponCode.trim().toUpperCase()}" applied successfully!`);
        setCouponCode("");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid coupon code");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    toast.info("Coupon removed");
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
      finalDetails.deliverySlot = selectedSlot;
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
          // Snapshots of product details
          product_name: item.name,
          product_img: item.img || item.image || "",
        })),
        shippingAddress: address,
        paymentMethod: payment,
        couponCode: appliedCoupon?.code || null,
        discount: couponDiscount + loyaltyDiscount,
        paymentDetails: finalDetails
      };

      const data = await orderAPI.create(orderData);
      
      // If a new address was used, save it permanently to addresses table
      if (selectedAddressId === "new") {
        try {
          await addressAPI.add(address);
        } catch (addrErr) {
          console.warn("Failed to save address permanently:", addrErr);
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

  const cardBg = "bg-white dark:bg-[#111111]/40 border border-[#E8E8E8] dark:border-white/5 shadow-md rounded-2xl p-6";
  const inputStyle = "w-full px-4 py-2.5 rounded-xl text-xs bg-[#FAFAF8] dark:bg-[#151515] border border-[#E8E8E8] dark:border-white/5 text-[#111] dark:text-white focus:outline-none focus:border-[#C9A84C]";

  return (
    <div className="max-w-5xl mx-auto px-6 pt-28 pb-20 min-h-screen bg-[#FAFAF8] dark:bg-[#0A0A0A]">
      {/* Steps progress indicator */}
      <div className="flex items-center justify-center mb-12">
        <div className="flex items-center w-full max-w-lg justify-between relative">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#E8E8E8] dark:bg-white/5 z-0" />
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#C9A84C] transition-all duration-500 z-0"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />

          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-col items-center relative z-10">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                  i <= step 
                    ? "bg-[#C9A84C] text-white shadow-md shadow-[#C9A84C]/10" 
                    : "bg-white dark:bg-[#111] border border-[#E8E8E8] dark:border-white/5 text-[#6B6B6B]"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-[10px] tracking-widest uppercase mt-2 font-bold ${i <= step ? "text-[#C9A84C]" : "text-[#6B6B6B]"}`}>
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Step 1: Address */}
          {step === 0 && (
            <div className={cardBg}>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[#C9A84C]" style={{ fontFamily: "'Playfair Display', serif" }}>📍 Delivery Address</h2>
              
              {loadingAddresses ? (
                <p className="text-xs py-4 text-center">Loading saved addresses...</p>
              ) : (
                <div className="space-y-4 mb-6">
                  {savedAddresses.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#6B6B6B] block">Saved Addresses</span>
                      <div className="grid grid-cols-1 gap-3">
                        {savedAddresses.map(addr => (
                          <div 
                            key={addr.id}
                            onClick={() => handleSelectSavedAddress(addr)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-4 ${
                              selectedAddressId === addr.id 
                                ? "border-[#C9A84C] bg-[#C9A84C]/5" 
                                : "border-[#E8E8E8] dark:border-white/5 hover:border-[#C9A84C]/30 bg-white dark:bg-[#111111]/10"
                            }`}
                          >
                            <input 
                              type="radio" 
                              name="address_select" 
                              value={addr.id} 
                              checked={selectedAddressId === addr.id} 
                              onChange={() => handleSelectSavedAddress(addr)}
                              className="accent-[#C9A84C] h-4 w-4 mt-1 cursor-pointer flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-black text-[#C9A84C] uppercase tracking-wider">{addr.label || "Address"}</span>
                                {addr.isDefault && (
                                  <span className="text-[9px] bg-[#C9A84C]/10 text-[#C9A84C] px-2 py-0.5 rounded-full font-bold uppercase">Default</span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-[#111] dark:text-white">{addr.name} · {addr.phone}</p>
                              <p className="text-[11px] text-[#6B6B6B] dark:text-gray-400 mt-0.5">
                                {addr.line1}, {addr.city}, {addr.state} - {addr.pincode}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <label 
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                      selectedAddressId === "new" 
                        ? "border-[#C9A84C] bg-[#C9A84C]/5" 
                        : "border-[#E8E8E8] dark:border-white/5 hover:border-[#C9A84C]/30 bg-white dark:bg-[#111111]/10"
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
                      className="accent-[#C9A84C] h-4 w-4"
                    />
                    <span className="text-xs font-bold text-[#111] dark:text-white">➕ Add a New Delivery Address</span>
                  </label>
                </div>
              )}

              {selectedAddressId === "new" && (
                <div className="border-t border-[#E8E8E8] dark:border-white/5 pt-6 mt-6">
                  <AddressForm 
                    address={address} 
                    setAddress={setAddress} 
                    onValidate={setIsAddressValid} 
                  />
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-[#E8E8E8] dark:border-white/5">
                <DeliverySlotPicker 
                  selectedSlot={selectedSlot} 
                  onChange={setSelectedSlot} 
                />
              </div>
              
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
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[#C9A84C]" style={{ fontFamily: "'Playfair Display', serif" }}>💳 Payment Method</h2>
              
              <div className="space-y-4">
                <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${payment === "cod" ? "border-[#C9A84C] bg-[#C9A84C]/5" : "border-[#E8E8E8] dark:border-white/5 hover:border-[#C9A84C]/20"}`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="payment" 
                      value="cod" 
                      checked={payment === "cod"} 
                      onChange={() => setPayment("cod")} 
                      className="accent-[#C9A84C] h-4 w-4" 
                    />
                    <span className="text-sm font-bold text-[#111] dark:text-white">🏠 Cash on Delivery (COD)</span>
                  </div>
                  <p className="text-xs text-[#6B6B6B] dark:text-gray-400 pl-7 mt-0.5">Pay in cash or digital scan when your package is delivered.</p>
                </label>

                <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${payment === "upi" ? "border-[#C9A84C] bg-[#C9A84C]/5" : "border-[#E8E8E8] dark:border-white/5 hover:border-[#C9A84C]/20"}`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="payment" 
                      value="upi" 
                      checked={payment === "upi"} 
                      onChange={() => setPayment("upi")} 
                      className="accent-[#C9A84C] h-4 w-4" 
                    />
                    <span className="text-sm font-bold text-[#111] dark:text-white">📱 UPI (Google Pay, PhonePe, Paytm)</span>
                  </div>
                  <p className="text-xs text-[#6B6B6B] dark:text-gray-400 pl-7 mt-0.5">Instant secure payment using your personal UPI address.</p>
                  
                  {payment === "upi" && (
                    <div className="mt-3 pl-7 space-y-1.5" onClick={e => e.stopPropagation()}>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-[#6B6B6B]">UPI ID *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. name@okaxis" 
                        value={upiId} 
                        onChange={e => {
                          setUpiId(e.target.value);
                          if (paymentErrors.upiId) setPaymentErrors(prev => ({ ...prev, upiId: null }));
                        }} 
                        className={`${inputStyle} ${paymentErrors.upiId ? "border-red-500" : ""}`} 
                      />
                      {paymentErrors.upiId && <p className="text-red-500 text-[11px] font-semibold mt-1">{paymentErrors.upiId}</p>}
                    </div>
                  )}
                </label>

                <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${payment === "card" ? "border-[#C9A84C] bg-[#C9A84C]/5" : "border-[#E8E8E8] dark:border-white/5 hover:border-[#C9A84C]/20"}`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="payment" 
                      value="card" 
                      checked={payment === "card"} 
                      onChange={() => setPayment("card")} 
                      className="accent-[#C9A84C] h-4 w-4" 
                    />
                    <span className="text-sm font-bold text-[#111] dark:text-white">💳 Credit / Debit Card</span>
                  </div>
                  <p className="text-xs text-[#6B6B6B] dark:text-gray-400 pl-7 mt-0.5">Visa, Mastercard, RuPay, and American Express.</p>
                  
                  {payment === "card" && (
                    <div className="mt-4 pl-7 space-y-3" onClick={e => e.stopPropagation()}>
                      <div className="space-y-1">
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-[#6B6B6B]">Cardholder Name *</label>
                        <input 
                          type="text" 
                          placeholder="John Doe" 
                          value={cardHolder} 
                          onChange={e => {
                            setCardHolder(e.target.value);
                            if (paymentErrors.cardHolder) setPaymentErrors(prev => ({ ...prev, cardHolder: null }));
                          }} 
                          className={`${inputStyle} ${paymentErrors.cardHolder ? "border-red-500" : ""}`} 
                        />
                        {paymentErrors.cardHolder && <p className="text-red-500 text-[11px] font-semibold mt-1">{paymentErrors.cardHolder}</p>}
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-[#6B6B6B]">Card Number *</label>
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
                            if (paymentErrors.cardNumber) setPaymentErrors(prev => ({ ...prev, cardNumber: null }));
                          }} 
                          className={`${inputStyle} ${paymentErrors.cardNumber ? "border-red-500" : ""}`} 
                        />
                        {paymentErrors.cardNumber && <p className="text-red-500 text-[11px] font-semibold mt-1">{paymentErrors.cardNumber}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] uppercase font-bold tracking-wider text-[#6B6B6B]">Expiry Date *</label>
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
                              if (paymentErrors.cardExpiry) setPaymentErrors(prev => ({ ...prev, cardExpiry: null }));
                            }} 
                            className={`${inputStyle} ${paymentErrors.cardExpiry ? "border-red-500" : ""}`} 
                          />
                          {paymentErrors.cardExpiry && <p className="text-red-500 text-[11px] font-semibold mt-1">{paymentErrors.cardExpiry}</p>}
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] uppercase font-bold tracking-wider text-[#6B6B6B]">CVV *</label>
                          <input 
                            type="password" 
                            maxLength={3} 
                            placeholder="•••" 
                            value={cardCvv} 
                            onChange={e => {
                              setCardCvv(e.target.value.replace(/[^0-9]/g, ""));
                              if (paymentErrors.cardCvv) setPaymentErrors(prev => ({ ...prev, cardCvv: null }));
                            }} 
                            className={`${inputStyle} ${paymentErrors.cardCvv ? "border-red-500" : ""}`} 
                          />
                          {paymentErrors.cardCvv && <p className="text-red-500 text-[11px] font-semibold mt-1">{paymentErrors.cardCvv}</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </label>

                <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${payment === "netbanking" ? "border-[#C9A84C] bg-[#C9A84C]/5" : "border-[#E8E8E8] dark:border-white/5 hover:border-[#C9A84C]/20"}`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="payment" 
                      value="netbanking" 
                      checked={payment === "netbanking"} 
                      onChange={() => setPayment("netbanking")} 
                      className="accent-[#C9A84C] h-4 w-4" 
                    />
                    <span className="text-sm font-bold text-[#111] dark:text-white">🏦 Net Banking</span>
                  </div>
                  <p className="text-xs text-[#6B6B6B] dark:text-gray-400 pl-7 mt-0.5">Direct transfers from all major Indian banking partners.</p>
                  
                  {payment === "netbanking" && (
                    <div className="mt-3 pl-7 space-y-1.5" onClick={e => e.stopPropagation()}>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-[#6B6B6B]">Select Bank *</label>
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

              <div className="flex gap-4 mt-6">
                <button 
                  onClick={() => setStep(0)} 
                  className="px-6 py-3.5 rounded-xl border border-[#E8E8E8] dark:border-white/5 text-xs font-bold uppercase tracking-wider text-[#6B6B6B]"
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
              <div className="bg-white dark:bg-[#111111]/40 border border-[#E8E8E8] dark:border-white/5 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs uppercase tracking-widest font-black text-[#C9A84C]">📍 Delivery Address & Slot</h3>
                  <button onClick={() => setStep(0)} className="text-xs text-[#C9A84C] font-bold hover:underline">Change</button>
                </div>
                <p className="text-sm font-bold text-[#111] dark:text-white">{address.name} · {address.phone}</p>
                <p className="text-xs text-[#6B6B6B] dark:text-gray-400 mt-0.5">
                  {address.line1}{address.landmark ? `, Near ${address.landmark}` : ""}, {address.city}, {address.state} - {address.pincode}
                </p>
                <div className="mt-3 pt-3 border-t border-[#E8E8E8] dark:border-white/5 text-xs flex justify-between font-medium">
                  <span className="text-[#6B6B6B] dark:text-gray-400">Preferred Delivery Slot:</span>
                  <span className="text-[#C9A84C] font-bold uppercase tracking-wider">
                    {selectedSlot === "slot1" && "09:00 AM - 12:00 PM (Morning)"}
                    {selectedSlot === "slot2" && "12:00 PM - 03:00 PM (Afternoon)"}
                    {selectedSlot === "slot3" && "03:00 PM - 06:00 PM (Evening)"}
                    {selectedSlot === "slot4" && "06:00 PM - 09:00 PM (Night)"}
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-[#111111]/40 border border-[#E8E8E8] dark:border-white/5 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs uppercase tracking-widest font-black text-[#C9A84C]">💳 Payment Method</h3>
                  <button onClick={() => setStep(1)} className="text-xs text-[#C9A84C] font-bold hover:underline">Change</button>
                </div>
                <p className="text-sm font-bold text-[#111] dark:text-white capitalize">
                  {payment === "cod" ? "Cash on Delivery" : payment === "upi" ? `UPI (${upiId})` : payment === "card" ? `Credit/Debit Card (•••• ${cardNumber.slice(-4)})` : "Net Banking"}
                </p>
              </div>

              <div className="bg-white dark:bg-[#111111]/40 border border-[#E8E8E8] dark:border-white/5 rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs uppercase tracking-widest font-black text-[#C9A84C] mb-4">📦 Review Items ({totalItems})</h3>
                <div className="space-y-3">
                  {cartItems.map(item => (
                    <div key={`${item.id}-${item.selectedColor}-${item.selectedSize}`} className="flex items-center gap-4 py-2 border-b border-[#E8E8E8] dark:border-white/5 last:border-0">
                      <img src={item.img} alt={item.name} loading="lazy" width="48" height="48" className="w-12 h-12 rounded-lg object-cover border border-[#E8E8E8] dark:border-white/5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#111] dark:text-white truncate">{item.name}</p>
                        <p className="text-[10px] text-[#6B6B6B] dark:text-gray-400 mt-0.5 font-semibold">
                          Qty: {item.quantity} {item.selectedSize && `· Size: ${item.selectedSize}`} {item.selectedColor && `· Color: ${item.selectedColor}`}
                        </p>
                      </div>
                      <span className="gold text-xs font-bold">{fmt(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={handlePlaceOrder} 
                disabled={placing}
                className="btn-gold w-full py-4 rounded-xl text-xs tracking-widest uppercase font-bold flex items-center justify-center gap-2 disabled:opacity-60 border-0"
              >
                {placing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  `Place Order · ${fmt(total)}`
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Order Summary Sticky */}
        <div className="bg-white dark:bg-[#111111]/40 border border-[#E8E8E8] dark:border-white/5 rounded-2xl p-6 h-fit sticky top-24 shadow-sm space-y-6">
          <h3 className="font-bold text-sm uppercase tracking-wider text-[#111] dark:text-white">Order Summary</h3>
          
          <div className="space-y-3 text-sm border-b border-[#E8E8E8] dark:border-white/5 pb-4 text-[#6B6B6B] dark:text-gray-400">
            <div className="flex justify-between">
              <span>Subtotal ({totalItems} items)</span>
              <span className="text-[#111] dark:text-white font-semibold">{fmt(subtotal)}</span>
            </div>
            
            {/* GST Breakdown (18%) */}
            <div className="flex justify-between">
              <span>GST (18%)</span>
              <span className="text-[#111] dark:text-white font-semibold">{fmt(gstAmount)}</span>
            </div>

            <div className="flex justify-between">
              <span>Shipping Fee</span>
              <span className={shippingFee === 0 ? "text-green-500 font-bold" : "text-[#111] dark:text-white font-semibold"}>
                {shippingFee === 0 ? "FREE" : fmt(shippingFee)}
              </span>
            </div>

            {/* Loyalty Points display & usage */}
            {loyaltyPoints > 0 && (
              <div className="pt-2 border-t border-[#E8E8E8] dark:border-white/5 space-y-2 select-none">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useLoyalty}
                    onChange={e => setUseLoyalty(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#C9A84C] focus:ring-[#C9A84C] accent-[#C9A84C]"
                  />
                  <span className="text-xs text-[#111] dark:text-white font-semibold">
                    Use {loyaltyPoints} points = {fmt(maxLoyaltyDiscount)} discount
                  </span>
                </label>
              </div>
            )}

            {appliedCoupon && (
              <div className="flex justify-between items-center text-green-600 font-semibold pt-1">
                <span>Coupon ({appliedCoupon.code})</span>
                <div className="flex items-center gap-1.5">
                  <span>−{fmt(couponDiscount)}</span>
                  <button onClick={handleRemoveCoupon} className="text-red-500 hover:text-red-700 text-xs font-bold">✕</button>
                </div>
              </div>
            )}
          </div>

          {/* Coupon Code Form */}
          {!appliedCoupon && (
            <form onSubmit={handleApplyCouponSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="PROMO CODE"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                className="flex-1 bg-[#FAFAF8] dark:bg-[#151515] border border-[#E8E8E8] dark:border-white/5 rounded-lg px-3 py-2 text-xs uppercase tracking-wider text-[#111] dark:text-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={validatingCoupon}
                className="px-4 py-2 bg-[#0A0A0A] hover:bg-[#222] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black rounded-lg text-[10px] font-bold tracking-widest uppercase transition-colors disabled:opacity-50"
              >
                {validatingCoupon ? "..." : "Apply"}
              </button>
            </form>
          )}
          
          <div className="flex justify-between font-black text-lg mb-3 text-[#111] dark:text-white">
            <span>Total Amount</span>
            <span className="text-[#C9A84C] font-bold">{fmt(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
