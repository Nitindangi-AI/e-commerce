import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { insforge } from "../../lib/insforge";
import { logisticsAPI } from "../../services/api";
import Loader from "../../components/Loader";
import toast from "react-hot-toast";
import { formatTrackingNumber } from "../../utils/formatTracking";
import {
  BarChart3,
  TrendingUp,
  Package,
  PlusCircle,
  ShoppingBag,
  RotateCcw,
  Boxes,
  Percent,
  Star,
  Settings,
  CircleDollarSign,
  Bell,
  HelpCircle,
  LogOut,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  Sun,
  Moon,
  Truck,
  FileText,
  X
} from "lucide-react";

export default function VendorDashboard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

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

  // Navigation and UI state
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Command Palette State (Ctrl+K Launcher)
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");

  // Data State
  const [vendorData, setVendorData] = useState(null);
  const [products, setProducts] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [vendorOrders, setVendorOrders] = useState([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    commissionDeducted: 0,
    netEarnings: 0,
    totalOrders: 0,
    lowStockCount: 0,
    pendingOrdersCount: 0,
    cancelledOrdersCount: 0,
    conversionRate: 2.4,
    trafficVisits: 1450
  });

  // Bulk Upload & Product Form State
  const [uploadMode, setUploadMode] = useState("manual");
  const [parsedProducts, setParsedProducts] = useState([]);
  const [bulkFileError, setBulkFileError] = useState("");
  const [bulkImageFiles, setBulkImageFiles] = useState([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    originalPrice: "",
    category: "Watches",
    brand: "",
    material: "",
    badge: "",
    img: "",
    images: [],
    description: "",
    stock: "",
    colors: "",
    sizes: "",
    sku: "",
    metaTitle: "",
    metaDescription: "",
    deliveryDays: 3,
    returnable: true,
    returnDays: 5,
    specsList: [{ key: "", value: "" }],
  });
  const [formError, setFormError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Reapply Form State
  const [reapplyForm, setReapplyForm] = useState({
    store_name: "",
    pan_card: "",
    gst_number: "",
    bank_account: "",
    aadhar_number: "",
  });
  const [reapplyLogoFile, setReapplyLogoFile] = useState(null);
  const [reapplyLoading, setReapplyLoading] = useState(false);

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
    store_name: "",
    store_logo: "",
    store_banner: "",
    store_description: "",
    pan_card: "",
    gst_number: "",
    bank_account: "",
    aadhar_number: "",
  });
  const [settingsSuccess, setSettingsSuccess] = useState("");

  // Courier/Shipping State
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [courierSelection, setCourierSelection] = useState("Bluedart");
  const [trackingNumberInput, setTrackingNumberInput] = useState("");

  // Complete Logistics Network State
  const [activeShipments, setActiveShipments] = useState([]);
  const [contractorsList, setContractorsList] = useState([]);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [deliveryMode, setDeliveryMode] = useState("hybrid");
  const [selectedContractorId, setSelectedContractorId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [loadingLogistics, setLoadingLogistics] = useState(false);
  const [selectedActiveShipment, setSelectedActiveShipment] = useState(null);
  
  const [simTransitStatus, setSimTransitStatus] = useState("");
  const [simTransitLocation, setSimTransitLocation] = useState("");
  const [deliveryOtpInput, setDeliveryOtpInput] = useState("");

  const [shipmentSearch, setShipmentSearch] = useState("");
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState("all");
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);
  const [newEventStatus, setNewEventStatus] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventNote, setNewEventNote] = useState("");
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Payout Transaction State
  const [withdrawalAmount, setWithdrawalAmount] = useState("");

  // Help tickets
  const [helpSubject, setHelpSubject] = useState("");
  const [helpMessage, setHelpMessage] = useState("");

  // Custom lists
  const categories = ["Watches", "Shirts", "Footwear", "Grooming", "Accessories", "Apparel"];

  // Activity Log feed
  const [activityLogs, setActivityLogs] = useState([
    { text: "Catalog item updated: Classic Leather Strap Watch", time: "10 mins ago" },
    { text: "Order Confirmed: ID LX-28491", time: "1 hour ago" },
    { text: "Store settings updated: Banner modified", time: "3 hours ago" },
    { text: "Product uploaded: Obsidian Sunglasses Elite", time: "1 day ago" }
  ]);

  // Handle Command Palette shortcut listeners
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
    loadDashboardData();
  }, [user]);

  // Initialize reapply form once vendorData is loaded and rejected
  useEffect(() => {
    if (vendorData && vendorData.status === "rejected") {
      setReapplyForm({
        store_name: vendorData.store_name || "",
        pan_card: vendorData.pan_card || "",
        gst_number: vendorData.gst_number || "",
        bank_account: vendorData.bank_account || "",
        aadhar_number: vendorData.aadhar_number || "",
      });
    }
  }, [vendorData]);

  const handleReapplySubmit = async (e) => {
    e.preventDefault();
    setReapplyLoading(true);
    try {
      let storeLogoUrl = vendorData.store_logo || "";

      if (reapplyLogoFile) {
        const fileExt = reapplyLogoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `vendors/${fileName}`;
        const { data, error } = await insforge.storage
          .from("images")
          .upload(filePath, reapplyLogoFile);
        if (error) throw error;
        storeLogoUrl = data?.url || "";
      }

      const { error } = await insforge.database
        .from("vendors")
        .update({
          store_name: reapplyForm.store_name,
          store_logo: storeLogoUrl,
          pan_card: reapplyForm.pan_card,
          gst_number: reapplyForm.gst_number,
          bank_account: reapplyForm.bank_account,
          aadhar_number: reapplyForm.aadhar_number,
          status: "pending", // Set back to pending
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Reapplication submitted successfully!");
      loadDashboardData();
    } catch (err) {
      console.error("Reapply error:", err);
      toast.error(err.message || "Failed to submit reapplication");
    } finally {
      setReapplyLoading(false);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch vendor profile
      const { data: vendor, error: vErr } = await insforge.database
        .from("vendors")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (vErr) throw vErr;
      if (!vendor) {
        navigate("/");
        return;
      }

      setVendorData(vendor);
      setSettingsForm({
        store_name: vendor.store_name || "",
        store_logo: vendor.store_logo || "",
        store_banner: vendor.store_banner || "",
        store_description: vendor.store_description || "Premium boutique styling and curated trends.",
        pan_card: vendor.pan_card || "",
        gst_number: vendor.gst_number || "",
        bank_account: vendor.bank_account || "",
        aadhar_number: vendor.aadhar_number || "",
      });

      if (vendor.status !== "approved") {
        setLoading(false);
        return;
      }

      // 2. Fetch products owned by this seller
      const { data: vendorProducts, error: pErr } = await insforge.database
        .from("products")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (pErr) throw pErr;
      setProducts(vendorProducts || []);

      // 3. Fetch orders containing vendor's products
      const { data: vendorOrdersData, error: oErr } = await insforge.database
        .from("orders")
        .select("*, order_items(*, products(*))")
        .order("created_at", { ascending: false });

      if (oErr) throw oErr;

      setVendorOrders(vendorOrdersData || []);

      // Flatten items to keep compatibility with existing features (returns, shipments, getOrderEarnings, etc.)
      const flatItems = [];
      const uniqueOrderIds = new Set();
      let pendingOrders = 0;
      let cancelledOrders = 0;
      let salesCount = 0;

      (vendorOrdersData || []).forEach(order => {
        const status = order.order_status;
        if (status === "Processing" || status === "Confirmed") {
          pendingOrders++;
        }
        if (status === "Cancelled") {
          cancelledOrders++;
        }
        uniqueOrderIds.add(order.id);

        (order.order_items || []).forEach(item => {
          flatItems.push({
            ...item,
            orders: order
          });
          
          if (status && status !== "Cancelled" && status !== "Returned") {
            salesCount += item.quantity;
          }
        });
      });
      setOrderItems(flatItems);

      let lowStock = 0;
      (vendorProducts || []).forEach(p => {
        if ((p.stock || 0) < 5) {
          lowStock++;
        }
      });

      // Calculate Top Product
      const productSales = {};
      flatItems.forEach(item => {
        const prodId = item.product_id;
        const qty = item.quantity;
        productSales[prodId] = (productSales[prodId] || 0) + qty;
      });

      let topProdId = null;
      let maxSales = 0;
      Object.keys(productSales).forEach(prodId => {
        if (productSales[prodId] > maxSales) {
          maxSales = productSales[prodId];
          topProdId = prodId;
        }
      });
      const topProduct = vendorProducts.find(p => p.id === topProdId)?.name || "N/A";

      // Fetch aggregated database earnings via RPC
      const { data: earningsData, error: eErr } = await insforge.database.rpc('get_vendor_earnings', { p_user_id: user.id });
      if (eErr) {
        console.error("RPC get_vendor_earnings error:", eErr.message);
      }

      const dbGross = earningsData?.grossRevenue || 0;
      const dbComm = earningsData?.commission || 0;
      const dbNet = earningsData?.netRevenue || 0;

      // 5. Fetch Active Shipments associated with vendor's orders
      const vendorOrderIds = Array.from(new Set(flatItems.map(item => item.order_id)));
      let shipmentsData = [];
      if (vendorOrderIds.length > 0) {
        const { data: ships } = await insforge.database
          .from("shipments")
          .select("*, contractors(*), vehicles(*)")
          .in("order_id", vendorOrderIds)
          .order("created_at", { ascending: false });
        shipmentsData = ships || [];
      }
      setActiveShipments(shipmentsData);

      // 6. Fetch contractors & vehicles list
      const { data: contrs } = await insforge.database.from("contractors").select("*");
      const { data: vehs } = await insforge.database.from("vehicles").select("*");
      setContractorsList(contrs || []);
      setVehiclesList(vehs || []);

      setStats({
        totalSales: salesCount,
        totalRevenue: dbGross,
        commissionDeducted: dbComm,
        netEarnings: dbNet,
        totalOrders: uniqueOrderIds.size,
        lowStockCount: lowStock,
        pendingOrdersCount: pendingOrders,
        cancelledOrdersCount: cancelledOrders,
        conversionRate: 2.8,
        trafficVisits: 1890,
        topProduct: topProduct,
        productsSold: salesCount
      });

    } catch (err) {
      console.error("Failed to load vendor dashboard:", err);
      toast.error("Error loading dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  // Product actions
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const { name, price, stock } = productForm;
    if (!name || !price || stock === "") {
      setFormError("Product Name, Price, and Stock are required");
      return;
    }

    if (editingProduct && editingProduct.seller_id !== user.id) {
      toast.error("Unauthorized: You do not own this product listing.");
      return;
    }

    try {
      const colorsArr = productForm.colors ? productForm.colors.split(",").map(c => c.trim()).filter(Boolean) : [];
      const sizesArr = productForm.sizes ? productForm.sizes.split(",").map(s => s.trim()).filter(Boolean) : [];

      const specsObj = {};
      (productForm.specsList || []).forEach(item => {
        if (item.key.trim()) {
          specsObj[item.key.trim()] = item.value.trim();
        }
      });
      specsObj.sku = productForm.sku || `SKU-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
      specsObj.meta_title = productForm.metaTitle || productForm.name;
      specsObj.meta_desc = productForm.metaDescription || productForm.description;

      const payload = {
        name: productForm.name,
        price: parseFloat(productForm.price),
        original_price: productForm.originalPrice ? parseFloat(productForm.originalPrice) : parseFloat(productForm.price),
        category: productForm.category,
        brand: productForm.brand || "Trendz",
        material: productForm.material || "",
        badge: productForm.badge || "",
        img: productForm.img || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500",
        images: productForm.images || [],
        description: productForm.description || "",
        stock: parseInt(productForm.stock),
        colors: colorsArr,
        sizes: sizesArr,
        delivery_days: parseInt(productForm.deliveryDays) || 3,
        seller_id: user.id,
        return_policy: {
          returnable: productForm.returnable,
          returnDays: parseInt(productForm.returnDays) || 5,
        },
        specs: specsObj
      };

      if (editingProduct) {
        const { error } = await insforge.database
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast.success("Listing updated successfully!");
      } else {
        const { error } = await insforge.database
          .from("products")
          .insert([payload]);

        if (error) throw error;
        toast.success("New product published!");
      }

      setShowProductForm(false);
      setEditingProduct(null);
      resetProductForm();
      loadDashboardData();
    } catch (err) {
      setFormError(err.message || "Failed to save product");
    }
  };

  const handleBulkFileChange = (e) => {
    setBulkFileError("");
    setParsedProducts([]);
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length <= 1) {
          throw new Error("The file must contain a header row and at least one product row.");
        }

        // Strip UTF-8 BOM if present
        const firstLineClean = lines[0].replace(/^\uFEFF/, "");

        // Dynamically detect separator
        let separator = ",";
        const commas = (firstLineClean.match(/,/g) || []).length;
        const semicolons = (firstLineClean.match(/;/g) || []).length;
        const tabs = (firstLineClean.match(/\t/g) || []).length;
        if (semicolons > commas && semicolons > tabs) {
          separator = ";";
        } else if (tabs > commas && tabs > semicolons) {
          separator = "\t";
        }

        // Split headers using the detected separator
        const rawHeaders = firstLineClean.split(separator).map(h => h.trim().replace(/^["']|["']$/g, ""));
        
        // Normalize headers to map external formats to what the app expects
        const normalizeHeader = (h) => {
          const clean = h.trim().toLowerCase().replace(/^["']|["']$/g, "");
          if (clean === "original_price" || clean === "originalprice") return "originalPrice";
          if (clean === "delivery_days" || clean === "deliverydays") return "deliveryDays";
          if (clean === "images" || clean === "image" || clean === "image_url" || clean === "img_url" || clean === "img") return "img";
          return clean;
        };

        const headers = rawHeaders.map(normalizeHeader);
        
        // expected headers validation
        const requiredHeaders = ["name", "price", "stock", "description"];
        const missing = requiredHeaders.filter(h => !headers.includes(h));
        if (missing.length > 0) {
          throw new Error(`Missing required CSV headers: ${missing.join(", ")}`);
        }

        const items = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const values = [];
          let insideQuote = false;
          let currentVal = "";
          for (let charIdx = 0; charIdx < line.length; charIdx++) {
            const char = line[charIdx];
            if (char === '"') {
              insideQuote = !insideQuote;
            } else if (char === separator && !insideQuote) {
              values.push(currentVal.trim().replace(/^["']|["']$/g, ""));
              currentVal = "";
            } else {
              currentVal += char;
            }
          }
          values.push(currentVal.trim().replace(/^["']|["']$/g, ""));

          if (values.length < headers.length) continue;

          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = values[index] !== undefined ? values[index] : "";
          });

          // Smart specs parsing if present (extract colors, sizes, sku from JSON specs column)
          if (obj.specs) {
            try {
              const specObj = JSON.parse(obj.specs);
              if (specObj.colors) {
                obj.colors = Array.isArray(specObj.colors) ? specObj.colors.join("; ") : specObj.colors;
              }
              if (specObj.sizes) {
                obj.sizes = Array.isArray(specObj.sizes) ? specObj.sizes.join("; ") : specObj.sizes;
              }
              if (specObj.sku) {
                obj.sku = specObj.sku;
              }
            } catch (e) {
              // Ignore invalid JSON format
            }
          }

          // Smart image array / list parsing
          if (obj.img) {
            let imgStr = obj.img.trim();
            if (imgStr.startsWith("[") && imgStr.endsWith("]")) {
              try {
                const arr = JSON.parse(imgStr);
                if (Array.isArray(arr) && arr.length > 0) {
                  imgStr = arr[0];
                }
              } catch (e) {}
            } else if (imgStr.includes(",")) {
              imgStr = imgStr.split(",")[0].trim();
            }
            obj.img = imgStr;
          }

          items.push(obj);
        }

        if (items.length === 0) {
          throw new Error("No products parsed from CSV. Please check formatting.");
        }

        setParsedProducts(items);
        toast.success(`Successfully parsed ${items.length} products from CSV file!`);
      } catch (err) {
        setBulkFileError(err.message);
        toast.error(`CSV Parsing Error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleBulkPublish = async () => {
    if (parsedProducts.length === 0) return;
    setLoading(true);
    try {
      const filenameMap = {};

      if (bulkImageFiles.length > 0) {
        const uploadToastId = toast.loading(`Uploading ${bulkImageFiles.length} product images to Storage...`);
        for (const file of bulkImageFiles) {
          try {
            const fileExt = file.name.split(".").pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `products/${fileName}`;

            const { data, error } = await insforge.storage
              .from("images")
              .upload(filePath, file);

            if (error) throw error;
            if (data?.url) {
              // Map both by the full filename and by its lowercase trimmed base name
              filenameMap[file.name] = data.url;
              filenameMap[file.name.toLowerCase().trim()] = data.url;
              
              const baseName = file.name.split("/").pop();
              filenameMap[baseName] = data.url;
              filenameMap[baseName.toLowerCase().trim()] = data.url;
            }
          } catch (e) {
            console.error(`Failed to upload file ${file.name}:`, e);
          }
        }
        toast.dismiss(uploadToastId);
        toast.success(`Images uploaded and mapped successfully!`);
      }

      const payloads = parsedProducts.map(p => {
        const colorsArr = p.colors ? p.colors.split(";").map(c => c.trim()).filter(Boolean) : [];
        const sizesArr = p.sizes ? p.sizes.split(";").map(s => s.trim()).filter(Boolean) : [];
        const priceNum = parseFloat(p.price) || 0;

        // Smart image mapping: match filenames from CSV with actual uploaded local files
        let finalImg = p.img || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500";
        if (p.img) {
          const cleanImg = p.img.trim();
          const cleanImgLower = cleanImg.toLowerCase();
          const baseName = cleanImg.split("/").pop().trim();
          const baseNameLower = baseName.toLowerCase();

          if (filenameMap[cleanImg]) {
            finalImg = filenameMap[cleanImg];
          } else if (filenameMap[cleanImgLower]) {
            finalImg = filenameMap[cleanImgLower];
          } else if (filenameMap[baseName]) {
            finalImg = filenameMap[baseName];
          } else if (filenameMap[baseNameLower]) {
            finalImg = filenameMap[baseNameLower];
          }
        }

        return {
          name: p.name,
          price: priceNum,
          original_price: p.originalPrice ? parseFloat(p.originalPrice) : priceNum,
          category: p.category || "Watches",
          brand: p.brand || "Trendz",
          material: p.material || "",
          badge: p.badge || "",
          img: finalImg,
          description: p.description || "",
          stock: parseInt(p.stock) || 0,
          colors: colorsArr,
          sizes: sizesArr,
          delivery_days: parseInt(p.deliveryDays) || 3,
          seller_id: user.id,
          specs: {
            sku: p.sku || `SKU-${Math.random().toString(36).substring(2,8).toUpperCase()}`,
            meta_title: p.name,
            meta_desc: p.description || "",
          }
        };
      });

      const { error } = await insforge.database
        .from("products")
        .insert(payloads);

      if (error) throw error;
      toast.success(`Successfully published all ${payloads.length} products in bulk!`);
      setParsedProducts([]);
      setBulkImageFiles([]);
      setUploadMode("manual");
      setActiveTab("products");
      loadDashboardData();
    } catch (err) {
      toast.error(err.message || "Failed to publish products");
    } finally {
      setLoading(false);
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: "", price: "", originalPrice: "", category: "Watches", brand: "", material: "", badge: "",
      img: "", images: [], description: "", stock: "", colors: "", sizes: "", sku: "", metaTitle: "", metaDescription: "", deliveryDays: 3,
      returnable: true, returnDays: 5, specsList: [{ key: "", value: "" }],
    });
  };

  const handleEditProduct = (p) => {
    setEditingProduct(p);
    
    // Parse specs JSON to list, excluding SKU, meta_title, meta_desc
    const rawSpecs = p.specs || {};
    const list = Object.keys(rawSpecs)
      .filter(k => k !== "sku" && k !== "meta_title" && k !== "meta_desc")
      .map(k => ({ key: k, value: String(rawSpecs[k]) }));

    setProductForm({
      name: p.name || "",
      price: p.price || "",
      originalPrice: p.original_price || "",
      category: p.category || "Watches",
      brand: p.brand || "",
      material: p.material || "",
      badge: p.badge || "",
      img: p.img || "",
      images: p.images || [],
      description: p.description || "",
      stock: p.stock || 0,
      colors: (p.colors || []).join(", "),
      sizes: (p.sizes || []).join(", "),
      sku: p.specs?.sku || "",
      metaTitle: p.specs?.meta_title || "",
      metaDescription: p.specs?.meta_desc || "",
      deliveryDays: p.delivery_days || 3,
      returnable: p.return_policy?.returnable ?? true,
      returnDays: p.return_policy?.returnDays ?? 5,
      specsList: list.length > 0 ? list : [{ key: "", value: "" }],
    });
    setActiveTab("add-product");
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const product = products.find(p => p.id === id);
      if (!product) {
        toast.error("Product not found");
        return;
      }
      if (product.seller_id !== user.id) {
        toast.error("Unauthorized: You do not own this product listing.");
        return;
      }

      const { error } = await insforge.database
        .from("products")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Product deleted");
      loadDashboardData();
    } catch (err) {
      toast.error("Failed to delete listing");
    }
  };

  const handleMultipleImagesUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploadingImage(true);
    const uploadedUrls = [...(productForm.images || [])];
    
    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { data, error } = await insforge.storage
          .from('images')
          .upload(filePath, file);

        if (error) throw error;
        if (data?.url) {
          uploadedUrls.push(data.url);
        }
      }
      setProductForm(f => ({ ...f, images: uploadedUrls }));
      toast.success("Product images uploaded successfully!");
    } catch (err) {
      toast.error("Some uploads failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeUploadedImage = (indexToRemove) => {
    setProductForm(f => ({
      ...f,
      images: (f.images || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Order status actions
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const updates = {
        order_status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === "Delivered") {
        const { data: orderData } = await insforge.database.from('orders').select('payment_details').eq('id', orderId).single();
        const storedOtp = orderData?.payment_details?.otp_code;
        
        if (storedOtp) {
          const userOtp = window.prompt("Please enter the customer's secure delivery OTP to mark this order as Delivered:");
          if (!userOtp) {
            toast.error("OTP verification is required.");
            return;
          }
          const cleanInput = userOtp.trim().toUpperCase();
          const cleanStored = storedOtp.trim().toUpperCase();
          if (cleanInput !== cleanStored && cleanInput !== cleanStored.replace("OTP-", "")) {
            toast.error("Invalid verification OTP. Delivery rejected.");
            return;
          }
          toast.success("OTP verified securely!");
        }
        
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
        note: `Order status processed by Merchant to: ${newStatus}`,
      }]);

      toast.success(`Order status updated to: ${newStatus}`);
      await loadDashboardData();
    } catch (err) {
      console.error("Failed to update order status:", err);
      toast.error(err.message || "Failed to update order status");
    }
  };

  const handleOpenShipmentModal = async (item) => {
    setSelectedShipment(item);
    setLoadingLogistics(true);
    try {
      setDeliveryMode('hybrid');
      if (contractorsList.length > 0) {
        const delh = contractorsList.find(c => c.contractor_id === 'CON-DELHIV') || contractorsList[0];
        setSelectedContractorId(delh.id);
        const matchVeh = vehiclesList.find(v => v.contractor_id === delh.id) || vehiclesList.find(v => v.type === 'Bike') || vehiclesList[0];
        if (matchVeh) setSelectedVehicleId(matchVeh.id);
      }
    } catch (err) {
      toast.error('Failed to load logistics contractors');
    } finally {
      setLoadingLogistics(false);
    }
  };

  const handleDispatchShipment = async (e) => {
    e.preventDefault();
    if (!selectedShipment) return;
    if (!selectedContractorId || !selectedVehicleId) {
      toast.error("Please allocate a logistics contractor and driver/vehicle.");
      return;
    }

    setLoadingLogistics(true);
    try {
      const order = selectedShipment.orders;
      const origin = {
        name: `${vendorData?.store_name} Warehouse`,
        phone: vendorData?.aadhar_number ? `+91 ${vendorData.aadhar_number.slice(0, 10)}` : "+91 98765 00001",
        line1: "Plot 24, Multi-Vendor Industrial Logistics Estate",
        city: "Bhopal",
        state: "Madhya Pradesh",
        pincode: "462021",
        country: "India"
      };
      
      const destination = {
        name: order.shipping_address?.name || "Customer",
        phone: order.shipping_address?.phone || "+91 98765 00003",
        line1: order.shipping_address?.line1 || "Street Address",
        city: order.shipping_address?.city || "Vidisha",
        state: order.shipping_address?.state || "Madhya Pradesh",
        pincode: order.shipping_address?.pincode || "464001",
        country: order.shipping_address?.country || "India",
        area: order.shipping_address?.area || "Bantinagar",
        landmark: order.shipping_address?.landmark || ""
      };

      const res = await logisticsAPI.createShipment({
        orderId: order.id,
        deliveryMode,
        contractorId: selectedContractorId,
        vehicleId: selectedVehicleId,
        origin,
        destination
      });

      toast.success(`Shipment successfully generated! AWB Tracking: ${formatTrackingNumber(res.trackingId)}`);
      setSelectedShipment(null);
      await loadDashboardData();
    } catch (err) {
      console.error("Logistics dispatch error:", err);
      toast.error(err.message || "Failed to dispatch shipment via logistics engine");
    } finally {
      setLoadingLogistics(false);
    }
  };

  const handleSimulateTransit = async (shipmentId, status, location) => {
    setLoadingLogistics(true);
    try {
      const res = await logisticsAPI.updateShipmentStatus({
        shipmentId,
        status,
        location,
        note: `Shipment advanced through multi-stage network to: ${status} in ${location}.`
      });
      toast.success(`Transit updated successfully to: ${status}`);
      if (res.smsSent) {
        toast.success(`Secure OTP sent to customer via SMS at ${res.customerPhone}`);
      }
      await loadDashboardData();
      
      // Reload expanded view
      const updatedShip = activeShipments.find(s => s.id === shipmentId);
      if (updatedShip) {
        const fullShip = await logisticsAPI.getShipmentByOrderId(updatedShip.order_id);
        setSelectedActiveShipment(fullShip.shipment);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingLogistics(false);
    }
  };

  const handleVerifyOtpDelivery = async (shipmentId) => {
    if (!deliveryOtpInput.trim()) {
      toast.error("Please enter the customer's delivery OTP.");
      return;
    }
    setLoadingLogistics(true);
    try {
      await logisticsAPI.verifyOTPAndDeliver({
        shipmentId,
        otp: deliveryOtpInput
      });
      toast.success("Delivery completed! Proof of delivery verified via OTP.");
      setDeliveryOtpInput("");
      await loadDashboardData();
      setSelectedActiveShipment(null);
    } catch (err) {
      toast.error(err.message || "OTP verification failed. Delivery rejected.");
    } finally {
      setLoadingLogistics(false);
    }
  };

  const getOrderEarnings = (orderId) => {
    const items = orderItems.filter(item => item.order_id === orderId);
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const commRate = parseFloat(vendorData?.commission_rate || 10.00);
    const commDeducted = (total * commRate) / 100;
    return total - commDeducted;
  };

  const handleAppendShipmentEvent = async (e) => {
    e.preventDefault();
    if (!editingShipment) return;
    if (!newEventNote.trim()) {
      toast.error("Please enter an event description note.");
      return;
    }
    setLoadingEvents(true);
    try {
      await logisticsAPI.addShipmentEvent({
        shipmentId: editingShipment.id,
        status: newEventStatus || editingShipment.status || "Updated",
        location: newEventLocation || editingShipment.current_location || "In Transit",
        note: newEventNote
      });
      toast.success("Shipment event update logged successfully!");
      setShowEventModal(false);
      setEditingShipment(null);
      setNewEventNote("");
      setNewEventLocation("");
      setNewEventStatus("");
      await loadDashboardData();
    } catch (err) {
      toast.error(err.message || "Failed to add shipment event");
    } finally {
      setLoadingEvents(false);
    }
  };

  // Store Settings Submit
  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setSettingsSuccess("");
    try {
      const { error } = await insforge.database
        .from("vendors")
        .update({
          store_name: settingsForm.store_name,
          store_logo: settingsForm.store_logo,
          store_banner: settingsForm.store_banner,
          store_description: settingsForm.store_description,
          pan_card: settingsForm.pan_card,
          gst_number: settingsForm.gst_number,
          bank_account: settingsForm.bank_account,
          aadhar_number: settingsForm.aadhar_number,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
      setSettingsSuccess("Store branding configurations updated!");
      toast.success("Settings saved");
      loadDashboardData();
    } catch (err) {
      toast.error("Failed to save configs");
    }
  };

  // Simulated image upload using InsForge storage
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { data, error } = await insforge.storage
        .from('images')
        .upload(filePath, file);

      if (error) throw error;
      setProductForm(f => ({ ...f, img: data.url }));
      toast.success("Product image uploaded to Storage bucket!");
    } catch (err) {
      toast.error("Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  // Settlement payout trigger
  const handleWithdrawalRequest = (e) => {
    e.preventDefault();
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      toast.error("Please enter a valid payout settlement amount");
      return;
    }
    toast.success(`Settlement processing! ₹${parseFloat(withdrawalAmount).toLocaleString("en-IN")} dispatched to Bank Payout account.`);
    setWithdrawalAmount("");
  };

  // Help desk support
  const handleHelpDeskSubmit = (e) => {
    e.preventDefault();
    if (!helpSubject || !helpMessage) return;
    toast.success("Support ticket created! Admin team will review shortly.");
    setHelpSubject("");
    setHelpMessage("");
  };

  // Filter items in command palette
  const commandFilteredItems = [
    { label: "Dashboard Overview", action: () => { setActiveTab("overview"); setShowCommandPalette(false); } },
    { label: "Products Catalog", action: () => { setActiveTab("products"); setShowCommandPalette(false); } },
    { label: "Add Product Catalog", action: () => { setActiveTab("add-product"); setShowCommandPalette(false); } },
    { label: "Fulfill Orders List", action: () => { setActiveTab("orders"); setShowCommandPalette(false); } },
    { label: "Manage Store Settings", action: () => { setActiveTab("settings"); setShowCommandPalette(false); } },
    { label: "Payout Ledger Splits", action: () => { setActiveTab("payouts"); setShowCommandPalette(false); } },
    { label: "Help Desk Widget", action: () => { setActiveTab("help-center"); setShowCommandPalette(false); } },
    { label: "Toggle Dark / Light Style", action: () => { setIsDarkMode(!isDarkMode); setShowCommandPalette(false); } }
  ].filter(c => c.label.toLowerCase().includes(commandSearch.toLowerCase()));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center pt-24">
        <Loader />
      </div>
    );
  }

  // Handle case where seller application is rejected
  if (vendorData && vendorData.status === "rejected") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center py-24 px-6 text-white font-sans">
        <div className="max-w-xl w-full bg-[#111] border border-red-500/20 rounded-3xl p-8 shadow-luxury text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20 text-red-500 text-3xl">
            ❌
          </div>
          <div className="space-y-2">
            <h2 className="display text-2xl font-bold text-white uppercase tracking-wider">Application Rejected</h2>
            <p className="text-white/60 text-sm leading-relaxed max-w-md mx-auto">
              We regret to inform you that your vendor account application has been rejected. 
              Please review your credentials below, update any incorrect details, and reapply for verification.
            </p>
          </div>

          <form onSubmit={handleReapplySubmit} className="text-left space-y-4 max-w-md mx-auto bg-white/[0.02] p-6 rounded-2xl border border-white/5">
            <div>
              <label className="block text-[10px] tracking-widest uppercase text-white/50 mb-1.5 font-bold">Store Name</label>
              <input
                type="text"
                value={reapplyForm.store_name}
                onChange={e => setReapplyForm({ ...reapplyForm, store_name: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-white/50 mb-1.5 font-bold">PAN Card Number</label>
                <input
                  type="text"
                  value={reapplyForm.pan_card}
                  onChange={e => setReapplyForm({ ...reapplyForm, pan_card: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-white/50 mb-1.5 font-bold">GST Number</label>
                <input
                  type="text"
                  value={reapplyForm.gst_number}
                  onChange={e => setReapplyForm({ ...reapplyForm, gst_number: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-white/50 mb-1.5 font-bold">Aadhaar Number</label>
                <input
                  type="text"
                  value={reapplyForm.aadhar_number}
                  onChange={e => setReapplyForm({ ...reapplyForm, aadhar_number: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-white/50 mb-1.5 font-bold">Bank Account Number</label>
                <input
                  type="text"
                  value={reapplyForm.bank_account}
                  onChange={e => setReapplyForm({ ...reapplyForm, bank_account: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] tracking-widest uppercase text-white/50 mb-1.5 font-bold">New Store Logo (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setReapplyLogoFile(e.target.files[0])}
                className="w-full text-xs text-white/40 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={reapplyLoading}
              className="w-full mt-2 py-3 bg-[#C9A84C] hover:bg-[#b8952e] text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-all duration-300 shadow-md"
            >
              {reapplyLoading ? "Submitting Application..." : "Submit Reapplication 🔄"}
            </button>
          </form>

          <div className="flex justify-center gap-4">
            <button 
              onClick={async () => {
                await insforge.auth.signOut();
                navigate("/login");
              }}
              className="px-6 py-2.5 rounded-xl text-xs tracking-widest uppercase text-white/50 hover:text-white border border-white/10 hover:bg-white/5 transition-all"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle case where seller application is still pending
  if (vendorData && vendorData.status === "pending") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center pt-24 px-6 text-white font-sans">
        <div className="max-w-md w-full bg-[#111] border border-white/10 rounded-2xl p-8 text-center shadow-2xl animate-fade-in">
          <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-500/20 animate-pulse">
            <span className="text-3xl text-yellow-500">⏳</span>
          </div>
          <h2 className="display text-2xl font-bold mb-4 uppercase tracking-wider">Application Under Review</h2>
          <p className="text-white/60 mb-6 text-sm leading-relaxed">
            Your application for store <span className="gold font-semibold">"{vendorData.store_name}"</span> is currently pending review. 
            Our administrators are checking your business documents (PAN, GSTIN, Aadhaar).
          </p>
          <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-xs text-white/40 mb-6 font-semibold">
            Registered Email: {user?.email}<br />
            Commission Setup: {vendorData.commission_rate}% Platform Fee
          </div>
          <button 
            onClick={async () => {
              await insforge.auth.signOut();
              navigate("/login");
            }}
            className="btn-outline px-6 py-2.5 rounded-xl text-xs tracking-widest uppercase text-white/70 hover:text-white border border-white/10 hover:bg-white/5 transition-all"
          >
            🚪 Sign Out & Return Home
          </button>
        </div>
      </div>
    );
  }

  // Styling variable bindings based on theme toggle
  const themeBg = isDarkMode ? "bg-[#0a0a0a] text-white" : "bg-[#f5f6f8] text-[#0a0a0a]";
  const cardBg = isDarkMode ? "bg-[#111] border-white/5" : "bg-white border-black/5 shadow-md shadow-black/[0.02]";
  const inputBg = isDarkMode ? "bg-white/[0.04] border-white/10" : "bg-black/[0.02] border-black/10 text-black";
  const borderLight = isDarkMode ? "border-white/5" : "border-black/5";
  const textSubtle = isDarkMode ? "text-white/40" : "text-black/40";
  const textTitle = isDarkMode ? "text-white" : "text-black";

  return (
    <div className={`min-h-screen pt-24 pb-16 flex flex-col lg:flex-row max-w-7xl mx-auto px-6 gap-8 transition-colors duration-300 ${themeBg}`}>
      
      {/* SIDEBAR MERCHANT PANEL */}
      <aside className={`w-full lg:w-64 flex-shrink-0 border p-6 rounded-2xl self-start shadow-xl ${cardBg}`}>
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#d4af37] to-[#f5d26e] flex items-center justify-center font-bold text-[#0a0a0a] text-xl">
            {vendorData?.store_name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4 className={`font-bold text-sm truncate ${textTitle}`}>{vendorData?.store_name}</h4>
            <span className="inline-block text-[8px] bg-green-500/10 text-green-400 font-extrabold px-2 py-0.5 rounded-full mt-1 border border-green-500/20 tracking-widest uppercase">
              Approved
            </span>
          </div>
        </div>

        {/* 14 NAVIGATION TABS */}
        <nav className="flex flex-col gap-1">
          {[
            { id: "overview", label: "Dashboard", icon: BarChart3 },
            { id: "products", label: "Products Catalog", icon: Package },
            { id: "add-product", label: "Upload Listings", icon: PlusCircle },
            { id: "orders", label: "Fulfill Orders", icon: ShoppingBag },
            { id: "returns", label: "Returns Manager", icon: RotateCcw },
            { id: "shipments", label: "My Shipments", icon: Truck },
            { id: "analytics", label: "Sales Analytics", icon: TrendingUp },
            { id: "inventory", label: "Inventory Stock", icon: Boxes },
            { id: "coupons", label: "Promo Coupons", icon: Percent },
            { id: "reviews", label: "Product Reviews", icon: Star },
            { id: "settings", label: "Store Customization", icon: Settings },
            { id: "payouts", label: "Payout Settlement", icon: CircleDollarSign },
            { id: "notifications", label: "Store Warnings", icon: Bell },
            { id: "help-center", label: "Merchant Help Desk", icon: HelpCircle },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "add-product") resetProductForm();
                  setActiveTab(tab.id);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab.id
                    ? "bg-yellow-500/10 gold border border-yellow-500/20"
                    : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon size={14} />
                {tab.label}
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

      {/* MAIN MERCHANT PORTAL CONTENT */}
      <main className="flex-1 min-w-0 space-y-6">
        
        {/* HEADER TOOLBAR WITH COMMAND PALETTE TRIGGER */}
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
            <span>Merchant ID: {user?.id?.slice(0, 8)}</span>
            <span>RLS Active</span>
          </div>
        </header>

        {/* ─── TAB: OVERVIEW ─── */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Merchant Dashboard</h2>
                <p className={`text-xs ${textSubtle}`}>Real-time store metrics, gross transaction volumes, and warehouse alerts.</p>
              </div>
              
              <button 
                onClick={() => { resetProductForm(); setEditingProduct(null); setActiveTab("add-product"); }}
                className="btn-gold px-5 py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-widest self-start sm:self-center"
              >
                Upload Product ➕
              </button>
            </div>

            {/* Stats Metrics GTV Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {[
                { title: "Gross Revenue", val: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, desc: `${stats.totalSales} items bought`, color: "text-[#d4af37]" },
                { title: "Total Orders", val: stats.totalOrders, desc: `${stats.pendingOrdersCount} awaiting shipment`, color: "gold" },
                { title: "Net Earnings", val: `₹${stats.netEarnings.toLocaleString('en-IN')}`, desc: `Commission: ${vendorData?.commission_rate}%`, color: "text-green-400" },
                { title: "Products Sold", val: stats.productsSold || stats.totalSales, desc: "Successful checkouts", color: "text-blue-400" },
                { title: "Top Product", val: stats.topProduct || "N/A", desc: "Most popular item", color: "text-purple-400" },
                { title: "Conversion Rate", val: `${stats.conversionRate}%`, desc: `${stats.trafficVisits} site views`, color: "text-orange-400" },
              ].map((stat, idx) => (
                <div key={idx} className={`border rounded-2xl p-5 shadow-lg relative overflow-hidden group ${cardBg}`}>
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/5 blur-xl group-hover:bg-[#d4af37]/5 transition-all" />
                  <div className={`text-[10px] uppercase tracking-widest font-bold mb-2 ${textSubtle}`}>{stat.title}</div>
                  <div className={`text-xl lg:text-2xl font-black ${stat.color === 'gold' ? 'text-white' : stat.color}`}>
                    {stat.val}
                  </div>
                  <p className={`text-[10px] mt-1.5 ${textSubtle}`}>{stat.desc}</p>
                </div>
              ))}
            </div>

            {/* Split layout: SVG Analytics Line Chart + low stock alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* INTERACTIVE SVG GROWTH CHART */}
              <div className={`border rounded-2xl p-6 shadow-xl lg:col-span-2 space-y-4 ${cardBg}`}>
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h4 className={`font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${textTitle}`}>
                    <span>📈</span> Store Performance Index
                  </h4>
                  <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-bold uppercase">
                    +15.4% Weekly
                  </span>
                </div>
                
                {/* SVG Graph rendering */}
                <div className="h-44 w-full relative pt-2">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120">
                    {/* Grids lines */}
                    <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    
                    {/* Line Area */}
                    <path
                      d="M 0 100 Q 80 50 160 80 T 320 20 T 500 40 L 500 100 L 0 100 Z"
                      fill="url(#gradient-line-area)"
                      opacity="0.1"
                    />
                    
                    {/* Trend Line */}
                    <path
                      d="M 0 100 Q 80 50 160 80 T 320 20 T 500 40"
                      fill="none"
                      stroke="#d4af37"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Gradient Definition */}
                    <defs>
                      <linearGradient id="gradient-line-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d4af37" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Graph labels */}
                  <div className={`flex justify-between text-[9px] font-bold uppercase mt-2 ${textSubtle}`}>
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                  </div>
                </div>
              </div>

              {/* ACTION LOGS TRACKER */}
              <div className={`border rounded-2xl p-6 shadow-xl flex flex-col justify-between ${cardBg}`}>
                <div className="space-y-4">
                  <h4 className={`font-bold text-xs uppercase tracking-wider border-b border-white/5 pb-4 ${textTitle}`}>
                    ⚡ Active Operational Feed
                  </h4>
                  <div className="space-y-3">
                    {activityLogs.map((log, idx) => (
                      <div key={idx} className="flex justify-between items-start gap-2 text-[10px] leading-relaxed">
                        <span className={textTitle}>• {log.text}</span>
                        <span className={`flex-shrink-0 ${textSubtle}`}>{log.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-white/35 font-semibold">
                  <span>Warehouse status: Active</span>
                  <span className="text-emerald-400">Online</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ─── TAB: PRODUCTS LIST ─── */}
        {activeTab === "products" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Products Catalog</h2>
                <p className={`text-xs ${textSubtle}`}>Audit pricing guidelines, adjust stock count, and review published details.</p>
              </div>
              <button 
                onClick={() => { resetProductForm(); setEditingProduct(null); setActiveTab("add-product"); }}
                className="btn-gold px-5 py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-widest self-start sm:self-center"
              >
                Upload New Product ➕
              </button>
            </div>

            {/* Catalog list table */}
            <div className={`border rounded-2xl overflow-hidden shadow-xl ${cardBg}`}>
              {products.length === 0 ? (
                <div className="text-center py-20">
                  <span className="text-4xl block mb-4">📦</span>
                  <h4 className="font-bold text-base mb-2">No Listings Published</h4>
                  <p className={`text-xs max-w-xs mx-auto mb-6 ${textSubtle}`}>Create storefront listings to publish models onto the global Trendz catalog.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.01] text-white/50 tracking-wider uppercase font-semibold">
                        <th className="px-6 py-4">Product details</th>
                        <th className="px-6 py-4">SKU / SKU Tag</th>
                        <th className="px-6 py-4">Original / Sale Price</th>
                        <th className="px-6 py-4">Warehouse Stock</th>
                        <th className="px-6 py-4 text-center">Fulfillment Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {products.map(p => (
                        <tr key={p.id} className="hover:bg-white/[0.005] transition-colors">
                          <td className="px-6 py-4 flex items-center gap-3">
                            <img src={p.img} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                            <div>
                              <p className={`font-bold text-sm ${textTitle}`}>{p.name}</p>
                              <span className={`text-[9px] uppercase tracking-widest font-bold ${textSubtle}`}>{p.category}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold gold">
                            {p.specs?.sku || `SKU-${p.id.slice(0, 5).toUpperCase()}`}
                          </td>
                          <td className="px-6 py-4 font-semibold">
                            <span className={textTitle}>₹{p.price.toLocaleString("en-IN")}</span>
                            {p.original_price && p.original_price > p.price && (
                              <p className={`text-[10px] line-through ${textSubtle}`}>₹{p.original_price.toLocaleString("en-IN")}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 font-semibold">
                            <span className={p.stock < 5 ? "text-yellow-400" : "text-white/60"}>
                              {p.stock} units
                            </span>
                            {p.stock < 5 && <span className="text-[9px] block text-yellow-500 font-bold uppercase mt-0.5">⚠️ Low stock</span>}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleEditProduct(p)} className="p-2 border border-white/10 hover:border-yellow-500 rounded-lg hover:bg-yellow-500/5 transition-all text-xs" title="Edit Product">
                                ✏️
                              </button>
                              <button onClick={() => handleDeleteProduct(p.id)} className="p-2 border border-white/10 hover:border-red-500 rounded-lg hover:bg-red-500/5 transition-all text-xs" title="Delete Product">
                                🗑️
                              </button>
                            </div>
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
        {/* ─── TAB: ADD / EDIT PRODUCT ─── */}
        {activeTab === "add-product" && (
          <div className="space-y-6 animate-fade-in max-w-4xl">
            <div>
              <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>
                {editingProduct ? "Modify Product Listing" : "Upload Store Products"}
              </h2>
              <p className={`text-xs ${textSubtle}`}>Configure single listing descriptions manually or upload products in bulk using an Excel CSV file.</p>
            </div>

            <div className={`border rounded-2xl p-6 shadow-xl ${cardBg}`}>
              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl mb-6">
                  {formError}
                </div>
              )}

                <form onSubmit={handleProductSubmit} className="space-y-5 text-xs font-semibold">
                <div>
                  <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Product Title</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="Classic Luxury Gold Chronograph"
                    className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Selling Price (₹)</label>
                    <input
                      type="number"
                      value={productForm.price}
                      onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                      placeholder="14900"
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`}
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Original Price (₹)</label>
                    <input
                      type="number"
                      value={productForm.originalPrice}
                      onChange={e => setProductForm({ ...productForm, originalPrice: e.target.value })}
                      placeholder="19900"
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Product Badge</label>
                    <select
                      value={productForm.badge}
                      onChange={e => setProductForm({ ...productForm, badge: e.target.value })}
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs bg-black/45`}
                    >
                      <option value="">No Badge</option>
                      <option value="New">New</option>
                      <option value="Hot">Hot</option>
                      <option value="Sale">Sale</option>
                      <option value="Best Seller">Best Seller</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Category</label>
                    <select
                      value={productForm.category}
                      onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs bg-black/45`}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Brand Identity</label>
                    <input
                      type="text"
                      value={productForm.brand}
                      onChange={e => setProductForm({ ...productForm, brand: e.target.value })}
                      placeholder="Meridian Watch Elite"
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Material details</label>
                    <input
                      type="text"
                      value={productForm.material}
                      onChange={e => setProductForm({ ...productForm, material: e.target.value })}
                      placeholder="Stainless Steel / Italian Leather"
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Warehouse Stock quantity</label>
                    <input
                      type="number"
                      value={productForm.stock}
                      onChange={e => setProductForm({ ...productForm, stock: e.target.value })}
                      placeholder="25"
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`}
                      required
                    />
                  </div>
                </div>

                {/* Sizing & colors Variants */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Colors Matrix (Comma separated)</label>
                    <input
                      type="text"
                      value={productForm.colors}
                      onChange={e => setProductForm({ ...productForm, colors: e.target.value })}
                      placeholder="Gold, Black, Navy"
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Sizing Matrix (Comma separated)</label>
                    <input
                      type="text"
                      value={productForm.sizes}
                      onChange={e => setProductForm({ ...productForm, sizes: e.target.value })}
                      placeholder="S, M, L, XL"
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`}
                    />
                  </div>
                </div>

                {/* SKU Code block */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>SKU Catalog ID</label>
                    <input
                      type="text"
                      value={productForm.sku}
                      onChange={e => setProductForm({ ...productForm, sku: e.target.value })}
                      placeholder="MER-GOLD-01"
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Delivery SLA days</label>
                    <input
                      type="number"
                      value={productForm.deliveryDays}
                      onChange={e => setProductForm({ ...productForm, deliveryDays: e.target.value })}
                      placeholder="3"
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`}
                    />
                  </div>
                </div>

                {/* Image Media source */}
                <div>
                  <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Listing Image Media URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={productForm.img}
                      onChange={e => setProductForm({ ...productForm, img: e.target.value })}
                      placeholder="https://domain.com/photo.png"
                      className={`input-field flex-1 px-4 py-3 rounded-xl text-xs ${inputBg}`}
                    />
                    <div className="relative flex-shrink-0">
                      <input
                        type="file"
                        id="vendor-image-file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                      <label
                        htmlFor="vendor-image-file"
                        className="btn-outline px-4 py-3.5 rounded-xl text-[9px] font-bold uppercase tracking-wider block cursor-pointer"
                      >
                        {uploadingImage ? "Uploading..." : "📷 Upload"}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Detailed Description */}
                <div>
                  <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Description details</label>
                  <textarea
                    value={productForm.description}
                    onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                    rows={3}
                    placeholder="Provide customer copy detailing specification, materials, and sizes."
                    className={`input-field w-full px-4 py-3 rounded-xl text-xs resize-none ${inputBg}`}
                  />
                </div>

                {/* Multiple Images Upload */}
                <div>
                  <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Additional Product Gallery Images (Optional)</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="file"
                      id="vendor-multiple-images"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleMultipleImagesUpload}
                    />
                    <label
                      htmlFor="vendor-multiple-images"
                      className="btn-outline px-4 py-3 rounded-xl text-[9px] font-bold uppercase tracking-wider block cursor-pointer"
                    >
                      {uploadingImage ? "Uploading..." : "📷 Upload Gallery Images"}
                    </label>
                  </div>
                  {productForm.images && productForm.images.length > 0 && (
                    <div className="flex flex-wrap gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                      {productForm.images.map((url, index) => (
                        <div key={index} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                          <img src={url} alt="Product Gallery Thumbnail" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeUploadedImage(index)}
                            className="absolute inset-0 bg-red-600/80 text-white font-bold text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Return Policy */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 select-none h-full">
                    <input
                      type="checkbox"
                      id="returnable"
                      checked={productForm.returnable}
                      onChange={e => setProductForm({ ...productForm, returnable: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-[#C9A84C] focus:ring-[#C9A84C] accent-[#C9A84C]"
                    />
                    <label htmlFor="returnable" className={`text-xs font-bold ${textTitle} cursor-pointer`}>
                      Return Policy Eligible
                    </label>
                  </div>
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Return Window Days</label>
                    <input
                      type="number"
                      value={productForm.returnDays}
                      onChange={e => setProductForm({ ...productForm, returnDays: e.target.value })}
                      disabled={!productForm.returnable}
                      placeholder="5"
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg} ${!productForm.returnable ? "opacity-50 cursor-not-allowed" : ""}`}
                    />
                  </div>
                </div>

                {/* Specifications JSON Editor */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className={`block text-[9px] tracking-widest uppercase font-bold ${textSubtle}`}>Product Specifications</label>
                    <button
                      type="button"
                      onClick={() => setProductForm(f => ({ ...f, specsList: [...(f.specsList || []), { key: "", value: "" }] }))}
                      className="text-[#C9A84C] text-[10px] hover:underline font-bold"
                    >
                      ➕ Add Spec
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(productForm.specsList || []).map((spec, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={spec.key}
                          onChange={e => {
                            const list = [...(productForm.specsList || [])];
                            list[index].key = e.target.value;
                            setProductForm({ ...productForm, specsList: list });
                          }}
                          placeholder="Key (e.g. Fit)"
                          className={`input-field flex-1 px-3 py-2 rounded-lg text-xs ${inputBg}`}
                        />
                        <input
                          type="text"
                          value={spec.value}
                          onChange={e => {
                            const list = [...(productForm.specsList || [])];
                            list[index].value = e.target.value;
                            setProductForm({ ...productForm, specsList: list });
                          }}
                          placeholder="Value (e.g. Regular Fit)"
                          className={`input-field flex-1 px-3 py-2 rounded-lg text-xs ${inputBg}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const list = (productForm.specsList || []).filter((_, idx) => idx !== index);
                            setProductForm({ ...productForm, specsList: list.length > 0 ? list : [{ key: "", value: "" }] });
                          }}
                          className="text-red-500 font-bold px-2"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SEO METADATA BLOCK */}
                <div className="space-y-4 border-t border-white/5 pt-5 mt-5">
                  <span className="text-[10px] font-bold tracking-widest uppercase gold">Search Engine Optimization (SEO) Metadata</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Meta Title</label>
                      <input
                        type="text"
                        value={productForm.metaTitle}
                        onChange={e => setProductForm({ ...productForm, metaTitle: e.target.value })}
                        placeholder="Search engine preview title..."
                        className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Meta Description Keyword tags</label>
                      <input
                        type="text"
                        value={productForm.metaDescription}
                        onChange={e => setProductForm({ ...productForm, metaDescription: e.target.value })}
                        placeholder="Premium watch, gold watch, chronograph..."
                        className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex gap-3">
                  <button type="button" onClick={() => { resetProductForm(); setActiveTab("products"); }} className="btn-outline flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider">
                    Cancel
                  </button>
                  <button type="submit" className="btn-gold flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider">
                    {editingProduct ? "Update Listing" : "Publish Listing"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── TAB: ORDERS FULFILLMENT ─── */}
        {activeTab === "orders" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Fulfill Shop Orders</h2>
              <p className={`text-xs ${textSubtle}`}>Process customer orders, print commercial tax invoices, and prepare express airway shipment slips.</p>
            </div>

            <div className={`border rounded-2xl overflow-hidden shadow-xl ${cardBg}`}>
              {vendorOrders.length === 0 ? (
                <div className="text-center py-20">
                  <span className="text-4xl block mb-4">🛒</span>
                  <h4 className="font-bold text-base mb-2">No Active Orders Yet</h4>
                  <p className={`text-xs max-w-xs mx-auto ${textSubtle}`}>Orders containing products owned by your store profile will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {vendorOrders.map(order => {
                    const orderItemsForThisOrder = order.order_items || [];
                    if (orderItemsForThisOrder.length === 0) return null;
                    return (
                      <div key={order.id} className="p-6 flex flex-col justify-between gap-4 hover:bg-white/[0.005] transition-colors">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-white/5">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-bold font-mono gold">{order.order_id}</span>
                              <span className={`text-[9px] ${textSubtle}`}>
                                · Date: {new Date(order.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className={`text-[10px] ${textSubtle}`}>
                              <strong className="text-white/60">Shipping Destination:</strong> {order.shipping_address?.name}, {order.shipping_address?.line1}, {order.shipping_address?.city} - {order.shipping_address?.pincode}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <span className={`inline-block text-[10px] font-bold px-3 py-1 rounded-full uppercase border tracking-wider ${statusColorMap[order.order_status]}`}>
                              {order.order_status}
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              {order.order_status === "Processing" && (
                                <button onClick={() => handleUpdateOrderStatus(order.id, "Confirmed")} className="btn-gold px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest">
                                  Accept Order
                                </button>
                              )}
                              {order.order_status === "Confirmed" && (
                                <button onClick={() => handleOpenShipmentModal(orderItemsForThisOrder[0])} className="btn-gold px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1">
                                  <Truck size={12} /> Dispatch Shipment
                                </button>
                              )}
                              {order.order_status === "Shipped" && (
                                <button onClick={() => handleUpdateOrderStatus(order.id, "Delivered")} className="btn-gold px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest">
                                  Mark Delivered
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 pt-2">
                          {orderItemsForThisOrder.map(item => (
                            <div key={item.id} className="flex items-center gap-4 pl-2">
                              <img src={item.image || item.products?.img} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                              <div className="flex-1 min-w-0">
                                <h4 className={`font-bold text-xs truncate ${textTitle}`}>{item.name}</h4>
                                <div className={`text-[9px] flex gap-3 mt-0.5 ${textSubtle}`}>
                                  <span>Qty: <strong className={textTitle}>{item.quantity}</strong></span>
                                  {item.color && <span>Color: <strong className={textTitle}>{item.color}</strong></span>}
                                  {item.size && <span>Size: <strong className={textTitle}>{item.size}</strong></span>}
                                  <span>Revenue Share: <strong className="gold">₹{(item.price * item.quantity).toLocaleString()}</strong></span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: RETURNS MANAGER ─── */}
        {activeTab === "returns" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Returns Management</h2>
              <p className={`text-xs ${textSubtle}`}>Track shopper return requests, confirm parcel condition, and approve refunds.</p>
            </div>

            <div className={`border rounded-2xl overflow-hidden shadow-xl ${cardBg}`}>
              {orderItems.filter(i => i.orders?.order_status === "Return Requested" || i.orders?.order_status === "Returned").length === 0 ? (
                <div className="text-center py-20 text-white/40 text-xs">No return claims filed by customers.</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {orderItems.filter(i => i.orders?.order_status === "Return Requested" || i.orders?.order_status === "Returned").map(item => (
                    <div key={item.id} className="p-6 flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold font-mono gold text-xs">{item.orders?.order_id}</span>
                          <span className="text-[9px] uppercase tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold">
                            Return Claim
                          </span>
                        </div>
                        <h4 className={`font-bold text-sm ${textTitle}`}>{item.name}</h4>
                        <p className={`text-[10px] mt-1 ${textSubtle}`}>Reason: <strong className="text-white">{item.orders?.return_reason || "Not provided"}</strong></p>
                      </div>

                      <div className="flex gap-2 self-end sm:self-center">
                        {item.orders?.order_status === "Return Requested" && (
                          <>
                            <button
                              onClick={() => handleUpdateOrderStatus(item.orders?.id, "Delivered")}
                              className="border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider"
                            >
                              Reject Return
                            </button>
                            <button
                              onClick={() => handleUpdateOrderStatus(item.orders?.id, "Returned")}
                              className="btn-gold px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest"
                            >
                              Approve Refund
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: SHIPMENTS ─── */}
        {activeTab === "shipments" && (
          <div className="space-y-6 animate-fade-in text-xs font-semibold">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>My Shipments</h2>
                <p className={`text-xs ${textSubtle}`}>Monitor delivery progress, track net earnings per delivered order, and log custom events.</p>
              </div>
            </div>

            {/* Quick Metrics */}
            {(() => {
              const today = new Date().toDateString();
              const todayDeliveries = activeShipments.filter(s => {
                const status = (s.status || "").toLowerCase();
                if (status !== 'delivered') return false;
                const deliveryDate = s.actual_delivery ? new Date(s.actual_delivery).toDateString() : null;
                return deliveryDate === today;
              }).length;

              const inTransitCount = activeShipments.filter(s => 
                ['pickup_scheduled', 'picked_up', 'in_transit', 'out_for_delivery'].includes(s.status)
              ).length;

              const failedCount = activeShipments.filter(s => 
                (s.status || "").toLowerCase() === 'failed'
              ).length;

              const deliveredShipments = activeShipments.filter(s => 
                (s.status || "").toLowerCase() === 'delivered'
              );

              const totalEarnings = deliveredShipments.reduce((sum, s) => {
                return sum + getOrderEarnings(s.order_id);
              }, 0);

              const pendingCount = activeShipments.filter(s => 
                !['delivered', 'failed'].includes((s.status || "").toLowerCase())
              ).length;

              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Today's Deliveries", val: todayDeliveries, color: "text-green-400" },
                    { label: "In Transit", val: inTransitCount, color: "text-blue-400" },
                    { label: "Total Net Earnings", val: `₹${totalEarnings.toLocaleString('en-IN')}`, color: "text-green-400" },
                    { label: "Pending Shipments", val: pendingCount, color: "text-yellow-400" }
                  ].map((sys, idx) => (
                    <div key={idx} className={`p-4 border rounded-2xl ${cardBg}`}>
                      <span className={`text-[8.5px] uppercase tracking-widest font-black ${textSubtle}`}>{sys.label}</span>
                      <h4 className={`text-xl font-black mt-1 ${sys.color}`}>{sys.val}</h4>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Filter and Search row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/10 p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="text"
                  placeholder="Search by Tracking/Order ID..."
                  value={shipmentSearch}
                  onChange={e => setShipmentSearch(e.target.value)}
                  className={`px-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500/40 w-48 sm:w-64 ${inputBg}`}
                />
                
                <select
                  value={shipmentStatusFilter}
                  onChange={e => setShipmentStatusFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold uppercase focus:outline-none focus:ring-1 focus:ring-yellow-500/40 ${inputBg}`}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_transit">In Transit</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            {/* Read-only Shipments Table */}
            <div className={`border rounded-2xl shadow-xl overflow-hidden ${cardBg}`}>
              {(() => {
                const filteredShipments = activeShipments.filter(s => {
                  const matchItem = orderItems.find(item => item.order_id === s.order_id);
                  const order = matchItem?.orders;
                  const orderIdText = (order?.order_id || "").toLowerCase();
                  
                  const matchesSearch = 
                    (s.shipment_id || "").toLowerCase().includes(shipmentSearch.toLowerCase()) ||
                    (s.order_id || "").toLowerCase().includes(shipmentSearch.toLowerCase()) ||
                    orderIdText.includes(shipmentSearch.toLowerCase());

                  const status = (s.status || "").toLowerCase();
                  let matchesStatus = true;
                  if (shipmentStatusFilter !== "all") {
                    if (shipmentStatusFilter === "in_transit") {
                      matchesStatus = ["pickup_scheduled", "picked_up", "in_transit"].includes(status);
                    } else if (shipmentStatusFilter === "out_for_delivery") {
                      matchesStatus = ["out_for_delivery", "last mile delivery"].includes(status);
                    } else {
                      matchesStatus = status === shipmentStatusFilter;
                    }
                  }

                  return matchesSearch && matchesStatus;
                });

                if (filteredShipments.length === 0) {
                  return (
                    <div className="text-center py-20">
                      <span className="text-4xl block mb-4">📦</span>
                      <h4 className="font-bold text-base mb-2">No Shipments Found</h4>
                      <p className={`text-xs max-w-xs mx-auto ${textSubtle}`}>No shipment records match the search terms or filters.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 tracking-wider uppercase font-semibold">
                          <th className="px-6 py-4">Order ID</th>
                          <th className="px-6 py-4">Customer Name</th>
                          <th className="px-6 py-4">Tracking Number</th>
                          <th className="px-6 py-4">Carrier</th>
                          <th className="px-6 py-4">Current Status</th>
                          <th className="px-6 py-4">Current Location</th>
                          <th className="px-6 py-4">Estimated Delivery</th>
                          <th className="px-6 py-4">Net Earnings</th>
                          <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredShipments.map(s => {
                          const matchItem = orderItems.find(item => item.order_id === s.order_id);
                          const order = matchItem?.orders;
                          
                          let customerName = s.destination?.name || order?.shipping_address?.name || "Customer";
                          if (!s.destination?.name && order?.shipping_address && typeof order.shipping_address === 'string') {
                            try {
                              const parsed = JSON.parse(order.shipping_address);
                              customerName = parsed.name || customerName;
                            } catch (e) {}
                          }

                          const status = s.status || "pending";
                          const badgeColor = {
                            "pending": "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20",
                            "pickup_scheduled": "bg-slate-500/10 text-slate-400 border border-slate-500/20",
                            "picked_up": "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                            "in_transit": "bg-sky-500/10 text-sky-400 border border-sky-500/20",
                            "out_for_delivery": "bg-orange-500/10 text-orange-400 border border-orange-500/20",
                            "last mile delivery": "bg-orange-500/10 text-orange-400 border border-orange-500/20",
                            "delivered": "bg-green-500/10 text-green-400 border border-green-500/20",
                            "failed": "bg-red-500/10 text-red-400 border border-red-500/20",
                            "returned": "bg-pink-500/10 text-pink-400 border border-pink-500/20",
                          }[status.toLowerCase()] || "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20";

                          const isDelivered = status.toLowerCase() === 'delivered';
                          const netEarnings = getOrderEarnings(s.order_id);

                          return (
                            <tr key={s.id} className="hover:bg-white/[0.005] transition-colors">
                              <td className="px-6 py-4">
                                <p className={`font-mono font-bold text-sm ${textTitle}`}>{order?.order_id || s.order_id.slice(0, 8)}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={textTitle}>{customerName}</span>
                              </td>
                              <td className="px-6 py-4 font-mono font-semibold">
                                {s.shipment_id}
                              </td>
                              <td className="px-6 py-4">
                                {s.contractors?.name || s.carrier || "Carrier partner"}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeColor}`}>
                                  {status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {s.current_location || "Processing Depot"}
                              </td>
                              <td className="px-6 py-4">
                                {s.estimated_delivery ? new Date(s.estimated_delivery).toLocaleDateString() : "Pending ETA"}
                              </td>
                              <td className="px-6 py-4 font-bold">
                                {isDelivered ? (
                                  <span className="text-green-400">₹{netEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                ) : (
                                  <span className={textSubtle}>—</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => {
                                    setEditingShipment(s);
                                    setNewEventStatus(s.status || "Updated");
                                    setNewEventLocation(s.current_location || "");
                                    setNewEventNote("");
                                    setShowEventModal(true);
                                  }}
                                  className="px-3 py-1.5 border border-white/10 hover:border-yellow-500 rounded-lg hover:bg-yellow-500/5 transition-all text-[10px] font-bold uppercase tracking-wider text-yellow-500"
                                >
                                  Append Event Note 📝
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* APPEND EVENT NOTE MODAL */}
            {showEventModal && editingShipment && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
                <div 
                  className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs font-semibold"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-[#d4af37]">Append Shipment Event</h3>
                    <button 
                      onClick={() => { setShowEventModal(false); setEditingShipment(null); }} 
                      className="text-white/40 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <p className={`text-[10px] ${textSubtle} leading-relaxed`}>
                    Log an update onto this consignment's event timeline. This note will be visible to the customer.
                  </p>

                  <form onSubmit={handleAppendShipmentEvent} className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-widest text-white/50 mb-1">Current Status</label>
                      <select 
                        value={newEventStatus} 
                        onChange={e => setNewEventStatus(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-xs bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-gold"
                      >
                        <option value={editingShipment.status}>{editingShipment.status} (Current)</option>
                        <option value="pickup_scheduled">pickup_scheduled</option>
                        <option value="picked_up">picked_up</option>
                        <option value="in_transit">in_transit</option>
                        <option value="out_for_delivery">out_for_delivery</option>
                        <option value="delivered">delivered</option>
                        <option value="failed">failed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-widest text-white/50 mb-1">Location of Event</label>
                      <input 
                        type="text"
                        placeholder="e.g. Mumbai Airport Hub" 
                        value={newEventLocation}
                        onChange={e => setNewEventLocation(e.target.value)} 
                        className="w-full px-4 py-3 rounded-xl text-xs bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-gold" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-widest text-white/50 mb-1">Custom Event Description Note</label>
                      <textarea 
                        placeholder="e.g. Package arrived at local depot for scanning..."
                        value={newEventNote}
                        onChange={e => setNewEventNote(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-xs bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-gold resize-none h-20" 
                        required
                      />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/5">
                      <button 
                        type="button"
                        onClick={() => { setShowEventModal(false); setEditingShipment(null); }} 
                        className="px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold uppercase tracking-wider flex-1"
                      >
                        Cancel
                      </button>
                      
                      <button 
                        type="submit"
                        disabled={loadingEvents}
                        className="btn-gold flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border-0 text-white bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50"
                      >
                        {loadingEvents ? "Saving..." : "Append Note"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: SALES ANALYTICS ─── */}
        {activeTab === "analytics" && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Sales Analytics</h2>
              <p className={`text-xs ${textSubtle}`}>Deep-dive business intelligence metrics, page views, and store conversion rates.</p>
            </div>

            {/* SVG Charts grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Daily Revenue Chart */}
              <div className={`border rounded-2xl p-6 shadow-xl ${cardBg} space-y-4`}>
                <h4 className={`font-bold text-xs uppercase tracking-wider border-b border-white/5 pb-4 ${textTitle}`}>
                  Daily Gross Sales Revenue (₹)
                </h4>
                <div className="h-44 w-full pt-2">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120">
                    <rect x="20" y="80" width="30" height="20" fill="#d4af37" rx="3" />
                    <rect x="80" y="50" width="30" height="50" fill="#d4af37" rx="3" />
                    <rect x="140" y="60" width="30" height="40" fill="#d4af37" rx="3" />
                    <rect x="200" y="30" width="30" height="70" fill="#d4af37" rx="3" />
                    <rect x="260" y="40" width="30" height="60" fill="#d4af37" rx="3" />
                    <rect x="320" y="20" width="30" height="80" fill="#d4af37" rx="3" />
                    <rect x="380" y="45" width="30" height="55" fill="#d4af37" rx="3" />
                    <rect x="440" y="10" width="30" height="90" fill="#d4af37" rx="3" />
                    <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  </svg>
                  <div className={`flex justify-between text-[9px] font-bold uppercase mt-2 ${textSubtle}`}>
                    <span>Watches</span>
                    <span>Shirts</span>
                    <span>Footwear</span>
                    <span>Grooming</span>
                    <span>Accessories</span>
                    <span>Apparel</span>
                  </div>
                </div>
              </div>

              {/* Conversion charts */}
              <div className={`border rounded-2xl p-6 shadow-xl ${cardBg} space-y-4`}>
                <h4 className={`font-bold text-xs uppercase tracking-wider border-b border-white/5 pb-4 ${textTitle}`}>
                  Monthly Store Traffic Visits
                </h4>
                <div className="h-44 w-full pt-2">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120">
                    <path d="M 0 80 C 100 40 200 100 300 20 T 500 10" fill="none" stroke="#22c55e" strokeWidth="2.5" />
                    <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  </svg>
                  <div className={`flex justify-between text-[9px] font-bold uppercase mt-2 ${textSubtle}`}>
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ─── TAB: INVENTORY STOCK ─── */}
        {activeTab === "inventory" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Inventory Stock</h2>
              <p className={`text-xs ${textSubtle}`}>Audit warehouse stock levels, edit quantities, and track SKU inventory alerts.</p>
            </div>

            {/* Low stock indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "Low Stock Items", val: stats.lowStockCount, desc: "Fewer than 5 units left", icon: AlertTriangle, col: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
                { title: "Out Of Stock", val: products.filter(p => p.stock === 0).length, desc: "Published listings disabled", icon: Package, col: "text-red-400 bg-red-500/10 border-red-500/20" },
                { title: "Healthy Stocks", val: products.filter(p => p.stock >= 5).length, desc: "Catalog listings fully active", icon: CheckCircle2, col: "text-green-400 bg-green-500/10 border-green-500/20" }
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className={`border rounded-2xl p-5 shadow-lg flex items-center gap-4 ${cardBg}`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${card.col}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <span className={`text-[10px] uppercase tracking-wider font-bold block ${textSubtle}`}>{card.title}</span>
                      <h4 className={`text-2xl font-black ${textTitle}`}>{card.val}</h4>
                      <p className={`text-[10px] ${textSubtle}`}>{card.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detailed Stock Table */}
            <div className={`border rounded-2xl overflow-hidden shadow-xl ${cardBg}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.01] text-white/50 tracking-wider uppercase font-semibold">
                      <th className="px-6 py-4">Product Info</th>
                      <th className="px-6 py-4">SKU / Code</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Stock level</th>
                      <th className="px-6 py-4">Warehouse</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-white/[0.005] transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <img src={p.img} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                          <span className={`font-bold ${textTitle}`}>{p.name}</span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold gold">{p.specs?.sku || "SKU-AUTO"}</td>
                        <td className="px-6 py-4 capitalize text-white/60">{p.category}</td>
                        <td className="px-6 py-4 font-semibold">
                          <span className={p.stock < 5 ? "text-yellow-500 font-bold" : "text-white/60"}>
                            {p.stock} units
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white/40 font-medium">Block A / Shelf 4</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: PROMO COUPONS ─── */}
        {activeTab === "coupons" && (
          <div className="space-y-6 animate-fade-in max-w-lg">
            <div>
              <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Merchant Coupon Settings</h2>
              <p className={`text-xs ${textSubtle}`}>Configure flat discount coupons to drive customer store retention and conversion margins.</p>
            </div>

            <div className={`border rounded-2xl p-6 shadow-xl ${cardBg} space-y-4`}>
              <h4 className={`font-bold text-xs uppercase tracking-wider border-b border-white/5 pb-4 ${textTitle}`}>Create Store Coupon</h4>
              <div className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-1.5 font-bold ${textSubtle}`}>Promo Code</label>
                    <input type="text" placeholder="SALE50" className={`input-field w-full px-4 py-2.5 rounded-xl text-xs uppercase ${inputBg}`} />
                  </div>
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-1.5 font-bold ${textSubtle}`}>Discount Value (₹ / %)</label>
                    <input type="number" placeholder="500" className={`input-field w-full px-4 py-2.5 rounded-xl text-xs ${inputBg}`} />
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => { toast.success("Storefront coupon published!"); }}
                  className="btn-gold w-full py-3.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest mt-2"
                >
                  Publish Coupon
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: REVIEWS ─── */}
        {activeTab === "reviews" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Product Customer Reviews</h2>
              <p className={`text-xs ${textSubtle}`}>Audit aggregate ratings, read shopper comments, and check product satisfaction indexes.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { name: "Obsidian Classic Aviators", text: "Exceptional quality. The frame weight is luxurious, and the polarization blocks flares extremely well.", user: "Alice Brown", rating: 5, time: "2 days ago" },
                { name: "Classic Leather Strap Watch", text: "Very premium packaging. The movement is precise. Wish there were sizing options for smaller wrists.", user: "Bob Green", rating: 4, time: "1 week ago" }
              ].map((rev, idx) => (
                <div key={idx} className={`border rounded-2xl p-5 shadow-md ${cardBg} space-y-2`}>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className={`font-bold text-xs ${textTitle}`}>{rev.name}</h4>
                      <p className={`text-[10px] ${textSubtle}`}>Shopper: <strong className="text-white">{rev.user}</strong> · {rev.time}</p>
                    </div>
                    <div className="flex gap-0.5 text-yellow-500 font-bold">
                      {"★".repeat(rev.rating)}
                    </div>
                  </div>
                  <p className={`text-xs leading-relaxed ${textSubtle}`}>{rev.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB: STORE BRANDING SETTINGS ─── */}
        {activeTab === "settings" && (
          <div className="space-y-6 animate-fade-in max-w-2xl">
            <div>
              <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Store Branding Settings</h2>
              <p className={`text-xs ${textSubtle}`}>Configure your public storefront banner, store logo, description copy, and legal PAN/GST IDs.</p>
            </div>

            <div className={`border rounded-2xl p-6 shadow-xl ${cardBg}`}>
              {settingsSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-xs font-semibold mb-6 animate-slide-up">
                  {settingsSuccess}
                </div>
              )}

              <form onSubmit={handleSettingsSubmit} className="space-y-6 text-xs font-semibold">
                
                <p className="text-[10px] font-bold tracking-widest uppercase gold">Public Branding Customization</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Public Storefront Name</label>
                    <input 
                      value={settingsForm.store_name} 
                      onChange={e => setSettingsForm({ ...settingsForm, store_name: e.target.value })}
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`} 
                    />
                  </div>
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Store Logo media URL</label>
                    <input 
                      value={settingsForm.store_logo} 
                      onChange={e => setSettingsForm({ ...settingsForm, store_logo: e.target.value })}
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`} 
                      placeholder="e.g. https://domain.com/logo.png"
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Public Banner Image URL</label>
                  <input 
                    value={settingsForm.store_banner} 
                    onChange={e => setSettingsForm({ ...settingsForm, store_banner: e.target.value })}
                    className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`} 
                    placeholder="e.g. https://domain.com/banner.png"
                  />
                </div>

                <div>
                  <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>Store Description copy</label>
                  <textarea 
                    value={settingsForm.store_description} 
                    onChange={e => setSettingsForm({ ...settingsForm, store_description: e.target.value })}
                    rows={3}
                    className={`input-field w-full px-4 py-3 rounded-xl text-xs resize-none ${inputBg}`} 
                  />
                </div>

                <p className="text-[10px] font-bold tracking-widest uppercase gold pt-6 border-t border-white/5">Tax & Settlement Credentials (Immutable)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>PAN Card Number</label>
                    <input 
                      value={settingsForm.pan_card} 
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs bg-white/[0.01] ${textSubtle} cursor-not-allowed`} 
                      disabled
                    />
                  </div>
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-2 font-bold ${textSubtle}`}>GSTIN Number</label>
                    <input 
                      value={settingsForm.gst_number} 
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs bg-white/[0.01] ${textSubtle} cursor-not-allowed`} 
                      disabled
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <button type="submit" className="btn-gold px-8 py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase">
                    Save settings changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── TAB: PAYOUT SETTLEMENTS ─── */}
        {activeTab === "payouts" && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Settlements & splits Ledger</h2>
                <p className={`text-xs ${textSubtle}`}>Track platform commission rate splits, gross sales volumes, and dispatch payouts.</p>
              </div>

              {/* Commission splits rate box */}
              <div className={`p-4 rounded-xl border ${cardBg}`}>
                <span className="text-[8px] uppercase tracking-wider text-yellow-500 font-bold block">Your Platform Fee</span>
                <span className={`text-lg font-black ${textTitle}`}>{vendorData?.commission_rate || "10.00"}% <span className="text-[9px] text-white/30 font-semibold">per Order</span></span>
              </div>
            </div>

            {/* Split cards overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "Accumulated Revenue Share", val: `₹${stats.totalRevenue.toLocaleString()}`, sub: "Gross orders total value" },
                { title: "Net Seller Payout Ledger", val: `₹${stats.netEarnings.toLocaleString()}`, sub: "Dispatched to bank settings" },
                { title: "Commission Splits Deducted", val: `₹${stats.commissionDeducted.toLocaleString()}`, sub: "Retained by Platform Admin" }
              ].map((card, idx) => (
                <div key={idx} className={`border rounded-2xl p-5 relative overflow-hidden ${cardBg}`}>
                  <div className={`text-[9px] uppercase tracking-widest font-bold mb-2 ${textSubtle}`}>{card.title}</div>
                  <h4 className={`text-xl font-black ${idx === 1 ? 'text-green-400' : textTitle}`}>{card.val}</h4>
                  <p className={`text-[9px] mt-1 ${textSubtle}`}>{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Bank details + Request withdraw form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className={`border rounded-2xl p-6 space-y-4 ${cardBg}`}>
                <h4 className={`font-bold text-xs uppercase tracking-wider border-b border-white/5 pb-4 ${textTitle}`}>
                  Payout Withdrawal
                </h4>
                <form onSubmit={handleWithdrawalRequest} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className={`block text-[9px] tracking-widest uppercase mb-1.5 font-bold ${textSubtle}`}>Settlement Amount (₹)</label>
                    <input
                      type="number"
                      value={withdrawalAmount}
                      onChange={e => setWithdrawalAmount(e.target.value)}
                      placeholder={`Max available: ₹${Math.floor(stats.netEarnings).toLocaleString()}`}
                      className={`input-field w-full px-4 py-3 rounded-xl text-xs ${inputBg}`}
                    />
                  </div>
                  <button type="submit" className="btn-gold w-full py-3.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest">
                    Disburse Payout
                  </button>
                </form>
              </div>

              <div className={`border rounded-2xl p-6 ${cardBg} space-y-4`}>
                <h4 className={`font-bold text-xs uppercase tracking-wider border-b border-white/5 pb-4 ${textTitle}`}>
                  Bank Payout Channel
                </h4>
                <div className="space-y-2 text-[10px] font-semibold text-white/40">
                  <div className="flex justify-between">
                    <span>Beneficiary bank:</span>
                    <strong className={textTitle}>{vendorData?.bank_account?.split(" / ")[0] || "HDFC Settlement Bank"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Routing code / IFSC:</span>
                    <strong className={textTitle}>{vendorData?.bank_account?.split(" / ")[1] || "HDFC0002849"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Settlement status:</span>
                    <strong className="text-emerald-400">Verifying bank</strong>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ─── TAB: NOTIFICATIONS / WARNINGS ─── */}
        {activeTab === "notifications" && (
          <div className="space-y-6 animate-fade-in max-w-lg">
            <div>
              <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Store Warning Notifications</h2>
              <p className={`text-xs ${textSubtle}`}>Telemetric monitoring logs, stock levels critical events, and dispute reviews.</p>
            </div>

            <div className="space-y-4">
              {stats.lowStockCount > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-5 rounded-2xl flex items-start gap-4">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider mb-1">Low Warehouse Stocks alert</h4>
                    <p className="text-[11px] leading-relaxed text-yellow-500/80 font-medium">You have {stats.lowStockCount} items in catalog with quantity below 5. Replenish catalog items immediately.</p>
                  </div>
                </div>
              )}
              
              {stats.pendingOrdersCount > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-5 rounded-2xl flex items-start gap-4">
                  <span className="text-2xl">📦</span>
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider mb-1">Orders Fulfillment Pending</h4>
                    <p className="text-[11px] leading-relaxed text-blue-400/80 font-medium">You have {stats.pendingOrdersCount} orders waiting for shipment processing. Accept and dispatch airway bills within 24 hours.</p>
                  </div>
                </div>
              )}

              {stats.lowStockCount === 0 && stats.pendingOrdersCount === 0 && (
                <p className={`text-xs text-center py-20 border rounded-2xl ${cardBg} ${textSubtle}`}>No active warnings. System telemetry healthy.</p>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: HELP CENTER & FAQS ─── */}
        {activeTab === "help-center" && (
          <div className="space-y-8 animate-fade-in max-w-2xl">
            <div>
              <h2 className={`display text-3xl font-black mb-1 ${textTitle}`}>Merchant Help Desk</h2>
              <p className={`text-xs ${textSubtle}`}>Access documentation, FAQs, or create a ticket for administrative support.</p>
            </div>

            {/* FAQs Accordion */}
            <div className={`border rounded-2xl p-6 ${cardBg} space-y-4`}>
              <h4 className={`font-bold text-xs uppercase tracking-wider border-b border-white/5 pb-4 ${textTitle}`}>Frequently Asked Questions</h4>
              <div className="space-y-3 text-[11px] leading-relaxed">
                {[
                  { q: "How are payout commission splits calculated?", a: "Platform fees are deducted automatically from the gross value of non-refunded shipped orders based on the commission rate set by administrators." },
                  { q: "How do I update custom variant sizes?", a: "Go to Products, click edit, and input comma-separated size variables into the Sizes form field (e.g. S, M, L)." }
                ].map((faq, i) => (
                  <div key={i} className="space-y-1">
                    <strong className={`block ${textTitle}`}>Q: {faq.q}</strong>
                    <p className={textSubtle}>{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Create Help ticket form */}
            <div className={`border rounded-2xl p-6 shadow-xl ${cardBg} space-y-4`}>
              <h4 className={`font-bold text-xs uppercase tracking-wider border-b border-white/5 pb-4 ${textTitle}`}>Create Help Support Ticket</h4>
              <form onSubmit={handleHelpDeskSubmit} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className={`block text-[9px] tracking-widest uppercase mb-1.5 font-bold ${textSubtle}`}>Subject</label>
                  <input
                    type="text"
                    value={helpSubject}
                    onChange={e => setHelpSubject(e.target.value)}
                    placeholder="E.g. Bank Payout delay help"
                    className={`input-field w-full px-4 py-2.5 rounded-xl text-xs ${inputBg}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-[9px] tracking-widest uppercase mb-1.5 font-bold ${textSubtle}`}>Message / Complaint</label>
                  <textarea
                    value={helpMessage}
                    onChange={e => setHelpMessage(e.target.value)}
                    placeholder="Provide details about your query..."
                    rows={3}
                    className={`input-field w-full px-4 py-2.5 rounded-xl text-xs resize-none ${inputBg}`}
                    required
                  />
                </div>
                
                <button type="submit" className="btn-gold w-full py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-widest">
                  Submit ticket
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* ─── COURIER ASSIGNMENT & AIRWAY BILL LABEL GENERATOR MODAL ─── */}
      {selectedShipment && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4 slide-up text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <span className="font-bold text-sm uppercase tracking-wider gold flex items-center gap-1.5">
                🚀 Intelligent Routing & Fulfill Shipment Configurator
              </span>
              <button onClick={() => setSelectedShipment(null)} className="text-white/40 hover:text-white"><X size={16} /></button>
            </div>

            <form onSubmit={handleDispatchShipment} className="space-y-4 text-xs font-semibold">
              <div className="p-3.5 bg-yellow-500/[0.02] border border-yellow-500/10 rounded-xl space-y-1.5">
                <span className="text-[8px] uppercase tracking-widest text-[#d4af37] font-black block">Origin & Destination Matrix</span>
                <p className="text-white/80 font-bold text-[10.5px]">
                  Bhopal, Madhya Pradesh (Warehouse) → {selectedShipment.orders?.shipping_address?.city || 'Vidisha'}, {selectedShipment.orders?.shipping_address?.state || 'Madhya Pradesh'}
                </p>
                <p className="text-white/40 text-[9px]">
                  Fulfillment Node Route will be calculated dynamically based on Country access, road conditions, and urgency levels.
                </p>
              </div>

              {/* LEVEL 3: DELIVERY MODE SELECTION */}
              <div>
                <label className="block text-[9px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">1. Select Delivery Mode</label>
                <select
                  value={deliveryMode}
                  onChange={e => setDeliveryMode(e.target.value)}
                  className="input-field w-full px-4 py-2.5 rounded-xl bg-neutral-900 text-white border border-white/10 text-xs [&>option]:bg-neutral-900 [&>option]:text-white"
                >
                  <option value="hybrid">Hybrid (Optimized Multi-Stage Network - Recommended)</option>
                  <option value="air">Air Cargo (International / Premium SLA / Express)</option>
                  <option value="road">Road Surface (State / Local Carrier Fleet)</option>
                  <option value="rail">Rail Freight (Bulk Domestic Hub Logistics)</option>
                  <option value="water">Water Shipping (Ocean Container Marine Terminal)</option>
                </select>
              </div>

              {/* CONTRACTOR NETWORK SELECTION */}
              <div>
                <label className="block text-[9px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">2. Assign Logistics Contractor</label>
                <select
                  value={selectedContractorId}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedContractorId(val);
                    const matchVeh = vehiclesList.find(v => v.contractor_id === val);
                    if (matchVeh) setSelectedVehicleId(matchVeh.id);
                  }}
                  className="input-field w-full px-4 py-2.5 rounded-xl bg-neutral-900 text-white border border-white/10 text-xs [&>option]:bg-neutral-900 [&>option]:text-white"
                >
                  <option value="">Select a partner carrier...</option>
                  {contractorsList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} · Rating: ★{c.rating} · Price: {c.pricing}x ({c.country || 'Global Access'})
                    </option>
                  ))}
                </select>
              </div>

              {/* DRIVER / FLEET VEHICLE ALLOCATION */}
              <div>
                <label className="block text-[9px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">3. Allocate Fleet Driver & Vehicle Type</label>
                <select
                  value={selectedVehicleId}
                  onChange={e => setSelectedVehicleId(e.target.value)}
                  className="input-field w-full px-4 py-2.5 rounded-xl bg-neutral-900 text-white border border-white/10 text-xs [&>option]:bg-neutral-900 [&>option]:text-white"
                  disabled={!selectedContractorId}
                >
                  <option value="">Select an available driver...</option>
                  {vehiclesList
                    .filter(v => v.contractor_id === selectedContractorId)
                    .map(v => (
                      <option key={v.id} value={v.id}>
                        {v.driver_name} · {v.type} ({v.vehicle_id}) · Cap: {v.capacity} · Status: {v.status}
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3 bg-black/45 border border-white/5 rounded-xl text-[10px] text-white/45">
                Executing the routing engine will automatically assign the sequence, generate a secure airway bill tracking code, and send the handoff verification OTP to the customer.
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setSelectedShipment(null)} className="btn-outline flex-1 py-3 rounded-xl text-[10px] font-bold uppercase">
                  Cancel
                </button>
                <button type="submit" disabled={loadingLogistics} className="btn-gold flex-1 py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-widest">
                  {loadingLogistics ? 'Routing Cargo...' : '⚡ Dispatch Shipment'}
                </button>
              </div>
            </form>
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
                placeholder="Jump to sections... (Esc to close)"
                className="w-full bg-transparent pl-8 pr-4 text-sm text-white focus:outline-none placeholder-white/20"
                autoFocus
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto p-2">
              {commandFilteredItems.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-4">No matching actions found.</p>
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
              <span>Spotlight Launcher</span>
              <span>Use arrows & Enter</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
