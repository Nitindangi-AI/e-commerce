const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const connectDatabase = require("./config/database");
const errorHandler = require("./middleware/errorHandler");
const { authLimiter, apiLimiter } = require("./middleware/rateLimiter");
const sanitize = require("./middleware/sanitize");

// Load env vars
dotenv.config();

// ── Production environment validation — fail-fast on missing secrets ──
function validateEnvironment() {
  if (process.env.NODE_ENV !== "production") return;

  const required = [
    "DATABASE_URL",
    "MONGO_URI",
    "JWT_SECRET",
    "INSFORGE_SERVICE_ROLE_KEY",
    "INSFORGE_ANON_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ STARTUP FAILED — Missing required environment variables:");
    missing.forEach((key) => console.error(`   • ${key} is not set`));
    console.error("Set the above variables and restart the server.");
    process.exit(1);
  }

  console.log("✅ Production environment validation passed.");
}

validateEnvironment();


const app = express();

// ── Security headers ──
app.use(helmet());

// ── Body parser ──
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Cookie parser ──
app.use(cookieParser());

// ── Input sanitization (XSS + NoSQL injection) ──
app.use(sanitize);

// ── CORS — read allowed origin from env, not hardcoded ──
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// ── HTTP request logger (dev only) ──
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ── Global API rate limiter ──
app.use("/api", apiLimiter);

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0', service: 'trendy-backend' });
});

// Legacy health check (keep backward-compatible)
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Trendy API is running",
    timestamp: new Date().toISOString(),
  });
});

// ── Mount routes ──
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/vendor", require("./routes/vendorRoutes"));
app.use("/api/vendor", require("./routes/vendor.auth"));
app.use("/api/v1/products", require("./routes/productRoutes"));
app.use("/api/v1/orders", require("./routes/orderRoutes"));
app.use("/api/v1/reviews", require("./routes/reviewRoutes"));
app.use("/api/v1/wishlist", require("./routes/wishlistRoutes"));
app.use("/api/v1/addresses", require("./routes/addressRoutes"));
app.use("/api/v1/coupons", require("./routes/couponRoutes"));
app.use("/api/v1/payment", require("./routes/paymentRoutes"));
app.use("/api/v1/locations", require("./routes/locationRoutes"));

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// ── Global error handler ──
app.use(errorHandler);

// Auto-seed: populate DB if empty (for in-memory / fresh installs)
async function autoSeed() {
  const User = require("./models/User");
  const count = await User.countDocuments();
  if (count === 0) {
    console.log("📦 Database empty — auto-seeding users and configurations...");
    const Coupon = require("./models/Coupon");

    const users = [
      { firstName: "Admin", lastName: "TRENDY", email: "admin@trendy.com", password: "admin123", role: "admin", phone: "9999900000", paymentAccount: { upiId: "trendyadmin@upi", bankName: "HDFC Bank", accountHolder: "TRENDY Pvt Ltd", accountNumber: "XXXX1234", ifscCode: "HDFC0001234" } },
      { firstName: "Alex", lastName: "Rivera", email: "alex@trendy.com", password: "test1234", role: "customer", phone: "9876543210" },
    ];

    const coupons = [
      { code: "TRENDY10", discount: 10, type: "percent", minOrder: 5000, description: "10% off on orders above ₹5,000" },
      { code: "FIRST500", discount: 500, type: "flat", minOrder: 2000, description: "₹500 off on your first order" },
      { code: "TRENDY20", discount: 20, type: "percent", minOrder: 15000, description: "20% off on orders above ₹15,000", maxDiscount: 5000 },
    ];

    const createdUsers = await User.create(users);
    const normalUser = createdUsers.find(u => u.role === "customer");

    // Seed location data
    const state = await require("./models/State").create({ name: "Maharashtra" });
    const city = await require("./models/City").create({ name: "Mumbai", state: state._id, district: "Mumbai Suburban" });
    await require("./models/Area").create([
      { name: "Andheri West", city: city._id, pincode: "400058" },
      { name: "Versova", city: city._id, pincode: "400058" },
      { name: "Bandra West", city: city._id, pincode: "400050" }
    ]);
    
    await require("./models/ServiceablePincode").create([
      { pincode: "400058", stateName: "Maharashtra", districtName: "Mumbai Suburban", cityName: "Mumbai", isServiceable: true, estimatedDays: 2, codAvailable: true },
      { pincode: "400050", stateName: "Maharashtra", districtName: "Mumbai Suburban", cityName: "Mumbai", isServiceable: true, estimatedDays: 3, codAvailable: false }
    ]);

    await require("./models/Address").create({
      user: normalUser._id,
      label: "Home",
      name: "Alex Rivera",
      phone: "9876543210",
      country: "India",
      state: "Maharashtra",
      district: "Mumbai Suburban",
      city: "Mumbai",
      area: "Andheri West",
      pincode: "400058",
      line1: "42, Park Street",
      isDefault: true
    });

    await Coupon.create(coupons);

    console.log("✅ Auto-seeded: 2 users, 3 coupons");
    console.log("📧 Admin: admin@trendy.com / admin123");
    console.log("📧 User:  alex@trendy.com / test1234");
  } else {
    console.log("ℹ️  Database already contains user records, skipping auto-seed.");
  }
}

const PORT = process.env.PORT || 5000;

// Start server after DB connection
const startServer = async () => {
  await connectDatabase();

  if (process.env.ENABLE_SEEDING === "true") {
    await autoSeed();
  } else {
    console.log("ℹ️  Database seeding is disabled (set ENABLE_SEEDING=true to seed).");
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Trendy Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 API: http://localhost:${PORT}/api/v1\n`);
  });
};

startServer();
