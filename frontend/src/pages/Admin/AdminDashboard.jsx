import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { insforge } from "../../lib/insforge";
import Loader from "../../components/Loader";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  Users as UsersIcon,
  Store,
  Package,
  ShoppingBag,
  Boxes,
  CreditCard,
  Banknote,
  TrendingUp,
  FileSpreadsheet,
  Megaphone,
  Percent,
  Sliders,
  FolderOpen,
  RotateCcw,
  AlertOctagon,
  LifeBuoy,
  Bell,
  ShieldAlert,
  Settings as SettingsIcon,
  LogOut,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Sun,
  Moon,
  ChevronRight,
  Database,
  Cpu,
  Fingerprint,
  Truck
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  // Navigation and UI state
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Spotlight Command Palette
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");

  // Administrative Data State
  const [pendingVendors, setPendingVendors] = useState([]);
  const [approvedVendors, setApprovedVendors] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [platformOrders, setPlatformOrders] = useState([]);
  const [profilesList, setProfilesList] = useState([]);
  const [selectedKycDocument, setSelectedKycDocument] = useState(null);

  // Global Logistics Network State
  const [activeShipments, setActiveShipments] = useState([]);
  const [contractorsList, setContractorsList] = useState([]);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [selectedActiveShipment, setSelectedActiveShipment] = useState(null);
  const [loadingLogistics, setLoadingLogistics] = useState(false);

  const [analytics, setAnalytics] = useState({
    grossRevenue: 0,
    platformCommission: 0,
    vendorPayout: 0,
    totalSales: 0,
  });

  // Commission editing rate state
  const [editingCommRate, setEditingCommRate] = useState({});

  // Coupons State
  const [couponsList, setCouponsList] = useState([]);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [couponForm, setCouponForm] = useState({
    code: "",
    type: "percent",
    discount: "",
    min_order: "",
    max_discount: "",
    is_active: true
  });

  // Admin Dashboard extra features: Order/Coupon search and filters
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [expandedOrders, setExpandedOrders] = useState({});
  const [couponSearch, setCouponSearch] = useState("");

  // Command palette shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!user) return;
    const userRole = user.profile?.role || user.role;
    if (userRole !== "admin") {
      toast.error("Access Denied: You do not have Administrator permissions.");
      navigate("/");
      return;
    }
    loadAdminData();
  }, [user]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch pending vendors
      const { data: pending, error: pendingErr } = await insforge.database
        .from("vendors")
        .select("*, profiles:user_id(first_name, last_name, phone)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (pendingErr) throw pendingErr;
      setPendingVendors(pending || []);

      // 2. Fetch approved vendors
      const { data: approved, error: approvedErr } = await insforge.database
        .from("vendors")
        .select("*, profiles:user_id(first_name, last_name, phone)")
        .neq("status", "pending")
        .order("created_at", { ascending: false });

      if (approvedErr) throw approvedErr;
      setApprovedVendors(approved || []);

      // 3. Fetch all platform products
      const { data: products, error: pErr } = await insforge.database
        .from("products")
        .select("*, vendors:seller_id(store_name)")
        .order("created_at", { ascending: false });

      if (pErr) throw pErr;
      setAllProducts(products || []);

      // 4. Fetch all platform order items to compute revenue split payouts
      const { data: items, error: iErr } = await insforge.database
        .from("order_items")
        .select("*, products(*), orders(*)");

      if (iErr) throw iErr;

      // Sort items by parent order creation timestamp in memory (order_items table has no created_at column)
      const sortedItems = (items || []).sort((a, b) => {
        const dateA = a.orders?.created_at ? new Date(a.orders.created_at) : new Date(0);
        const dateB = b.orders?.created_at ? new Date(b.orders.created_at) : new Date(0);
        return dateB - dateA;
      });

      setPlatformOrders(sortedItems);

      // 5. Fetch all profiles for user manager
      const { data: profiles, error: profErr } = await insforge.database
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profErr) throw profErr;
      setProfilesList(profiles || []);

      // 6. Fetch all coupons
      const { data: coupons, error: cErr } = await insforge.database
        .from("coupons")
        .select()
        .order("created_at", { ascending: false });

      if (cErr) throw cErr;
      setCouponsList(coupons || []);

      // Calculate splits
      let gross = 0;
      let platformComm = 0;
      let vendorPay = 0;
      let qty = 0;

      const vendorCommMap = {};
      [...(pending || []), ...(approved || [])].forEach(v => {
        vendorCommMap[v.user_id] = parseFloat(v.commission_rate || 10.00);
      });

      (items || []).forEach(item => {
        const orderStatus = item.orders?.order_status;
        if (orderStatus && orderStatus !== "Cancelled" && orderStatus !== "Returned") {
          const sellerId = item.products?.seller_id;
          const commRate = sellerId && vendorCommMap[sellerId] !== undefined ? vendorCommMap[sellerId] : 10.00;
          
          const totalVal = item.price * item.quantity;
          const commVal = (totalVal * commRate) / 100;
          const payVal = totalVal - commVal;

          gross += totalVal;
          platformComm += commVal;
          vendorPay += payVal;
          qty += item.quantity;
        }
      });

      setAnalytics({
        grossRevenue: gross,
        platformCommission: platformComm,
        vendorPayout: vendorPay,
        totalSales: qty,
      });

      // Fetch logistics network details
      const { data: shipmentsData } = await insforge.database
        .from("shipments")
        .select("*, contractors(*), vehicles(*)")
        .order("created_at", { ascending: false });
      setActiveShipments(shipmentsData || []);

      const { data: contrs } = await insforge.database.from("contractors").select("*");
      const { data: vehs } = await insforge.database.from("vehicles").select("*");
      setContractorsList(contrs || []);
      setVehiclesList(vehs || []);

    } catch (err) {
      console.error("Failed to load admin dashboard data:", err);
      toast.error("Error loading administration parameters");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectShipment = async (ship) => {
    setLoadingLogistics(true);
    try {
      const { data: routes } = await insforge.database
        .from('delivery_routes')
        .select('*')
        .eq('shipment_id', ship.id)
        .order('sequence_order', { ascending: true });

      const { data: tracking } = await insforge.database
        .from('tracking')
        .select('*')
        .eq('shipment_id', ship.id)
        .order('timestamp', { ascending: false });

      setSelectedActiveShipment({
        ...ship,
        routes: routes || [],
        tracking: tracking || []
      });
    } catch (err) {
      toast.error("Failed to load shipment details");
    } finally {
      setLoadingLogistics(false);
    }
  };

  // Vendor actions
  const handleVendorAction = async (vendorId, action) => {
    try {
      const { error } = await insforge.database
        .from("vendors")
        .update({ status: action, updated_at: new Date().toISOString() })
        .eq("id", vendorId);

      if (error) throw error;

      if (action === "approved") {
        const { data: vRecord } = await insforge.database
          .from("vendors")
          .select("user_id")
          .eq("id", vendorId)
          .single();

        if (vRecord) {
          await insforge.database
            .from("profiles")
            .update({ role: "merchant", updated_at: new Date().toISOString() })
            .eq("id", vRecord.user_id);
        }
      }

      toast.success(`Merchant onboarding application successfully ${action === "approved" ? "approved" : "rejected"}!`);
      loadAdminData();
    } catch (err) {
      toast.error("Failed to process merchant action");
    }
  };

  // Update commission rate splits
  const handleUpdateCommission = async (vendorId, rate) => {
    try {
      const rateVal = parseFloat(rate);
      if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) {
        toast.error("Please enter a valid rate between 0 and 100");
        return;
      }

      const { error } = await insforge.database
        .from("vendors")
        .update({ commission_rate: rateVal, updated_at: new Date().toISOString() })
        .eq("id", vendorId);

      if (error) throw error;

      setEditingCommRate(prev => ({ ...prev, [vendorId]: false }));
      toast.success("Merchant commission split rate successfully adjusted!");
      loadAdminData();
    } catch (err) {
      toast.error("Failed to adjust commission split");
    }
  };

  // Policy listing revoking
  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to revoke this product listing? This will violate merchant agreements.")) return;
    try {
      const { error } = await insforge.database
        .from("products")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Product listing successfully revoked!");
      loadAdminData();
    } catch (err) {
      toast.error("Failed to revoke listing");
    }
  };

  // Block/unblock shoppers
  const handleBlockProfile = async (id, currentRole) => {
    const targetRole = currentRole === "blocked" ? "customer" : "blocked";
    try {
      const { error } = await insforge.database
        .from("profiles")
        .update({ role: targetRole, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success(`Shopper account status updated to: ${targetRole}`);
      loadAdminData();
    } catch (err) {
      toast.error("Failed to update shopper status");
    }
  };

  const handleUpdateUserRole = async (userId, targetRole) => {
    try {
      const { error } = await insforge.database
        .from("profiles")
        .update({ role: targetRole, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) throw error;
      toast.success(`User role successfully updated to: ${targetRole}`);
      loadAdminData();
    } catch (err) {
      toast.error("Failed to update user role");
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const updates = {
        order_status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === "Delivered") {
        updates.delivered_at = new Date().toISOString();
        updates.payment_status = "paid";
      }

      const { error } = await insforge.database
        .from("orders")
        .update(updates)
        .eq("id", orderId);
      
      if (error) throw error;

      await insforge.database.from("order_status_history").insert([{
        order_id: orderId,
        status: newStatus,
        note: `Order status processed by Administrator to: ${newStatus}`,
      }]);

      toast.success(`Order status updated to: ${newStatus}`);
      loadAdminData();
    } catch (err) {
      console.error("Failed to update order status:", err);
      toast.error(err.message || "Failed to update order status");
    }
  };

  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        code: couponForm.code.toUpperCase().trim(),
        type: couponForm.type,
        discount: parseFloat(couponForm.discount) || 0,
        min_order: parseFloat(couponForm.min_order) || 0,
        max_discount: couponForm.max_discount ? parseFloat(couponForm.max_discount) : null,
        is_active: couponForm.is_active
      };

      if (editingCoupon) {
        const { error } = await insforge.database
          .from("coupons")
          .update(payload)
          .eq("id", editingCoupon.id);
        if (error) throw error;
        toast.success("Coupon updated successfully!");
      } else {
        const { error } = await insforge.database
          .from("coupons")
          .insert([payload]);
        if (error) throw error;
        toast.success("Coupon created successfully!");
      }

      setShowCouponForm(false);
      setEditingCoupon(null);
      setCouponForm({ code: "", type: "percent", discount: "", min_order: "", max_discount: "", is_active: true });
      loadAdminData();
    } catch (err) {
      toast.error(err.message || "Failed to save coupon");
    }
  };

  const handleEditCoupon = (coupon) => {
    setEditingCoupon(coupon);
    setCouponForm({
      code: coupon.code || "",
      type: coupon.type || "percent",
      discount: coupon.discount || "",
      min_order: coupon.min_order || "",
      max_discount: coupon.max_discount || "",
      is_active: coupon.is_active ?? true
    });
    setShowCouponForm(true);
  };

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      const { error } = await insforge.database
        .from("coupons")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Coupon deleted");
      loadAdminData();
    } catch (err) {
      toast.error("Failed to delete coupon");
    }
  };

  // Command palette filter list
  const commandFilteredItems = [
    { label: "Dashboard General Overview", action: () => { setActiveTab("overview"); setShowCommandPalette(false); } },
    { label: "Onboarding Sellers Approvals", action: () => { setActiveTab("onboarding"); setShowCommandPalette(false); } },
    { label: "Verify Active Sellers", action: () => { setActiveTab("vendors"); setShowCommandPalette(false); } },
    { label: "Users Shopper Manager", action: () => { setActiveTab("users"); setShowCommandPalette(false); } },
    { label: "Revoke Product Catalog Listings", action: () => { setActiveTab("products"); setShowCommandPalette(false); } },
    { label: "Global Logistics OS Center", action: () => { setActiveTab("logistics"); setShowCommandPalette(false); } },
    { label: "Security & Auditing Geolocation Logs", action: () => { setActiveTab("security"); setShowCommandPalette(false); } },
    { label: "Disputes Resolution Margins", action: () => { setActiveTab("disputes"); setShowCommandPalette(false); } },
    { label: "Toggle Dark / Light Console Style", action: () => { setIsDarkMode(!isDarkMode); setShowCommandPalette(false); } }
  ].filter(c => c.label.toLowerCase().includes(commandSearch.toLowerCase()));

  const formatCurrency = (p) => `₹${(p || 0).toLocaleString("en-IN")}`;

  const statusColorMap = {
    "Processing": "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    "Confirmed": "text-blue-400 bg-blue-500/10 border-blue-500/20",
    "Shipped": "text-sky-500 bg-sky-500/10 border-sky-500/20",
    "Out for Delivery": "text-pink-400 bg-pink-500/10 border-pink-500/20",
    "Delivered": "text-green-400 bg-green-500/10 border-green-500/20",
    "Cancelled": "text-red-400 bg-red-500/10 border-red-500/20",
    "Returned": "text-red-400 bg-red-500/10 border-red-500/20",
  };

  // Theme support
  const themeBg = isDarkMode ? "bg-[#0a0a0a] text-white" : "bg-[#f5f6f8] text-[#0a0a0a]";
  const cardBg = isDarkMode ? "bg-[#111] border-white/5" : "bg-white border-black/5 shadow-md shadow-black/[0.02]";
  const inputBg = isDarkMode ? "bg-white/[0.04] border-white/10" : "bg-black/[0.02] border-black/10 text-black";
  const borderLight = isDarkMode ? "border-white/5" : "border-black/5";
  const textSubtle = isDarkMode ? "text-white/40" : "text-black/40";
  const textTitle = isDarkMode ? "text-white" : "text-black";

  return (
    <div className={`min-h-screen pt-24 pb-16 flex flex-col lg:flex-row max-w-7xl mx-auto px-6 gap-8 transition-colors duration-300 ${themeBg}`}>
      
      {/* SIDEBAR ADMINISTRATIVE ACCESS */}
      <aside className={`w-full lg:w-64 flex-shrink-0 border p-6 rounded-2xl self-start shadow-xl ${cardBg}`}>
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#d4af37] to-[#f5d26e] flex items-center justify-center font-bold text-[#0a0a0a] text-xl">
            🛡️
          </div>
          <div>
            <h4 className={`font-bold text-sm truncate ${textTitle}`}>Control Center</h4>
            <span className="inline-block text-[8px] bg-yellow-500/10 text-yellow-500 font-extrabold px-2.5 py-0.5 rounded-full mt-1 border border-yellow-500/20 tracking-widest uppercase">
              Admin Portal
            </span>
          </div>
        </div>

        {/* 20 OPERATIONAL SECTION TABS */}
        <nav className="flex flex-col gap-1">
          {[
            { id: "overview", label: "Dashboard", icon: LayoutDashboard },
            { id: "onboarding", label: "Onboarding approvals", icon: Sliders, count: pendingVendors.length },
            { id: "vendors", label: "Approved Sellers", icon: Store, count: approvedVendors.length },
            { id: "users", label: "Shopper Manager", icon: UsersIcon, count: profilesList.length },
            { id: "products", label: "Catalog Audit", icon: Package, count: allProducts.length },
            { id: "orders", label: "All Platform Orders", icon: ShoppingBag, count: platformOrders.length },
            { id: "logistics", label: "Logistics OS Center", icon: Truck, count: activeShipments.filter(s => s.status !== "Delivered").length },
            { id: "inventory", label: "Global Stock", icon: Boxes },
            { id: "payments", label: "Payments split", icon: CreditCard },
            { id: "payouts", label: "Payouts Settlement", icon: Banknote },
            { id: "analytics", label: "splits analytics", icon: TrendingUp },
            { id: "reports", label: "Ledger Reports", icon: FileSpreadsheet },
            { id: "marketing", label: "CMS Editor", icon: Megaphone },
            { id: "coupons", label: "platform coupons", icon: Percent },
            { id: "banners", label: "landing banners", icon: Sliders },
            { id: "categories", label: "promotional tags", icon: FolderOpen },
            { id: "returns", label: "Returns disputes", icon: RotateCcw },
            { id: "disputes", label: "Fraud Disputes", icon: AlertOctagon },
            { id: "support", label: "Help Tickets", icon: LifeBuoy },
            { id: "notifications", label: "System Alerts", icon: Bell },
            { id: "security", label: "Security & MFA logs", icon: ShieldAlert },
            { id: "settings", label: "System settings", icon: SettingsIcon },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab.id
                    ? "bg-yellow-500/10 gold border border-yellow-500/20"
                    : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${tab.id === 'onboarding' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-white/10 text-white'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
          
          <button
            onClick={async () => {
              await insforge.auth.signOut();
              navigate("/login");
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/5 transition-all mt-4"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </nav>

        {/* Local light/dark style toggle */}
        <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
          <span className={`text-[9px] uppercase tracking-widest font-bold ${textSubtle}`}>Style Theme</span>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/5"
          >
            {isDarkMode ? <Sun size={14} className="text-yellow-400" /> : <Moon size={14} className="text-slate-500" />}
          </button>
        </div>
      </aside>

      {/* MAIN PLATFORM EXECUTIVE PANEL */}
      <main className="flex-1 min-w-0 space-y-6">
        
        {/* HEADER TOOLBAR WITH COMMAND PALETTE SPOTLIGHT */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              readOnly
              onClick={() => setShowCommandPalette(true)}
              placeholder="Search or jump... (Ctrl+K)"
              className={`input-field w-full pl-9 pr-4 py-2.5 rounded-xl text-xs cursor-pointer ${inputBg}`}
            />
          </div>
          
          <div className="flex items-center gap-4 text-xs font-semibold text-white/40 self-end">
            <span>Control Gateway: Secured</span>
            <span>RLS Active</span>
          </div>
        </header>

        {/* ─── TAB: GENERAL OVERVIEW ─── */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Platform Overview</h2>
              <p className={`text-xs ${textSubtle}`}>Gross transaction volume, aggregated platform service fee commissions, and payouts.</p>
            </div>

            {/* Split metrics panel */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[
                { title: "Gross Platform GTV", val: formatCurrency(analytics.grossRevenue), desc: "Total transactions value", col: "gold" },
                { title: "Fee Commissions", val: formatCurrency(analytics.platformCommission), desc: "Aggregated service fee", col: "gold" },
                { title: "Net Seller Share", val: formatCurrency(analytics.vendorPayout), desc: "Bank payout splits", col: "text-green-400" },
                { title: "Active Platforms", val: approvedVendors.length + 1, desc: "Onboarded merchants", col: "text-blue-400" }
              ].map((card, i) => (
                <div key={i} className={`border rounded-2xl p-5 shadow-lg relative overflow-hidden group ${cardBg}`}>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-xl group-hover:bg-[#d4af37]/5 transition-all" />
                  <div className={`text-[10px] uppercase tracking-widest font-bold mb-2 ${textSubtle}`}>{card.title}</div>
                  <h4 className={`text-xl font-black ${card.col === 'gold' ? textTitle : card.col}`}>{card.val}</h4>
                  <p className={`text-[9px] mt-1 ${textSubtle}`}>{card.desc}</p>
                </div>
              ))}
            </div>

            {/* Simulated Server Health telemetry charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Server health telemetry */}
              <div className={`border rounded-2xl p-6 shadow-xl lg:col-span-2 space-y-5 ${cardBg}`}>
                <h4 className={`font-bold text-xs uppercase tracking-wider border-b border-white/5 pb-4 ${textTitle}`}>
                  🖥️ Server Telemetry Health Monitors
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  {[
                    { title: "CPU LOAD", val: "24%", icon: Cpu, col: "text-green-400" },
                    { title: "MEMORY USAGE", val: "1.2 GB / 8 GB", icon: Database, col: "text-green-400" },
                    { title: "API LATENCY", val: "14ms", icon: Sliders, col: "text-emerald-400" },
                    { title: "DB CONNECTIONS", val: "42 Active", icon: Fingerprint, col: "text-yellow-500" }
                  ].map((sys, idx) => {
                    const Icon = sys.icon;
                    return (
                      <div key={idx} className="p-4 bg-black/[0.02] border border-white/5 rounded-xl">
                        <div className="flex justify-center mb-2">
                          <Icon size={18} className={sys.col} />
                        </div>
                        <span className={`text-[8px] uppercase tracking-widest font-bold block ${textSubtle}`}>{sys.title}</span>
                        <strong className={`text-xs block mt-1 ${textTitle}`}>{sys.val}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Platform Splits SVG Chart */}
              <div className={`border rounded-2xl p-6 shadow-xl space-y-4 ${cardBg}`}>
                <h4 className={`font-bold text-xs uppercase tracking-wider border-b border-white/5 pb-4 ${textTitle}`}>
                  Platformsplits Ledger
                </h4>
                <div className="h-32 w-full pt-1 flex justify-center items-center">
                  <svg className="w-full h-full overflow-visible max-w-[200px]" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="15" />
                    {/* Simulated splits: 88% merchant, 12% admin */}
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#d4af37" strokeWidth="15" strokeDasharray="251" strokeDashoffset="30" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="15" strokeDasharray="251" strokeDashoffset="220" />
                  </svg>
                </div>
                <div className={`flex justify-between text-[9px] font-bold uppercase ${textSubtle}`}>
                  <span>Merchants (88%)</span>
                  <span>Platform Fee (12%)</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ─── TAB: SELLERS ONBOARDING APPROVALS ─── */}
        {activeTab === "onboarding" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Sellers Onboarding Approvals</h2>
              <p className={`text-xs ${textSubtle}`}>Review merchant business profiles, manual legal GSTIN/PAN entries, and approve bank payout accounts.</p>
            </div>

            <div className={`border rounded-2xl shadow-xl overflow-hidden ${cardBg}`}>
              {pendingVendors.length === 0 ? (
                <div className="text-center py-20">
                  <span className="text-4xl block mb-4">🎉</span>
                  <h4 className="font-bold text-base mb-2">Applications Caught Up</h4>
                  <p className={`text-xs max-w-xs mx-auto ${textSubtle}`}>There are no pending seller onboarding applications.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {pendingVendors.map(vendor => (
                    <div key={vendor.id} className="p-6 hover:bg-white/[0.005] transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h4 className={`font-bold text-lg ${textTitle}`}>{vendor.store_name}</h4>
                            <span className="text-[9px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/20 font-bold uppercase tracking-wider">
                              Pending Review
                            </span>
                          </div>

                          <p className={`text-xs ${textSubtle}`}>
                            Seller Name: <strong className={textTitle}>{vendor.profiles?.first_name} {vendor.profiles?.last_name}</strong> | 
                            Registered Phone: <strong className={textTitle}>{vendor.profiles?.phone || "N/A"}</strong>
                          </p>

                          {/* document preview checker */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 p-4 bg-white/[0.01] border border-white/5 rounded-xl">
                            {[
                              { label: "PAN CARD ID", code: vendor.pan_card || "N/A" },
                              { label: "GSTIN ID", code: vendor.gst_number || "N/A" },
                              { label: "AADHAAR ID", code: vendor.aadhar_number || "N/A" },
                              { label: "BANK ACCOUNT ID", code: vendor.bank_account || "N/A" }
                            ].map((kyc, i) => (
                              <div key={i} className="space-y-1">
                                <span className={`text-[8px] uppercase tracking-widest font-bold ${textSubtle}`}>{kyc.label}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[11px] font-bold uppercase font-mono ${textTitle}`}>{kyc.code}</span>
                                  <button
                                    onClick={() => setSelectedKycDocument({ label: kyc.label, code: kyc.code, storeName: vendor.store_name })}
                                    className="text-yellow-500 hover:text-yellow-400"
                                    title="Preview Document Details"
                                  >
                                    <Eye size={10} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex sm:items-center gap-3 self-end lg:self-center">
                          <button
                            onClick={() => handleVendorAction(vendor.id, "rejected")}
                            className="border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                          >
                            Reject Onboarding ❌
                          </button>
                          <button
                            onClick={() => handleVendorAction(vendor.id, "approved")}
                            className="btn-gold px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest"
                          >
                            Approve Merchant ✓
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: APPROVED MERCHANTS ─── */}
        {activeTab === "vendors" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Approved Marketplace Merchants</h2>
              <p className={`text-xs ${textSubtle}`}>Active platform merchants, platform fee commission rates, and payouts status.</p>
            </div>

            <div className={`border rounded-2xl shadow-xl overflow-hidden ${cardBg}`}>
              {approvedVendors.length === 0 ? (
                <p className={`text-xs text-center py-20 ${textSubtle}`}>No active marketplace merchants recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 tracking-wider uppercase font-semibold">
                        <th className="px-6 py-4">Merchant brand info</th>
                        <th className="px-6 py-4">Seller Owner</th>
                        <th className="px-6 py-4">PAN / GST Details</th>
                        <th className="px-6 py-4">Commission Splits</th>
                        <th className="px-6 py-4 text-center">Fulfillment Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {approvedVendors.map(vendor => (
                        <tr key={vendor.id} className="hover:bg-white/[0.005] transition-colors">
                          <td className="px-6 py-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-yellow-500">
                              {vendor.store_name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className={`font-bold text-sm ${textTitle}`}>{vendor.store_name}</p>
                              <span className={`text-[9px] ${textSubtle}`}>Approved: {new Date(vendor.created_at).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className={`px-6 py-4 font-semibold ${textTitle}`}>
                            {vendor.profiles?.first_name} {vendor.profiles?.last_name}
                          </td>
                          <td className={`px-6 py-4 font-mono font-semibold ${textSubtle}`}>
                            GSTIN: {vendor.gst_number || "N/A"}<br />
                            PAN: {vendor.pan_card || "N/A"}
                          </td>
                          <td className="px-6 py-4 font-bold text-yellow-500">
                            {editingCommRate[vendor.id] ? (
                              <input
                                type="number"
                                defaultValue={vendor.commission_rate}
                                id={`comm-${vendor.id}`}
                                className="w-16 px-2 py-1 rounded bg-black/45 border border-yellow-500 text-xs text-white"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdateCommission(vendor.id, e.target.value);
                                  }
                                }}
                              />
                            ) : (
                              `${vendor.commission_rate}%`
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {editingCommRate[vendor.id] ? (
                              <button
                                onClick={() => {
                                  const val = document.getElementById(`comm-${vendor.id}`).value;
                                  handleUpdateCommission(vendor.id, val);
                                }}
                                className="text-[10px] text-green-400 font-bold hover:underline"
                              >
                                Save rate
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditingCommRate(prev => ({ ...prev, [vendor.id]: true }))}
                                className="p-1.5 border border-white/10 hover:border-yellow-500 rounded-lg hover:bg-yellow-500/5 transition-all text-xs"
                                title="Edit Split Margin"
                              >
                                ✏️ Splits
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: USERS ACCOUNT MANAGER ─── */}
        {activeTab === "users" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Platform Users Account Manager</h2>
              <p className={`text-xs ${textSubtle}`}>Oversee shopper account configurations, audit active logins, and block/unblock profiles.</p>
            </div>

            <div className={`border rounded-2xl shadow-xl overflow-hidden ${cardBg}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 tracking-wider uppercase font-semibold">
                      <th className="px-6 py-4">Shopper profile</th>
                      <th className="px-6 py-4">Phone Number</th>
                      <th className="px-6 py-4">System Role</th>
                      <th className="px-6 py-4">Created Time</th>
                      <th className="px-6 py-4 text-center">Security Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {profilesList.map(profile => (
                      <tr key={profile.id} className="hover:bg-white/[0.005] transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-bold text-yellow-500 uppercase">
                            {profile.first_name?.charAt(0)}
                          </div>
                          <div>
                            <p className={`font-bold text-sm ${textTitle}`}>{profile.first_name} {profile.last_name}</p>
                            <span className={`text-[9px] ${textSubtle}`}>{profile.id.slice(0, 12)}...</span>
                          </div>
                        </td>
                        <td className={`px-6 py-4 font-mono font-semibold ${textTitle}`}>{profile.phone || "N/A"}</td>
                        <td className="px-6 py-4">
                          <select
                            value={profile.role === 'vendor' ? 'merchant' : (profile.role === 'customer' ? 'user' : (profile.role || 'user'))}
                            onChange={e => handleUpdateUserRole(profile.id, e.target.value)}
                            className="bg-black/45 border border-white/10 rounded px-2.5 py-1 text-[10px] text-white focus:outline-none focus:border-yellow-500 uppercase font-extrabold"
                          >
                            <option value="user">User</option>
                            <option value="merchant">Merchant</option>
                            <option value="admin">Admin</option>
                            <option value="blocked">Blocked</option>
                          </select>
                        </td>
                        <td className={`px-6 py-4 ${textSubtle}`}>{new Date(profile.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleBlockProfile(profile.id, profile.role)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all border ${
                              profile.role === 'blocked'
                                ? 'border-green-500/20 text-green-400 hover:bg-green-500/5'
                                : 'border-red-500/20 text-red-400 hover:bg-red-500/5'
                            }`}
                          >
                            {profile.role === "blocked" ? "Unblock Shopper" : "Block Shopper"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: CATALOG AUDITING ─── */}
        {activeTab === "products" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Global Catalog Auditing</h2>
              <p className={`text-xs ${textSubtle}`}>Moderating merchant storefront catalog items, price index guidelines, and policy revoking.</p>
            </div>

            <div className={`border rounded-2xl shadow-xl overflow-hidden ${cardBg}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 tracking-wider uppercase font-semibold">
                      <th className="px-6 py-4">Product Detail</th>
                      <th className="px-6 py-4">Merchant Storefront</th>
                      <th className="px-6 py-4">Pricing splits</th>
                      <th className="px-6 py-4">Warehouse stocks</th>
                      <th className="px-6 py-4 text-center">Policy Safety</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {allProducts.map(p => (
                      <tr key={p.id} className="hover:bg-white/[0.005] transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <img src={p.img} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                          <div>
                            <p className={`font-bold text-sm ${textTitle}`}>{p.name}</p>
                            <span className={`text-[9px] font-mono ${textSubtle}`}>ID: {p.id.slice(0, 8)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-yellow-500 uppercase tracking-widest">
                          {p.vendors?.store_name || "Trendy Admin"}
                        </td>
                        <td className="px-6 py-4 font-semibold text-white/60">
                          Sale: ₹{p.price.toLocaleString()}<br />
                          Cost: ₹{p.original_price?.toLocaleString()}
                        </td>
                        <td className={`px-6 py-4 font-bold ${p.stock < 5 ? 'text-yellow-500' : textSubtle}`}>{p.stock} units</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2 rounded-xl text-[9px] font-bold uppercase transition-all"
                          >
                            Revoke Listing 🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: SECURITY & MFA AUDIT LOGS ─── */}
        {activeTab === "security" && (
          <div className="space-y-6 animate-fade-in max-w-2xl">
            <div>
              <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Platform Security Auditing</h2>
              <p className={`text-xs ${textSubtle}`}>Securing administrator accounts, device logs, and geolocation IP connection attempts.</p>
            </div>

            {/* Geolocation IP attempts table */}
            <div className={`border rounded-2xl p-6 ${cardBg} space-y-4 shadow-xl`}>
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h4 className={`font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${textTitle}`}>
                  <ShieldAlert size={14} className="text-red-500" /> Active Session Device Logs
                </h4>
                <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold uppercase">
                  MFA Protection Active
                </span>
              </div>

              <div className="space-y-4">
                {[
                  { user: "admin@trendy.com", ip: "103.45.24.120", geo: "Mumbai, Maharashtra, IN", device: "Chrome 124 / Windows Desktop", time: "Just Now", status: "Successful MFA Verified" },
                  { user: "seller1@trendy.com", ip: "42.102.5.19", geo: "Delhi, IN", device: "Safari 17 / iPhone 15", time: "1 hour ago", status: "Successful Credentials Login" },
                  { user: "unknown_user", ip: "198.51.100.4", geo: "California, US", device: "Firefox / Linux Desktop", time: "3 hours ago", status: "Failed Login: Unauthorized Role Card" }
                ].map((log, idx) => (
                  <div key={idx} className="p-4 bg-black/[0.02] border border-white/5 rounded-xl text-[10px] font-semibold text-white/40 space-y-1.5 relative">
                    <div className="absolute top-4 right-4 text-[8px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold text-white">
                      {log.time}
                    </div>
                    <div className="flex justify-between w-3/4">
                      <span>Administrative ID:</span>
                      <strong className={textTitle}>{log.user}</strong>
                    </div>
                    <div className="flex justify-between w-3/4">
                      <span>IP Address Geolocation:</span>
                      <strong className={textTitle}>{log.ip} ({log.geo})</strong>
                    </div>
                    <div className="flex justify-between w-3/4">
                      <span>Device Telemetry:</span>
                      <strong className={textTitle}>{log.device}</strong>
                    </div>
                    <div className="flex justify-between w-3/4">
                      <span>MFA Status Logs:</span>
                      <strong className={log.status.includes('Failed') ? 'text-red-400' : 'text-emerald-400'}>{log.status}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      {/* ─── TAB: LOGISTICS OPERATING SYSTEM ─── */}
      {activeTab === "logistics" && (
          <div className="space-y-6 animate-fade-in text-xs font-semibold">
            <div>
              <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Logistics Control Gateway</h2>
              <p className={`text-xs ${textSubtle}`}>Monitor the multi-stage global routing engines, audit regional contractor hubs, and track in-transit fleet drivers.</p>
            </div>

            {/* Quick stats panel */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Active Consecutiveness", val: activeShipments.length, color: "text-white" },
                { label: "In Transit Depot Hubs", val: activeShipments.filter(s => s.status !== "Delivered" && s.status !== "Shipment Request").length, color: "text-blue-400" },
                { label: "Pending Handoff OTPs", val: activeShipments.filter(s => s.status === "Last Mile Delivery").length, color: "text-pink-400" },
                { label: "Fulfill Rate SLA", val: "98.4%", color: "text-green-400" }
              ].map((sys, idx) => (
                <div key={idx} className={`p-4 border rounded-2xl ${cardBg}`}>
                  <span className={`text-[8.5px] uppercase tracking-widest font-black ${textSubtle}`}>{sys.label}</span>
                  <h4 className={`text-xl font-black mt-1 ${sys.color}`}>{sys.val}</h4>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Shipment List */}
              <div className={`border rounded-2xl p-5 shadow-xl lg:col-span-1 space-y-4 h-fit ${cardBg}`}>
                <h3 className={`font-bold text-xs uppercase tracking-wider ${textTitle}`}>Active Consignments</h3>
                {activeShipments.length === 0 ? (
                  <p className={`text-center py-10 ${textSubtle}`}>No active shipments on platform</p>
                ) : (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {activeShipments.map(s => {
                      const isSel = selectedActiveShipment?.id === s.id;
                      return (
                        <div 
                          key={s.id}
                          onClick={() => handleSelectShipment(s)}
                          className={`p-3 border rounded-xl cursor-pointer transition-all ${
                            isSel ? 'bg-yellow-500/10 border-yellow-500/30 gold font-bold' : 'bg-black/25 border-white/5 hover:border-white/10 text-white/70'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className="font-mono font-bold text-[9.5px]">{s.shipment_id}</span>
                            <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded tracking-widest ${
                              s.status === 'Delivered' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'
                            }`}>{s.status}</span>
                          </div>
                          <p className="font-bold text-white/95 mt-1 text-[11px] truncate">Dest: {s.destination?.name}</p>
                          <p className={`text-[9px] ${textSubtle}`}>{s.destination?.city}, {s.destination?.state} ({s.destination?.pincode})</p>
                          <div className="flex items-center gap-1.5 mt-2 text-[9px] uppercase tracking-wider text-white/60">
                            <span>🚚 {s.contractors?.name ? s.contractors.name.split(" ")[0] : "Carrier"}</span>
                            <span>·</span>
                            <span className="capitalize">{s.delivery_mode} Mode</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Path & Timelines Viewer */}
              <div className={`border rounded-2xl p-6 shadow-xl lg:col-span-2 space-y-6 ${cardBg}`}>
                {selectedActiveShipment ? (
                  <div className="space-y-5">
                    {/* Header */}
                    <div className="border-b border-white/5 pb-4 flex flex-wrap justify-between items-start gap-4">
                      <div>
                        <h4 className={`font-black text-sm uppercase tracking-wider ${textTitle}`}>Consignment Detail</h4>
                        <p className={`text-[10px] mt-0.5 font-mono ${textSubtle}`}>{selectedActiveShipment.shipment_id}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase tracking-widest bg-yellow-500/10 border border-yellow-500/25 gold px-2.5 py-1 rounded-full font-black">
                          {selectedActiveShipment.delivery_mode} routing
                        </span>
                      </div>
                    </div>

                    {/* Node Addresses */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/35 border border-white/5 p-4 rounded-xl">
                      <div>
                        <span className="text-white/40 block text-[8px] uppercase tracking-widest font-black">Origin Warehouse Hub</span>
                        <p className="font-bold text-white mt-1 text-[11px]">{selectedActiveShipment.origin?.name}</p>
                        <p className={`text-[10px] ${textSubtle}`}>{selectedActiveShipment.origin?.line1}, {selectedActiveShipment.origin?.city}</p>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[8px] uppercase tracking-widest font-black">Shopper Destination Address</span>
                        <p className="font-bold text-white mt-1 text-[11px]">{selectedActiveShipment.destination?.name}</p>
                        <p className={`text-[10px] ${textSubtle}`}>{selectedActiveShipment.destination?.line1}, {selectedActiveShipment.destination?.area}, {selectedActiveShipment.destination?.city}</p>
                      </div>
                    </div>

                    {/* Route Sequences */}
                    <div className="space-y-3">
                      <span className="text-white/40 block text-[9px] uppercase tracking-widest font-black">Fulfillment Nodes Route Map</span>
                      <div className="border border-white/5 bg-black/20 p-4 rounded-xl space-y-4 relative">
                        {/* Connecting line */}
                        <div className="absolute top-8 bottom-8 left-6 w-[2px] bg-white/5" />
                        
                        {selectedActiveShipment.routes?.map((route, idx) => {
                          const statuses = [
                            'Shipment Request', 'Pickup Scheduled', 'International Shipping',
                            'Country Hub', 'State Hub', 'District Hub', 'Last Mile Delivery', 'Delivered'
                          ];
                          
                          const currIdx = statuses.indexOf(selectedActiveShipment.status);
                          const isCompleted = idx < currIdx || selectedActiveShipment.status === 'Delivered';
                          const isActiveNode = idx === currIdx && selectedActiveShipment.status !== 'Delivered';
                          
                          return (
                            <div key={route.id} className="flex gap-4 items-start relative z-10 text-[11px]">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-black ${
                                isCompleted ? 'bg-green-500 border-green-500 text-black' : isActiveNode ? 'bg-gold border-gold text-black shadow-[0_0_12px_rgba(212,175,55,0.4)]' : 'bg-neutral-900 border-white/20 text-white/30'
                              }`}>
                                {isCompleted ? '✓' : idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2 flex-wrap">
                                  <p className={`font-bold text-[11px] ${isActiveNode ? 'text-gold' : isCompleted ? 'text-white' : 'text-white/40'}`}>
                                    {route.from_location} → {route.to_location}
                                  </p>
                                  <span className={`text-[8px] tracking-widest uppercase font-black ${isActiveNode ? 'text-gold' : 'text-white/30'}`}>
                                    {route.transport_type}
                                  </span>
                                </div>
                                <p className={`text-[9px] mt-0.5 ${textSubtle}`}>Est. Transit: {route.estimated_days} day(s) · Sequence Priority #{route.sequence_order}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Driver details */}
                    {selectedActiveShipment.vehicles && (
                      <div className="bg-black/35 border border-white/5 p-4 rounded-xl flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center font-bold text-gold text-sm">
                          👨‍✈️
                        </div>
                        <div>
                          <span className="text-white/40 block text-[8px] uppercase tracking-widest font-black">Assigned Fleet Driver</span>
                          <p className="font-bold text-white text-[11px]">{selectedActiveShipment.vehicles.driver_name} (Plate: {selectedActiveShipment.vehicles.vehicle_id})</p>
                          <p className={`text-[10px] ${textSubtle}`}>Phone: {selectedActiveShipment.vehicles.driver_phone} · Current Status: {selectedActiveShipment.vehicles.status}</p>
                        </div>
                      </div>
                    )}

                    {/* Delivery verification OTP */}
                    {selectedActiveShipment.status !== 'Delivered' && (
                      <div className="bg-yellow-500/[0.02] border border-yellow-500/20 p-4 rounded-xl flex items-center justify-between gap-4">
                        <div>
                          <span className="text-white/40 block text-[8px] uppercase tracking-widest font-black">Safe Handoff OTP Verification Key</span>
                          <p className="text-[10px] text-white/50 leading-relaxed mt-1">This key is available on the shopper's order details view.</p>
                        </div>
                        <div className="bg-black border border-yellow-500/20 px-4 py-2 rounded-lg font-mono font-black text-xs gold tracking-widest select-all">
                          {selectedActiveShipment.otp_code}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-28 text-center space-y-3">
                    <span className="text-4xl text-white/20">📡</span>
                    <h4 className="font-bold text-sm text-white/60">No Consignment Selected</h4>
                    <p className={`text-xs max-w-xs ${textSubtle}`}>Select an active consignment from the left panel to inspect detailed paths, sequences, and tracking timelines.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Hubs & Contractors Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {/* Contractors Table */}
              <div className={`border rounded-2xl p-5 space-y-4 ${cardBg}`}>
                <h3 className={`font-bold text-xs uppercase tracking-wider ${textTitle}`}>Regional Contractors Matrix</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-white/50 tracking-wider uppercase font-semibold">
                        <th className="py-2">Partner</th>
                        <th className="py-2">Country/Region</th>
                        <th className="py-2">Rating</th>
                        <th className="py-2">Pricing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {contractorsList.map(c => (
                        <tr key={c.id} className="text-white/70">
                          <td className="py-2.5 font-bold text-white">{c.name}</td>
                          <td className="py-2.5 capitalize">{c.country}</td>
                          <td className="py-2.5 gold font-bold">★ {c.rating}</td>
                          <td className="py-2.5 font-mono">{c.pricing}x Base</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fleet Vehicles Table */}
              <div className={`border rounded-2xl p-5 space-y-4 ${cardBg}`}>
                <h3 className={`font-bold text-xs uppercase tracking-wider ${textTitle}`}>Active Fleet Vehicles</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-white/50 tracking-wider uppercase font-semibold">
                        <th className="py-2">Driver</th>
                        <th className="py-2">Vehicle Type</th>
                        <th className="py-2">Plate ID</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {vehiclesList.map(v => (
                        <tr key={v.id} className="text-white/70">
                          <td className="py-2.5 font-bold text-white">{v.driver_name}</td>
                          <td className="py-2.5">{v.type}</td>
                          <td className="py-2.5 font-mono text-[10px] uppercase">{v.vehicle_id}</td>
                          <td className="py-2.5">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest ${
                              v.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-500'
                            }`}>{v.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: ORDERS MANAGEMENT ─── */}
        {activeTab === "orders" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Platform Orders Manager</h2>
                <p className={`text-xs ${textSubtle}`}>Track and update status of all client transactions, order items, and shipping parameters.</p>
              </div>

              {/* Filters & search */}
              <div className="flex items-center gap-3">
                <select
                  value={orderStatusFilter}
                  onChange={e => setOrderStatusFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold uppercase focus:outline-none focus:ring-1 focus:ring-yellow-500/40 ${inputBg}`}
                >
                  <option value="all">All Statuses</option>
                  {Object.keys(statusColorMap).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Search by Order ID/Customer..."
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  className={`px-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500/40 w-48 sm:w-64 ${inputBg}`}
                />
              </div>
            </div>

            <div className={`border rounded-2xl shadow-xl overflow-hidden ${cardBg}`}>
              {(() => {
                const uniqueOrdersMap = {};
                platformOrders.forEach(item => {
                  if (item.orders && !uniqueOrdersMap[item.orders.id]) {
                    uniqueOrdersMap[item.orders.id] = {
                      ...item.orders,
                      items: []
                    };
                  }
                  if (item.orders) {
                    uniqueOrdersMap[item.orders.id].items.push(item);
                  }
                });
                
                const uniqueOrders = Object.values(uniqueOrdersMap)
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .filter(order => {
                    const customer = profilesList.find(p => p.id === order.user_id);
                    const customerName = customer ? `${customer.first_name} ${customer.last_name}`.toLowerCase() : "";
                    const matchesSearch = 
                      (order.order_id && order.order_id.toLowerCase().includes(orderSearch.toLowerCase())) ||
                      customerName.includes(orderSearch.toLowerCase()) ||
                      order.id?.toLowerCase().includes(orderSearch.toLowerCase());
                    const matchesStatus = orderStatusFilter === "all" || order.order_status === orderStatusFilter;
                    return matchesSearch && matchesStatus;
                  });

                if (uniqueOrders.length === 0) {
                  return (
                    <div className="text-center py-20">
                      <span className="text-4xl block mb-4">📦</span>
                      <h4 className="font-bold text-base mb-2">No Matching Orders</h4>
                      <p className={`text-xs max-w-xs mx-auto ${textSubtle}`}>Could not find any order records matching the current filters.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 tracking-wider uppercase font-semibold">
                          <th className="px-6 py-4">Order ID & Date</th>
                          <th className="px-6 py-4">Shopper / Customer</th>
                          <th className="px-6 py-4">Items count</th>
                          <th className="px-6 py-4">Payment Splitting</th>
                          <th className="px-6 py-4">Total Amount</th>
                          <th className="px-6 py-4">Fulfillment Status</th>
                          <th className="px-6 py-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {uniqueOrders.map(order => {
                          const customer = profilesList.find(p => p.id === order.user_id);
                          const isExpanded = expandedOrders[order.id];
                          const dateFormatted = order.created_at ? new Date(order.created_at).toLocaleDateString("en-IN", {
                            year: "numeric", month: "short", day: "numeric"
                          }) : "N/A";

                          const shippingInfo = (() => {
                            if (typeof order.shipping_address === 'object' && order.shipping_address !== null) {
                              return order.shipping_address;
                            }
                            try {
                              const parsed = JSON.parse(order.shipping_address);
                              if (typeof parsed === 'object' && parsed !== null) return parsed;
                            } catch (e) {}
                            return { addressLine: order.shipping_address };
                          })();
                          
                          return (
                            <optgroup key={order.id} label={order.order_id || order.id} className="not-italic">
                              <tr className="hover:bg-white/[0.005] transition-colors">
                                <td className="px-6 py-4">
                                  <p className={`font-mono font-bold text-sm ${textTitle}`}>{order.order_id || order.id.slice(0, 8)}</p>
                                  <span className={`text-[10px] ${textSubtle}`}>{dateFormatted}</span>
                                </td>
                                <td className="px-6 py-4">
                                  {customer ? (
                                    <div>
                                      <p className={`font-bold text-sm ${textTitle}`}>{customer.first_name} {customer.last_name}</p>
                                      <span className={`text-[10px] ${textSubtle}`}>{customer.phone || "No phone"}</span>
                                    </div>
                                  ) : (
                                    <span className={textSubtle}>Guest / Unknown</span>
                                  )}
                                </td>
                                <td className={`px-6 py-4 font-semibold ${textTitle}`}>
                                  {order.items?.length || 0} item(s)
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                                    order.payment_status === "paid"
                                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                                      : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                  }`}>
                                    {order.payment_status || "pending"}
                                  </span>
                                  <span className={`text-[10px] block mt-1 uppercase font-bold text-white/50`}>
                                    Mode: {order.payment_method || "COD"}
                                  </span>
                                </td>
                                <td className={`px-6 py-4 font-bold text-base ${textTitle}`}>
                                  {formatCurrency(order.total_amount)}
                                </td>
                                <td className="px-6 py-4">
                                  <select
                                    value={order.order_status}
                                    onChange={e => handleUpdateOrderStatus(order.id, e.target.value)}
                                    className={`px-2 py-1 rounded text-[10px] uppercase font-bold border focus:outline-none focus:ring-1 focus:ring-yellow-500 ${
                                      statusColorMap[order.order_status] || "text-white bg-black/45 border-white/10"
                                    }`}
                                  >
                                    {Object.keys(statusColorMap).map(status => (
                                      <option key={status} value={status} className="bg-[#111] text-white">
                                        {status}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <button
                                    onClick={() => setExpandedOrders(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                                    className="px-3 py-1.5 border border-white/10 hover:border-yellow-500 rounded-lg hover:bg-yellow-500/5 transition-all text-[10px] font-bold uppercase tracking-wider text-yellow-500"
                                  >
                                    {isExpanded ? "Hide Details" : "View Items"}
                                  </button>
                                </td>
                              </tr>
                              
                              {/* Expandable Order Detail Area */}
                              {isExpanded && (
                                <tr>
                                  <td colSpan="7" className="px-6 py-4 bg-black/40 border-t border-b border-white/5">
                                    <div className="space-y-4 animate-fade-in text-xs font-semibold">
                                      {/* Subheader */}
                                      <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-white/5 pb-3">
                                        <div>
                                          <h4 className="font-bold text-sm text-[#d4af37] uppercase tracking-wider">Consignment Product List</h4>
                                          <p className="text-[10px] text-white/40">Listing order items, price index guidelines, and merchant split rates.</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-white/70">Shipping Method: <strong className="text-white uppercase font-bold">{order.payment_method === 'cod' ? 'Cash On Delivery' : 'Prepaid Premium Shipping'}</strong></p>
                                          <p className="text-[10px] text-white/40">Coupon Applied: <strong className="text-white">{order.coupon_code || "None"}</strong></p>
                                        </div>
                                      </div>

                                      {/* Products list */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {order.items?.map((item, idx) => (
                                          <div key={idx} className="flex gap-4 p-3 bg-white/[0.01] border border-white/5 rounded-xl hover:border-white/10 transition-all">
                                            <img
                                              src={item.image || (item.products?.img)}
                                              alt={item.name}
                                              className="w-14 h-14 rounded-lg object-cover border border-white/10 flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                              <h5 className={`font-bold text-sm truncate ${textTitle}`}>{item.name}</h5>
                                              <p className="text-[10px] text-white/40 mt-0.5">
                                                Qty: <strong className="text-white font-bold">{item.quantity}</strong> | 
                                                Price: <strong className="text-white font-bold">{formatCurrency(item.price)}</strong>
                                              </p>
                                              <div className="flex items-center gap-2 mt-1 text-[9px] uppercase tracking-wider text-[#d4af37]">
                                                {item.size && <span>Size: {item.size}</span>}
                                                {item.size && item.color && <span>·</span>}
                                                {item.color && <span>Color: {item.color}</span>}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Shipping Address Box */}
                                      <div className="bg-white/[0.005] border border-white/5 p-4 rounded-xl space-y-1">
                                        <span className="text-[9px] uppercase tracking-widest text-[#d4af37] block font-bold">Shopper Destination Address</span>
                                        <p className={`text-sm ${textTitle}`}>{shippingInfo.name || `${customer?.first_name || ""} ${customer?.last_name || ""}` || "No name details provided"}</p>
                                        <p className="text-white/60">
                                          {shippingInfo.line1 || shippingInfo.addressLine || shippingInfo.address || ""}
                                          {shippingInfo.city && `, ${shippingInfo.city}`}
                                          {shippingInfo.state && `, ${shippingInfo.state}`}
                                          {shippingInfo.pincode || shippingInfo.zip ? ` - ${shippingInfo.pincode || shippingInfo.zip}` : ""}
                                        </p>
                                        {(shippingInfo.phone || customer?.phone) && (
                                          <p className="text-white/50 text-[10px] mt-1">Phone: {shippingInfo.phone || customer?.phone}</p>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </optgroup>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ─── TAB: PLATFORM COUPONS ─── */}
        {activeTab === "coupons" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Marketplace Coupons</h2>
                <p className={`text-xs ${textSubtle}`}>Generate marketing discount codes, adjust minimum order values, and activate/deactivate campaigns.</p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search coupon code..."
                  value={couponSearch}
                  onChange={e => setCouponSearch(e.target.value)}
                  className={`px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500/40 w-44 sm:w-56 ${inputBg}`}
                />
                
                <button
                  onClick={() => {
                    setEditingCoupon(null);
                    setCouponForm({
                      code: "",
                      type: "percent",
                      discount: "",
                      min_order: "",
                      max_discount: "",
                      is_active: true
                    });
                    setShowCouponForm(true);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-tr from-[#d4af37] to-[#f5d26e] text-[#0a0a0a] font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-yellow-500/10"
                >
                  + Create Coupon
                </button>
              </div>
            </div>

            {/* Creating/editing form overlay/inline */}
            {showCouponForm && (
              <div className={`p-6 border rounded-2xl shadow-xl space-y-4 ${cardBg}`}>
                <h3 className={`font-bold text-sm uppercase tracking-wider text-[#d4af37]`}>
                  {editingCoupon ? "Edit Coupon Parameters" : "Create New Marketing Coupon"}
                </h3>
                
                <form onSubmit={handleCouponSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className={`text-[10px] uppercase font-bold tracking-wider ${textSubtle}`}>Coupon Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SUMMER50"
                      value={couponForm.code}
                      onChange={e => setCouponForm({ ...couponForm, code: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500 ${inputBg}`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-[10px] uppercase font-bold tracking-wider ${textSubtle}`}>Discount Type</label>
                    <select
                      value={couponForm.type}
                      onChange={e => setCouponForm({ ...couponForm, type: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500 ${inputBg}`}
                    >
                      <option value="percent">Percentage Off (%)</option>
                      <option value="fixed">Fixed Cash Amount (₹)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-[10px] uppercase font-bold tracking-wider ${textSubtle}`}>
                      Discount Value {couponForm.type === "percent" ? "(%)" : "(₹)"}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder={couponForm.type === "percent" ? "15" : "150"}
                      value={couponForm.discount}
                      onChange={e => setCouponForm({ ...couponForm, discount: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500 ${inputBg}`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-[10px] uppercase font-bold tracking-wider ${textSubtle}`}>Minimum Order Value (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 999"
                      value={couponForm.min_order}
                      onChange={e => setCouponForm({ ...couponForm, min_order: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500 ${inputBg}`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-[10px] uppercase font-bold tracking-wider ${textSubtle}`}>
                      Max Discount Cap (₹) {couponForm.type !== "percent" && "(Optional)"}
                    </label>
                    <input
                      type="number"
                      disabled={couponForm.type !== "percent"}
                      placeholder={couponForm.type === "percent" ? "e.g. 500" : "N/A for fixed type"}
                      value={couponForm.max_discount}
                      onChange={e => setCouponForm({ ...couponForm, max_discount: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500 disabled:opacity-40 ${inputBg}`}
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="coupon-active"
                      checked={couponForm.is_active}
                      onChange={e => setCouponForm({ ...couponForm, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500 h-4 w-4"
                    />
                    <label htmlFor="coupon-active" className={`text-xs font-bold uppercase tracking-wider ${textTitle} cursor-pointer select-none`}>
                      Active Status
                    </label>
                  </div>

                  <div className="sm:col-span-3 flex justify-end gap-3 pt-4 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCouponForm(false);
                        setEditingCoupon(null);
                      }}
                      className="px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-tr from-[#d4af37] to-[#f5d26e] text-[#0a0a0a] font-bold text-xs uppercase tracking-widest rounded-xl transition-all"
                    >
                      {editingCoupon ? "Update Coupon" : "Save Coupon"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className={`border rounded-2xl shadow-xl overflow-hidden ${cardBg}`}>
              {(() => {
                const filteredCoupons = couponsList.filter(c => 
                  c.code?.toLowerCase().includes(couponSearch.toLowerCase())
                );

                if (filteredCoupons.length === 0) {
                  return (
                    <div className="text-center py-20">
                      <span className="text-4xl block mb-4">🎫</span>
                      <h4 className="font-bold text-base mb-2">No Coupons Listed</h4>
                      <p className={`text-xs max-w-xs mx-auto ${textSubtle}`}>No active or inactive marketplace discount codes recorded.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 tracking-wider uppercase font-semibold">
                          <th className="px-6 py-4">Coupon Code</th>
                          <th className="px-6 py-4">Discount Rate / Amount</th>
                          <th className="px-6 py-4">Minimum Order</th>
                          <th className="px-6 py-4">Maximum Discount Cap</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-center">Control actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredCoupons.map(coupon => (
                          <tr key={coupon.id} className="hover:bg-white/[0.005] transition-colors">
                            <td className="px-6 py-4 flex items-center gap-2">
                              <span className="text-lg">🎫</span>
                              <div>
                                <p className="font-mono font-black text-sm text-[#d4af37] tracking-wider uppercase">{coupon.code}</p>
                                <span className={`text-[9px] ${textSubtle}`}>Created: {new Date(coupon.created_at || Date.now()).toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td className={`px-6 py-4 font-bold text-sm ${textTitle}`}>
                              {coupon.type === "percent" ? `${coupon.discount}% Off` : `₹${coupon.discount} Flat`}
                            </td>
                            <td className={`px-6 py-4 font-mono font-semibold ${textTitle}`}>
                              {coupon.min_order > 0 ? `₹${coupon.min_order.toLocaleString()}` : "No Minimum"}
                            </td>
                            <td className={`px-6 py-4 font-mono font-semibold ${textTitle}`}>
                              {coupon.type === "percent" && coupon.max_discount ? `₹${coupon.max_discount.toLocaleString()}` : "N/A"}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                                coupon.is_active
                                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                                  : "bg-red-500/10 text-red-400 border-red-500/20"
                              }`}>
                                {coupon.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-3">
                                <button
                                  onClick={() => handleEditCoupon(coupon)}
                                  className="p-1.5 border border-white/10 hover:border-yellow-500 rounded-lg hover:bg-yellow-500/5 transition-all text-xs"
                                  title="Edit Coupon parameters"
                                >
                                  ✏️ Edit
                                </button>
                                
                                <button
                                  onClick={() => handleDeleteCoupon(coupon.id)}
                                  className="p-1.5 border border-red-500/10 hover:border-red-500 rounded-lg hover:bg-red-500/5 transition-all text-xs text-red-400"
                                  title="Delete Campaign coupon"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      </main>

      {/* ─── MOCK MANUAL KYC DOCUMENT PREVIEW CHECKER MODAL ─── */}
      {selectedKycDocument && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 slide-up">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <span className="font-bold text-xs uppercase tracking-wider gold flex items-center gap-1.5">
                📁 manual KYC document preview checker
              </span>
              <button onClick={() => setSelectedKycDocument(null)} className="text-white/40 hover:text-white"><XCircle size={16} /></button>
            </div>

            <div className="space-y-4">
              <div className="p-8 bg-white/[0.01] border border-white/5 rounded-xl text-center space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-xl" />
                <span className="text-4xl block">📄</span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#d4af37] block">{selectedKycDocument.label}</span>
                <h3 className="font-mono font-bold text-lg tracking-wider text-white uppercase">{selectedKycDocument.code}</h3>
                <p className="text-[9px] text-white/35">Onboarding Application filed under merchant: <br /><strong>"{selectedKycDocument.storeName}"</strong></p>
              </div>

              <div className="bg-black/45 border border-white/5 p-3 rounded-xl text-[10px] text-white/45">
                Manual document reviews match central government tax registers. Verify character coordinates and names before final merchant onboarding approval.
              </div>

              <button onClick={() => setSelectedKycDocument(null)} className="btn-gold w-full py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-widest">
                Close Document Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SPOTLIGHT COMMAND PALETTE OVERLAY ─── */}
      {showCommandPalette && (
        <div 
          onClick={() => setShowCommandPalette(false)}
          className="fixed inset-0 bg-black/75 z-[100] flex items-start justify-center pt-28 px-4 backdrop-blur-sm"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up"
          >
            <div className="relative border-b border-white/10 p-4">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={commandSearch}
                onChange={e => setCommandSearch(e.target.value)}
                placeholder="Jump to administrative modules... (Esc to close)"
                className="w-full bg-transparent pl-8 pr-4 text-sm text-white focus:outline-none placeholder-white/20"
                autoFocus
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto p-2">
              {commandFilteredItems.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-4">No matching administrative modules found.</p>
              ) : (
                commandFilteredItems.map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={cmd.action}
                    className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-white/5 text-xs text-white/60 hover:text-[#d4af37] font-semibold transition-all flex items-center justify-between"
                  >
                    <span>{cmd.label}</span>
                    <ChevronRight size={14} className="opacity-40" />
                  </button>
                ))
              )}
            </div>
            
            <div className="bg-black/35 p-3 border-t border-white/5 flex justify-between text-[9px] text-white/20 uppercase tracking-widest font-bold">
              <span>Admin Spotlight Launcher</span>
              <span>Use arrows & Enter</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
