import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCartStore } from "../../store/useCartStore";
import { useWishlistStore } from "../../store/useWishlistStore";
import { useRecentlyViewedStore } from "../../store/useRecentlyViewedStore";
import { orderAPI, authAPI, paymentAPI, addressAPI, couponAPI } from "../../services/api";
import toast from "react-hot-toast";
import AdminLocations from "../../components/AdminLocations";
import { 
  User, 
  ShoppingBag, 
  Heart, 
  Clock, 
  Ticket, 
  Bell, 
  MapPin, 
  Settings as SettingsIcon, 
  Home as HomeIcon,
  Sun, 
  Moon, 
  ShieldCheck, 
  Download, 
  Printer, 
  X,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Gift
} from "lucide-react";

export default function AccountPage() {
  const navigate = useNavigate();
  const wishlistItems = useWishlistStore(s => s.wishlistItems);
  const { recentlyViewed = [] } = useRecentlyViewedStore() || {};

  // Core User Session & Loading States
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Home");
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Orders State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [returnModal, setReturnModal] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Address State
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: "Home", name: "", phone: "", pincode: "", line1: "", city: "", state: "", isDefault: false
  });

  // Profile Settings State
  const [profile, setProfile] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  // Admin Specific state (if user is admin)
  const [paymentAccount, setPaymentAccount] = useState({ upiId: "", bankName: "", accountHolder: "", accountNumber: "", ifscCode: "" });
  const [savingPayment, setSavingPayment] = useState(false);

  // Coupon Interactive State
  const [claimedCoupons, setClaimedCoupons] = useState([]);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [scratchedList, setScratchedList] = useState({});

  const isAdmin = user?.role === "admin";
  
  // Tabs list matching customer structure
  const TABS = [
    { id: "Home", label: "Dashboard", icon: HomeIcon },
    { id: "Orders", label: "Orders", icon: ShoppingBag },
    { id: "Wishlist", label: "Wishlist", icon: Heart },
    { id: "Recently Viewed", label: "History", icon: Clock },
    { id: "Coupons", label: "Coupons", icon: Ticket },
    { id: "Notifications", label: "Alerts", icon: Bell },
    { id: "Profile", label: "Profile", icon: User },
    { id: "Addresses", label: "Addresses", icon: MapPin },
    { id: "Settings", label: "Settings", icon: SettingsIcon },
  ];

  // Load user data
  useEffect(() => {
    authAPI.getMe()
      .then(d => {
        setUser(d.user);
        setProfile({ 
          firstName: d.user.firstName || "", 
          lastName: d.user.lastName || "", 
          email: d.user.email || "", 
          phone: d.user.phone || "" 
        });
        if (d.user.paymentAccount) setPaymentAccount(d.user.paymentAccount);
      })
      .catch(() => navigate("/login"))
      .finally(() => setLoading(false));
  }, [navigate]);

  // Load orders
  useEffect(() => {
    if (!user) return;
    setOrdersLoading(true);
    orderAPI.getMyOrders()
      .then(d => setOrders(d.orders || []))
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [user]);

  // Load addresses when viewing Address Tab
  useEffect(() => {
    if (!user || activeTab !== "Addresses") return;
    setAddressesLoading(true);
    addressAPI.getAll()
      .then(d => setAddresses(d.addresses || []))
      .catch(() => {})
      .finally(() => setAddressesLoading(false));
  }, [user, activeTab]);

  // Profile Save
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await authAPI.updateProfile(profile);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // Payment Info Save (Admin only)
  const handleSavePayment = async () => {
    setSavingPayment(true);
    try {
      await paymentAPI.updateAccount(paymentAccount);
      toast.success("Payment settlement account updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPayment(false);
    }
  };

  // Add New Address
  const handleAddAddressSubmit = async (e) => {
    e.preventDefault();
    if (!newAddress.name || !newAddress.phone || !newAddress.line1 || !newAddress.pincode) {
      toast.error("Please fill in all required fields.");
      return;
    }
    try {
      await addressAPI.add(newAddress);
      toast.success("Address added successfully!");
      setShowAddressModal(false);
      setNewAddress({
        label: "Home", name: "", phone: "", pincode: "", line1: "", city: "Mumbai", state: "Maharashtra", isDefault: false
      });
      // reload
      setAddressesLoading(true);
      const d = await addressAPI.getAll();
      setAddresses(d.addresses || []);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Delete saved address
  const handleDeleteAddress = async (id) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    try {
      await addressAPI.delete(id);
      toast.success("Address deleted");
      const d = await addressAPI.getAll();
      setAddresses(d.addresses || []);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Payout returns
  const handleRequestReturn = async (orderId) => {
    if (!returnReason.trim()) { toast.error("Please select a valid return reason."); return; }
    setSubmittingReturn(true);
    try {
      await orderAPI.requestReturn(orderId, returnReason);
      toast.success("Return request submitted! Pack items with the pre-paid return slip.");
      setReturnModal(null);
      setReturnReason("");
      // reload
      const d = await orderAPI.getMyOrders();
      setOrders(d.orders || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await orderAPI.cancel(orderId);
      toast.success("Order cancelled successfully. Refund initiated.");
      const d = await orderAPI.getMyOrders();
      setOrders(d.orders || []);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Simulate coupon claim
  const handleClaimCoupon = (e) => {
    e.preventDefault();
    if (!couponCodeInput) return;
    const cleanCode = couponCodeInput.toUpperCase().trim();
    if (claimedCoupons.includes(cleanCode)) {
      toast.error("Coupon code already claimed.");
      return;
    }
    toast.success(`Coupon ${cleanCode} unlocked and claimed successfully!`);
    setClaimedCoupons([...claimedCoupons, cleanCode]);
    setCouponCodeInput("");
  };

  // Scratch coupon reveal effect
  const handleScratch = (id) => {
    setScratchedList(prev => ({ ...prev, [id]: true }));
    toast.success("Congratulations! Code Revealed!");
  };

  const formatCurrency = (p) => `₹${(p || 0).toLocaleString("en-IN")}`;

  const statusColorMap = {
    "Processing": "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    "Confirmed": "text-blue-400 bg-blue-500/10 border-blue-500/20",
    "Shipped": "text-sky-500 bg-sky-500/10 border-sky-500/20",
    "Out for Delivery": "text-pink-400 bg-pink-500/10 border-pink-500/20",
    "Delivered": "text-green-400 bg-green-500/10 border-green-500/20",
    "Cancelled": "text-red-400 bg-red-500/10 border-red-500/20",
    "Return Requested": "text-orange-400 bg-orange-500/10 border-orange-500/20",
    "Returned": "text-red-400 bg-red-500/10 border-red-500/20",
  };

  const STATUS_FLOW = ["Processing", "Confirmed", "Shipped", "Out for Delivery", "Delivered"];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center pt-28">
        <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Theme support
  const themeBg = isDarkMode ? "bg-[#0a0a0a] text-white" : "bg-[#f5f6f8] text-[#0a0a0a]";
  const cardBg = isDarkMode ? "bg-[#111] border-white/5" : "bg-white border-black/5 shadow-md shadow-black/[0.02]";
  const inputBg = isDarkMode ? "bg-white/[0.04] border-white/10" : "bg-black/[0.02] border-black/10 text-black";
  const borderLight = isDarkMode ? "border-white/5" : "border-black/5";
  const textSubtle = isDarkMode ? "text-white/40" : "text-black/40";
  const textTitle = isDarkMode ? "text-white" : "text-black";

  return (
    <div className={`min-h-screen pt-28 pb-20 transition-colors duration-300 ${themeBg}`}>
      <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row gap-8">
        
        {/* SIDEBAR NAVIGATION PANEL */}
        <aside className={`w-full lg:w-72 flex-shrink-0 border p-6 rounded-2xl self-start ${cardBg}`}>
          
          {/* USER INFO DETAILS */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#d4af37] to-[#f5d26e] flex items-center justify-center font-bold text-[#0a0a0a] text-xl shadow-lg shadow-yellow-500/10">
              {user?.firstName?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <h4 className={`font-bold text-sm truncate ${textTitle}`}>{user?.firstName} {user?.lastName}</h4>
              <span className={`text-[10px] truncate block ${textSubtle}`}>{user?.email}</span>
              {isAdmin && (
                <span className="inline-block text-[8px] bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] font-extrabold px-2 py-0.5 rounded-full mt-1.5 uppercase tracking-widest">
                  Administrator
                </span>
              )}
            </div>
          </div>

          {/* TABS SIDEBAR LIST */}
          <nav className="flex flex-col gap-1.5">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all ${
                    isActive
                      ? "bg-[#d4af37]/10 gold border border-[#d4af37]/20 shadow-lg shadow-yellow-500/[0.02]"
                      : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* SYSTEM MODE TOGGLE */}
          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
            <span className={`text-[10px] uppercase tracking-widest font-bold ${textSubtle}`}>Dashboard Style</span>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all"
              title="Toggle Dark/Light Mode"
            >
              {isDarkMode ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className="text-slate-600" />}
            </button>
          </div>
        </aside>

        {/* MAIN PANEL CONTENT WINDOW */}
        <main className="flex-1 min-w-0">
          
          {/* ─── TAB: HOME (DASHBOARD GENERAL SUMMARY) ─── */}
          {activeTab === "Home" && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] tracking-[0.2em] uppercase text-yellow-500/70 font-bold block mb-1">CUSTOMER PORTAL</span>
                  <h2 className={`display text-3xl font-black ${textTitle}`}>Welcome Back, {user?.firstName}!</h2>
                  <p className={`text-xs ${textSubtle}`}>View your account highlights, track delivery timelines, and spend coupon rewards.</p>
                </div>
                
                {/* Loyalty Badge */}
                <div className={`p-4 rounded-2xl border flex items-center gap-3 ${cardBg}`}>
                  <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
                    <Gift size={18} />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-yellow-500 font-bold">Loyalty Points</div>
                    <div className={`text-lg font-black ${textTitle}`}>450 <span className="text-[10px] text-white/30 font-medium">pts</span></div>
                  </div>
                </div>
              </div>

              {/* Stats highlights card grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: "Active Orders", val: orders.filter(o => o.orderStatus !== 'Delivered' && o.orderStatus !== 'Cancelled' && o.orderStatus !== 'Returned').length, desc: "Pending shipments", icon: ShoppingBag, color: "text-[#d4af37]" },
                  { title: "Saved Wishlist", val: wishlistItems.length, desc: "Favorite items", icon: Heart, color: "text-red-400" },
                  { title: "Browsing History", val: recentlyViewed.length, desc: "Recently viewed", icon: Clock, color: "text-blue-400" },
                  { title: "Active Coupons", val: claimedCoupons.length + 3, desc: "Claimed rewards", icon: Ticket, color: "text-green-400" }
                ].map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div key={idx} className={`border rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-[#d4af37]/35 transition-all ${cardBg}`}>
                      <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/5 blur-xl group-hover:bg-[#d4af37]/5 transition-all" />
                      <div className={`text-[10px] uppercase tracking-widest font-bold mb-2 ${textSubtle}`}>{stat.title}</div>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-2xl font-black ${textTitle}`}>{stat.val}</span>
                      </div>
                      <p className={`text-[10px] mt-1 ${textSubtle}`}>{stat.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Split layout: Recent orders list + recently viewed */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* RECENT ORDERS FEED */}
                <div className={`border rounded-2xl p-6 shadow-xl ${cardBg}`}>
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                    <h4 className={`font-bold text-xs tracking-wider uppercase flex items-center gap-2 ${textTitle}`}>
                      <span>📦</span> Recent Order Feed
                    </h4>
                    <button onClick={() => setActiveTab("Orders")} className="text-[10px] font-bold gold hover:underline uppercase tracking-wider">
                      See All Orders
                    </button>
                  </div>

                  {ordersLoading ? (
                    <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" /></div>
                  ) : orders.length === 0 ? (
                    <p className={`text-xs text-center py-10 ${textSubtle}`}>No purchase history recorded.</p>
                  ) : (
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                      {orders.slice(0, 3).map(order => (
                        <div key={order._id} className="flex items-center justify-between p-3.5 bg-black/[0.02] border border-white/5 rounded-xl hover:border-yellow-500/20 transition-all">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-bold gold font-mono">{order.orderId}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${statusColorMap[order.orderStatus]}`}>
                                {order.orderStatus}
                              </span>
                            </div>
                            <p className={`text-[10px] leading-relaxed truncate ${textSubtle}`}>
                              {order.orderItems?.map(i => i.name).join(", ")}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`text-xs font-bold ${textTitle}`}>{formatCurrency(order.totalAmount)}</div>
                            <span className={`text-[9px] font-medium tracking-wide ${textSubtle}`}>
                              {new Date(order.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* WISHLIST TEASER CARD */}
                <div className={`border rounded-2xl p-6 shadow-xl ${cardBg}`}>
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                    <h4 className={`font-bold text-xs tracking-wider uppercase flex items-center gap-2 ${textTitle}`}>
                      <span>💖</span> Saved Wishlist
                    </h4>
                    <button onClick={() => setActiveTab("Wishlist")} className="text-[10px] font-bold gold hover:underline uppercase tracking-wider">
                      Open Wishlist
                    </button>
                  </div>

                  {wishlistItems.length === 0 ? (
                    <p className={`text-xs text-center py-10 ${textSubtle}`}>Wishlist is empty.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {wishlistItems.slice(0, 3).map(item => (
                        <Link key={item.id} to={`/product/${item.id}`} className="block group">
                          <img src={item.img} alt="" className="w-full aspect-square object-cover rounded-xl border border-white/5 group-hover:border-[#d4af37]/35 transition-all mb-2" />
                          <p className={`text-[10px] font-semibold truncate ${textTitle}`}>{item.name}</p>
                          <span className="gold text-[10px] font-bold">{formatCurrency(item.price)}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ─── TAB: ORDERS (Fulfillment Tracker & PDF Invoice) ─── */}
          {activeTab === "Orders" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Orders Tracking & History</h2>
                <p className={`text-xs ${textSubtle}`}>Check the processing milestone events for active deliveries or request free return slips.</p>
              </div>

              {ordersLoading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" /></div>
              ) : orders.length === 0 ? (
                <div className={`text-center py-20 border rounded-2xl ${cardBg}`}>
                  <span className="text-4xl block mb-4">🛒</span>
                  <h4 className="font-bold text-lg mb-2">No orders yet</h4>
                  <p className={`text-xs max-w-xs mx-auto mb-6 ${textSubtle}`}>Fulfill your shopping carts to display items in the tracking ledger.</p>
                  <Link to="/shop" className="btn-gold px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border-0">Shop Now</Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map(order => {
                    const currentStatusIdx = STATUS_FLOW.indexOf(order.orderStatus);
                    const isCancelled = order.orderStatus === "Cancelled";
                    const isReturned = order.orderStatus === "Returned" || order.orderStatus === "Return Requested";

                    return (
                      <div key={order._id} className={`border rounded-2xl overflow-hidden shadow-lg ${cardBg}`}>
                        {/* Order info header */}
                        <div className="p-5 border-b border-white/5 bg-black/[0.01] flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className={`text-[10px] uppercase font-bold tracking-widest ${textSubtle}`}>Order ID</p>
                            <span className="font-mono text-xs font-bold gold">{order.orderId}</span>
                            <span className={`text-[10px] ml-2 ${textSubtle}`}>
                              Placing: {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase border tracking-wider ${statusColorMap[order.orderStatus] || "text-white/50 bg-white/5"}`}>
                              {order.orderStatus}
                            </span>
                            <span className={`font-black text-sm ${textTitle}`}>{formatCurrency(order.totalAmount)}</span>
                          </div>
                        </div>

                        {/* Order Items Table */}
                        <div className="p-5 border-b border-white/5 space-y-4">
                          {order.orderItems?.map((item, i) => (
                            <div key={i} className="flex items-center gap-4">
                              <img src={item.image} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                              <div className="flex-1 min-w-0">
                                <h5 className={`font-bold text-xs truncate ${textTitle}`}>{item.name}</h5>
                                <p className={`text-[10px] ${textSubtle}`}>
                                  Quantity: <strong className={textTitle}>{item.quantity}</strong> 
                                  {item.color && ` · Color: ${item.color}`}
                                  {item.size && ` · Size: ${item.size}`}
                                </p>
                              </div>
                              <span className="gold text-xs font-bold">{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Tracking timeline */}
                        {!isCancelled && !isReturned && (
                          <div className="p-5 border-b border-white/5 bg-black/[0.005]">
                            <h5 className={`text-[10px] uppercase font-bold tracking-widest mb-4 ${textSubtle}`}>Tracking Delivery Milestones</h5>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2">
                              {STATUS_FLOW.map((status, i) => {
                                const isCompleted = i <= currentStatusIdx;
                                const isCurrent = i === currentStatusIdx;
                                return (
                                  <div key={status} className="flex items-center flex-1 w-full last:flex-initial">
                                    <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                        isCompleted ? "gold-bg text-black shadow-lg shadow-yellow-500/20" : "bg-white/5 border border-white/10 text-white/20"
                                      } ${isCurrent ? "ring-2 ring-yellow-500/30 ring-offset-2 ring-offset-[#0a0a0a]" : ""}`}>
                                        {isCompleted ? "✓" : i + 1}
                                      </div>
                                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isCompleted ? "gold" : "text-white/20"}`}>
                                        {status}
                                      </span>
                                    </div>
                                    {i < STATUS_FLOW.length - 1 && (
                                      <div className={`hidden sm:block flex-1 h-0.5 mx-4 ${i < currentStatusIdx ? "gold-bg" : "bg-white/5"}`} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            {order.estimatedDelivery && order.orderStatus !== "Delivered" && (
                              <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5 text-[10px] tracking-wider uppercase font-bold text-emerald-400">
                                <span>📅 Expected Delivery SLA:</span>
                                <span>
                                  {new Date(order.estimatedDelivery).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Order cancellation & refund details */}
                        {isCancelled && (
                          <div className="border-b border-white/5 bg-red-500/[0.02]">
                            <div className="p-5 flex items-center justify-between flex-wrap gap-4 border-b border-white/5">
                              <span className="text-red-400 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                                ⚠️ Order Cancelled
                              </span>
                              {order.paymentStatus === "refunded" ? (
                                <span className="text-[9px] bg-green-500/10 border border-green-500/20 text-green-400 font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                                  ✓ Refund Processed
                                </span>
                              ) : (
                                <span className="text-[9px] bg-white/5 border border-white/10 text-white/40 font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                                  No Refund Required (COD/Unpaid)
                                </span>
                              )}
                            </div>
                            
                            {/* Premium Automated Refund Details Box */}
                            {order.paymentStatus === "refunded" && order.paymentDetails?.refund_details && (
                              <div className="p-5 text-xs font-semibold space-y-4">
                                <h6 className="text-[10px] uppercase font-bold tracking-widest text-[#d4af37]">Refund Gateway Summary</h6>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] leading-relaxed p-4 bg-black/45 rounded-xl border border-white/5">
                                  <div>
                                    <span className="text-white/40 block text-[9px] uppercase font-bold">Refund Reference ID</span>
                                    <span className="font-mono text-white font-bold">{order.paymentDetails.refund_details.refund_id}</span>
                                  </div>
                                  <div>
                                    <span className="text-white/40 block text-[9px] uppercase font-bold">Transferred Amount</span>
                                    <span className="gold font-black">₹{order.paymentDetails.refund_details.amount.toLocaleString("en-IN")}</span>
                                  </div>
                                  <div>
                                    <span className="text-white/40 block text-[9px] uppercase font-bold">Credited Destination Account</span>
                                    <span className="text-white font-bold truncate block" title={order.paymentDetails.refund_details.refunded_to}>
                                      {order.paymentDetails.refund_details.refunded_to}
                                    </span>
                                  </div>
                                </div>

                                {/* Automated Refund timeline tracker */}
                                <div className="space-y-3 pt-2">
                                  <span className="text-[9px] uppercase font-bold tracking-widest text-white/40 block">Refund Gateway Verification Timeline</span>
                                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[10px] uppercase text-white/40 font-bold">
                                    <div className="flex items-center gap-2">
                                      <span className="w-4 h-4 bg-green-500/10 border border-green-500/35 rounded-full flex items-center justify-center text-[9px] text-green-400 font-black">✓</span>
                                      <span className="text-green-400">Cancelled</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="w-4 h-4 bg-green-500/10 border border-green-500/35 rounded-full flex items-center justify-center text-[9px] text-green-400 font-black">✓</span>
                                      <span className="text-green-400">Refund Initiated</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="w-4 h-4 bg-green-500/10 border border-green-500/35 rounded-full flex items-center justify-center text-[9px] text-green-400 font-black">✓</span>
                                      <span className="text-green-400">Dispatched To Bank</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="w-4 h-4 bg-green-500/10 border border-green-500/35 rounded-full flex items-center justify-center text-[9px] text-green-400 font-black">✓</span>
                                      <span className="text-green-400">Amount Credited</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {isReturned && (
                          <div className="p-4 bg-orange-500/5 border-b border-white/5 text-center sm:text-left">
                            <span className="text-orange-400 text-xs font-bold uppercase tracking-wide">
                              🔄 Return requested: {order.returnReason || "No details provided"}
                            </span>
                          </div>
                        )}

                        {/* Footer action buttons */}
                        <div className="p-4 bg-black/[0.02] flex flex-wrap gap-4 items-center justify-between">
                          <div className="flex gap-4">
                            <button
                              onClick={() => setSelectedInvoice(order)}
                              className="text-[10px] font-bold uppercase tracking-widest gold hover:underline flex items-center gap-1.5"
                            >
                              <Printer size={12} /> Tax Invoice
                            </button>
                            {["Shipped", "Out for Delivery", "Delivered"].includes(order.orderStatus) && (
                              <Link
                                to={`/orders/${order._id || order.id}`}
                                className="text-[10px] font-bold uppercase tracking-widest text-[#3b82f6] hover:underline flex items-center gap-1.5"
                              >
                                🛰️ Live Logistics Tracking
                              </Link>
                            )}
                            {(order.orderStatus === "Processing" || order.orderStatus === "Confirmed") && (
                              <button
                                onClick={() => handleCancelOrder(order._id)}
                                className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:underline"
                              >
                                Cancel Order
                              </button>
                            )}
                            {order.returnEligible && (
                              <button
                                onClick={() => setReturnModal(order._id)}
                                className="text-[10px] font-bold uppercase tracking-widest text-orange-400 hover:underline flex items-center gap-1"
                              >
                                Request return ({order.returnDaysRemaining}d remaining)
                              </button>
                            )}
                          </div>
                          
                          <div className="text-[10px] text-white/35 font-medium">
                            Method: <span className="text-white capitalize">{order.paymentMethod}</span> | Status: <span className="gold uppercase">{order.paymentStatus}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── TAB: WISHLIST (SAVED PRODUCTS) ─── */}
          {activeTab === "Wishlist" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>My Wishlist</h2>
                <p className={`text-xs ${textSubtle}`}>Saved items and early drop access alerts for Trendy limited editions.</p>
              </div>

              {wishlistItems.length === 0 ? (
                <div className={`text-center py-20 border rounded-2xl ${cardBg}`}>
                  <span className="text-4xl block mb-4">💖</span>
                  <h4 className="font-bold text-lg mb-2">Wishlist is Empty</h4>
                  <p className={`text-xs max-w-xs mx-auto mb-6 ${textSubtle}`}>Browse our premium fashion catalog and tap the heart icon on any product.</p>
                  <Link to="/shop" className="btn-gold px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider">Start Browsing</Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {wishlistItems.map(p => (
                    <div key={p.id || p._id} className={`border rounded-2xl overflow-hidden p-4 group relative ${cardBg}`}>
                      <Link to={`/product/${p.id || p._id}`} className="block">
                        <div className="overflow-hidden rounded-xl aspect-square border border-white/5 relative mb-4">
                          <img src={p.img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
                          {p.badge && (
                            <span className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-md border border-white/10 text-[#d4af37] text-[8px] font-extrabold px-2 py-0.5 rounded-full tracking-wider uppercase">
                              {p.badge}
                            </span>
                          )}
                        </div>
                        <h4 className={`font-bold text-xs truncate group-hover:text-[#d4af37] transition-colors ${textTitle}`}>{p.name}</h4>
                        <span className={`text-[9px] block mb-2 uppercase font-medium ${textSubtle}`}>{p.category}</span>
                        <div className="flex items-center justify-between">
                          <span className="gold text-xs font-black">{formatCurrency(p.price)}</span>
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">In Stock</span>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── TAB: RECENTLY VIEWED (HISTORY) ─── */}
          {activeTab === "Recently Viewed" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Recently Viewed</h2>
                <p className={`text-xs ${textSubtle}`}>Quickly revisit items you recently inspected on the marketplace.</p>
              </div>

              {recentlyViewed.length === 0 ? (
                <p className={`text-xs text-center py-20 border rounded-2xl ${cardBg} ${textSubtle}`}>No items in browser session cache.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {recentlyViewed.map((p, idx) => (
                    <div key={idx} className={`border rounded-2xl p-4 relative ${cardBg}`}>
                      <Link to={`/product/${p.id}`} className="block">
                        <img src={p.img} alt="" className="w-full aspect-square object-cover rounded-xl border border-white/5 mb-3" />
                        <h4 className={`font-bold text-[11px] truncate ${textTitle}`}>{p.name}</h4>
                        <span className="gold text-xs font-bold">{formatCurrency(p.price)}</span>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── TAB: COUPONS & CLAIM DISCOUNTS ─── */}
          {activeTab === "Coupons" && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Available Coupon Rewards</h2>
                  <p className={`text-xs ${textSubtle}`}>Scratch the gold cards to reveal secret discount coupon codes or input custom codes.</p>
                </div>
                
                {/* Claim code form */}
                <form onSubmit={handleClaimCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={e => setCouponCodeInput(e.target.value)}
                    placeholder="ENTER CODE (e.g. VIP20)"
                    className={`input-field px-4 py-2.5 rounded-xl text-xs uppercase font-mono tracking-widest ${inputBg}`}
                  />
                  <button type="submit" className="btn-gold px-4 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider">
                    Claim
                  </button>
                </form>
              </div>

              {/* Coupons List - Scratch Card Interactive Design */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: "c1", title: "₹1,500 Flat Off", sub: "On orders above ₹9,999", code: "TRENDY1500", desc: "Applicable on premium watches and jewelry drops." },
                  { id: "c2", title: "20% Exclusive Discount", sub: "On limited edition releases", code: "ELITE20", desc: "No minimum order amount cap." },
                  { id: "c3", title: "Free Express Shipment", sub: "Global courier shipping", code: "FSHIPGOLD", desc: "Applies instantly to cash and online orders." }
                ].map(coupon => {
                  const isScratched = scratchedList[coupon.id];
                  return (
                    <div key={coupon.id} className={`border rounded-2xl p-5 relative overflow-hidden shadow-xl min-h-[160px] flex flex-col justify-between ${cardBg}`}>
                      
                      {/* Scratch Gold Overlay */}
                      {!isScratched && (
                        <div 
                          onClick={() => handleScratch(coupon.id)}
                          className="absolute inset-0 bg-gradient-to-br from-[#d4af37] via-[#f5d26e] to-[#b8860b] flex flex-col items-center justify-center text-center p-5 z-20 cursor-pointer hover:opacity-95 transition-opacity"
                        >
                          <div className="w-10 h-10 rounded-full bg-black/25 flex items-center justify-center mb-2 animate-bounce">
                            💎
                          </div>
                          <span className="text-[10px] uppercase font-black text-black tracking-widest">Scratch To Unlock Reward</span>
                          <span className="text-[8px] text-black/60 font-bold uppercase mt-1">Free Platform Gift</span>
                        </div>
                      )}

                      {/* Revealed Code Layout */}
                      <div className="space-y-2">
                        <span className="text-[9px] bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Unlocked Code
                        </span>
                        <h4 className={`font-black text-lg ${textTitle}`}>{coupon.title}</h4>
                        <p className={`text-[10px] leading-relaxed ${textSubtle}`}>{coupon.desc}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                        <div className="bg-black/45 border border-white/10 px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold gold tracking-widest">
                          {coupon.code}
                        </div>
                        <span className={`text-[9px] font-semibold uppercase tracking-wider text-white/30`}>
                          {coupon.sub}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Claimed coupons list */}
              {claimedCoupons.length > 0 && (
                <div className={`border rounded-2xl p-6 ${cardBg}`}>
                  <h4 className={`font-bold text-xs uppercase tracking-wider mb-4 ${textTitle}`}>Claimed Promo Codes ({claimedCoupons.length})</h4>
                  <div className="flex gap-2 flex-wrap">
                    {claimedCoupons.map((c, i) => (
                      <span key={i} className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono font-bold px-3 py-1.5 rounded-xl uppercase tracking-widest">
                        ✓ {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB: NOTIFICATIONS (ALERTS FEED) ─── */}
          {activeTab === "Notifications" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Alert Center</h2>
                <p className={`text-xs ${textSubtle}`}>System audit telemetry, order status logs, and developer alerts.</p>
              </div>

              <div className="space-y-4">
                {[
                  { title: "Delivery Confirmed", desc: "Your package containing Carbon Sunglasses was successfully delivered. Hope you love it!", type: "info", time: "2 hours ago" },
                  { title: "Early Release Active", desc: "Meridian Classic drops are now open for shoppers with gold badges.", type: "promo", time: "1 day ago" },
                  { title: "GST Settings Configured", desc: "Multi-vendor tax configurations completed for local platform states.", type: "security", time: "3 days ago" }
                ].map((notif, idx) => (
                  <div key={idx} className={`border rounded-2xl p-5 flex items-start gap-4 shadow-md ${cardBg}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      notif.type === 'security' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      notif.type === 'promo' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {notif.type === 'security' ? <ShieldCheck size={20} /> : notif.type === 'promo' ? <Gift size={20} /> : <CheckCircle2 size={20} />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-bold text-xs ${textTitle}`}>{notif.title}</h4>
                        <span className={`text-[9px] ${textSubtle}`}>· {notif.time}</span>
                      </div>
                      <p className={`text-xs leading-relaxed ${textSubtle}`}>{notif.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── TAB: PROFILE SETTINGS ─── */}
          {activeTab === "Profile" && (
            <div className="space-y-6 animate-fade-in max-w-lg">
              <div>
                <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Personal Profile</h2>
                <p className={`text-xs ${textSubtle}`}>Modify your account credentials, first/last names, and phone numbers.</p>
              </div>

              <div className={`border rounded-2xl p-6 space-y-6 shadow-xl ${cardBg}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[10px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>First Name</label>
                    <input 
                      type="text" 
                      value={profile.firstName} 
                      onChange={e => setProfile({...profile, firstName: e.target.value})} 
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`} 
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Last Name</label>
                    <input 
                      type="text" 
                      value={profile.lastName} 
                      onChange={e => setProfile({...profile, lastName: e.target.value})} 
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`} 
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[10px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Email Address (Immutable)</label>
                  <input 
                    type="email" 
                    value={profile.email} 
                    className={`input-field w-full px-4 py-3 rounded-xl text-xs bg-white/[0.01] ${textSubtle} cursor-not-allowed`} 
                    disabled 
                  />
                </div>

                <div>
                  <label className={`block text-[10px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Phone Number</label>
                  <input 
                    type="tel" 
                    value={profile.phone} 
                    onChange={e => setProfile({...profile, phone: e.target.value})} 
                    className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`} 
                    placeholder="+91 98765 00000"
                  />
                </div>

                <button 
                  onClick={handleSaveProfile} 
                  disabled={savingProfile} 
                  className="btn-gold w-full py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase mt-4 disabled:opacity-60"
                >
                  {savingProfile ? "Saving Profile..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {/* ─── TAB: ADDRESSES LIST & MANAGER ─── */}
          {activeTab === "Addresses" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Billing & Shipping Addresses</h2>
                  <p className={`text-xs ${textSubtle}`}>Add shipping details to autocomplete delivery orders during checkout.</p>
                </div>
                <button
                  onClick={() => setShowAddressModal(true)}
                  className="btn-gold px-5 py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-1.5 self-start sm:self-center"
                >
                  <Plus size={14} /> Add Address
                </button>
              </div>

              {addressesLoading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" /></div>
              ) : addresses.length === 0 ? (
                <p className={`text-xs text-center py-20 border rounded-2xl ${cardBg} ${textSubtle}`}>No saved addresses recorded. Add one above.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {addresses.map(a => (
                    <div key={a._id || a.id} className={`border rounded-2xl p-5 relative shadow-md ${cardBg} ${a.isDefault ? 'border-[#d4af37]/35' : ''}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs font-bold ${textTitle}`}>{a.label || "Address"}</span>
                        {a.isDefault && (
                          <span className="text-[8px] bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                            Default
                          </span>
                        )}
                      </div>
                      <p className={`text-xs font-semibold ${textTitle}`}>{a.name} · {a.phone}</p>
                      <p className={`text-xs leading-relaxed mt-2 ${textSubtle}`}>{a.line1}, {a.city}, {a.state} - {a.pincode}</p>
                      
                      <button
                        onClick={() => handleDeleteAddress(a._id || a.id)}
                        className="absolute bottom-5 right-5 w-8 h-8 rounded-lg border border-red-500/10 hover:border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/5 transition-all"
                        title="Delete Address"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── TAB: SETTINGS & MFA OPTIONS ─── */}
          {activeTab === "Settings" && (
            <div className="space-y-6 animate-fade-in max-w-lg">
              <div>
                <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Account Protection & Settings</h2>
                <p className={`text-xs ${textSubtle}`}>Secure your shopper profile or toggle multi-factor device logins.</p>
              </div>

              {/* MFA panel */}
              <div className={`border rounded-2xl p-6 space-y-6 shadow-xl ${cardBg}`}>
                <div className="flex items-center justify-between gap-4 pb-6 border-b border-white/5">
                  <div>
                    <h4 className={`font-bold text-xs uppercase tracking-wider mb-1 ${textTitle}`}>Multi-Factor Security (2FA)</h4>
                    <p className={`text-[10px] leading-relaxed max-w-xs ${textSubtle}`}>Require a mobile code verification step during dashboard login authorization.</p>
                  </div>
                  <button
                    onClick={() => {
                      setMfaEnabled(!mfaEnabled);
                      toast.success(mfaEnabled ? "2FA authentication disabled." : "MFA protection successfully enabled!");
                    }}
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors relative ${mfaEnabled ? 'bg-yellow-500' : 'bg-white/10'}`}
                  >
                    <div className={`w-5 h-5 bg-black rounded-full transition-transform ${mfaEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Simulated session details */}
                <div className="space-y-3">
                  <h4 className={`font-bold text-xs uppercase tracking-wider ${textTitle}`}>Active Shopper Sessions</h4>
                  <div className="p-4 bg-black/[0.02] border border-white/5 rounded-xl space-y-2 text-[10px] font-semibold text-white/40">
                    <div className="flex justify-between">
                      <span>IP Geolocation:</span>
                      <span className="text-white">103.45.24.120 (Mumbai, IN)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Device Telemetry:</span>
                      <span className="text-white">Windows Desktop (Chrome)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Session Expiry:</span>
                      <span className="gold">24 hours left</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ─── PRINTABLE TAX INVOICE MODAL OVERLAY ─── */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/85 z-50 overflow-y-auto flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 p-8 rounded-3xl max-w-2xl w-full shadow-2xl space-y-6 relative slide-up">
            
            {/* Header action */}
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <span className="font-mono text-xs gold font-bold tracking-widest uppercase">Official Commercial Invoice</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="btn-gold px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Printer size={12} /> Print
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="w-8 h-8 rounded-lg border border-white/10 hover:border-white/20 flex items-center justify-center text-white/50 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Invoice Document Body */}
            <div id="printable-invoice-body" className="space-y-6 text-white text-xs leading-relaxed">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="display text-xl font-black gold uppercase tracking-widest">Trendy Multivendor</h3>
                  <p className="text-[10px] text-white/40">Luxury Avenue Block C, Level 4<br />GSTIN: 27AABCT8491F1Z2</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Invoice / Receipt</p>
                  <span className="font-mono font-bold text-white text-sm">{selectedInvoice.orderId}</span>
                  <p className="text-[10px] text-white/35">Date: {new Date(selectedInvoice.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="border-t border-b border-white/5 py-4 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-1">Billed To (Shopper)</p>
                  <strong className="text-white text-xs">{selectedInvoice.shippingAddress?.name}</strong>
                  <p className="text-[10px] text-white/50 mt-1">
                    {selectedInvoice.shippingAddress?.line1}, {selectedInvoice.shippingAddress?.city}, {selectedInvoice.shippingAddress?.state} - {selectedInvoice.shippingAddress?.pincode}<br />
                    Phone: {selectedInvoice.shippingAddress?.phone}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-1">Fulfillment Channel</p>
                  <strong>Trendy Express Logistics</strong>
                  <p className="text-[10px] text-white/50 mt-1">
                    Payment Method: <span className="uppercase text-white">{selectedInvoice.paymentMethod}</span><br />
                    Fulfillment Status: <span className="uppercase text-yellow-500 font-bold">{selectedInvoice.orderStatus}</span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold">Line Items List</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-white/35 font-bold uppercase text-[9px] border-b border-white/5 pb-1">
                    <span className="flex-1">Item details</span>
                    <span className="w-16 text-center">Qty</span>
                    <span className="w-20 text-right">Price</span>
                    <span className="w-24 text-right">Subtotal</span>
                  </div>
                  {selectedInvoice.orderItems?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1">
                      <span className="flex-1 font-semibold">{item.name} {item.color ? `(${item.color})` : ''}</span>
                      <span className="w-16 text-center font-bold">{item.quantity}</span>
                      <span className="w-20 text-right text-white/60">{formatCurrency(item.price)}</span>
                      <span className="w-24 text-right gold font-bold">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Calculations */}
              <div className="border-t border-white/5 pt-4 flex flex-col items-end space-y-1.5 text-right">
                <div className="flex justify-between w-64 text-white/40 font-semibold">
                  <span>Gross Subtotal:</span>
                  <span className="text-white">{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between w-64 text-white/40 font-semibold">
                  <span>Shipping & Handling Fee:</span>
                  <span className="text-white">{formatCurrency(selectedInvoice.shippingCost)}</span>
                </div>
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between w-64 text-red-400 font-semibold">
                    <span>Coupon Discount Applied:</span>
                    <span>-{formatCurrency(selectedInvoice.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between w-64 text-white font-bold text-sm pt-2 border-t border-white/5">
                  <span className="gold uppercase tracking-widest text-[10px]">Net Invoice Value:</span>
                  <span className="gold">{formatCurrency(selectedInvoice.totalAmount)}</span>
                </div>
              </div>
            </div>
            
            <p className="text-center text-[9px] text-white/20 italic">Generated electronically on India platform channels. Computer printout requires no physical signatures.</p>
          </div>
        </div>
      )}

      {/* ─── RETURN REQUEST MODAL OVERLAY ─── */}
      {returnModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setReturnModal(null)}>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-md w-full slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2 gold font-bold">
              <span>🔄</span> Request Free Return
            </div>
            <p className="text-xs text-white/40 mb-1">We provide free courier pickup at your shipping address.</p>
            <p className="text-xs text-emerald-400 font-semibold mb-6">✓ No return shipment costs. Fully reimbursed splits once approved.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-2 font-bold">Reason for Return</label>
                <select 
                  value={returnReason} 
                  onChange={e => setReturnReason(e.target.value)} 
                  className="input-field w-full px-4 py-3 rounded-xl text-xs text-white bg-black/45"
                >
                  <option value="">Select an operational reason</option>
                  <option value="Defective product or damaged on receipt">Defective product or damaged on receipt</option>
                  <option value="Wrong size/fit choice">Wrong size/fit choice</option>
                  <option value="Item not as pictured or described">Item not as pictured or described</option>
                  <option value="Quality below expectations">Quality below expectations</option>
                  <option value="Ordered multiple sizes to check">Ordered multiple sizes to check</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setReturnModal(null)} className="btn-outline flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider">
                  Cancel
                </button>
                <button 
                  onClick={() => handleRequestReturn(returnModal)} 
                  disabled={submittingReturn} 
                  className="btn-gold flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-60"
                >
                  {submittingReturn ? "Submitting..." : "Submit Return"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW ADDRESS DIALOG MODAL */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setShowAddressModal(false)}>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-md w-full slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-6">
              <h3 className="font-bold text-sm uppercase tracking-wider gold">Add Shipping Address</h3>
              <button onClick={() => setShowAddressModal(false)} className="text-white/40 hover:text-white"><X size={16} /></button>
            </div>
            
            <form onSubmit={handleAddAddressSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] tracking-widest uppercase text-white/40 mb-1 font-bold">Address Tag</label>
                  <select 
                    value={newAddress.label} 
                    onChange={e => setNewAddress({...newAddress, label: e.target.value})}
                    className="input-field w-full px-3 py-2.5 rounded-xl bg-black/45"
                  >
                    <option value="Home">Home</option>
                    <option value="Office">Office / Work</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] tracking-widest uppercase text-white/40 mb-1 font-bold">Consignee Name</label>
                  <input 
                    type="text" 
                    value={newAddress.name} 
                    onChange={e => setNewAddress({...newAddress, name: e.target.value})}
                    placeholder="E.g. Alex Rivera" 
                    className="input-field w-full px-3 py-2.5 rounded-xl bg-black/45" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] tracking-widest uppercase text-white/40 mb-1 font-bold">Phone Number</label>
                  <input 
                    type="tel" 
                    value={newAddress.phone} 
                    onChange={e => setNewAddress({...newAddress, phone: e.target.value})}
                    placeholder="+91 98765 00000" 
                    className="input-field w-full px-3 py-2.5 rounded-xl bg-black/45" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[9px] tracking-widest uppercase text-white/40 mb-1 font-bold">Postal Pincode</label>
                  <input 
                    type="text" 
                    value={newAddress.pincode} 
                    onChange={e => setNewAddress({...newAddress, pincode: e.target.value})}
                    placeholder="400058" 
                    className="input-field w-full px-3 py-2.5 rounded-xl bg-black/45" 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] tracking-widest uppercase text-white/40 mb-1 font-bold">Street Address / Line 1</label>
                <input 
                  type="text" 
                  value={newAddress.line1} 
                  onChange={e => setNewAddress({...newAddress, line1: e.target.value})}
                  placeholder="Building, Flat, Street coordinates" 
                  className="input-field w-full px-3 py-2.5 rounded-xl bg-black/45" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] tracking-widest uppercase text-white/40 mb-1 font-bold">City</label>
                  <input 
                    type="text" 
                    value={newAddress.city} 
                    onChange={e => setNewAddress({...newAddress, city: e.target.value})}
                    placeholder="Mumbai" 
                    className="input-field w-full px-3 py-2.5 rounded-xl bg-black/45" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[9px] tracking-widest uppercase text-white/40 mb-1 font-bold">State</label>
                  <input 
                    type="text" 
                    value={newAddress.state} 
                    onChange={e => setNewAddress({...newAddress, state: e.target.value})}
                    placeholder="Maharashtra" 
                    className="input-field w-full px-3 py-2.5 rounded-xl bg-black/45" 
                    required 
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewAddress({...newAddress, isDefault: !newAddress.isDefault})}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${newAddress.isDefault ? 'bg-yellow-500 border-transparent' : 'border-white/20'}`}
                >
                  {newAddress.isDefault && <CheckCircle2 size={12} className="text-black" />}
                </button>
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Set as default shipping address</span>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setShowAddressModal(false)} className="btn-outline flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider">
                  Cancel
                </button>
                <button type="submit" className="btn-gold flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider">
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
