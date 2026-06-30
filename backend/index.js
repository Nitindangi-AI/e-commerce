const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const errorHandler = require("./src/middleware/errorHandler");
const { authLimiter, apiLimiter } = require("./middleware/rateLimiter");
const sanitize = require("./middleware/sanitize");

// Load env vars
dotenv.config();

// ── Production environment validation — fail-fast on missing secrets ──
function validateEnvironment() {
  if (process.env.NODE_ENV !== "production") return;

  const required = [
    "DATABASE_URL",
    "JWT_SECRET",
    "INSFORGE_SERVICE_ROLE_KEY",
    "INSFORGE_ANON_KEY",
    "CLIENT_URL",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
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

// ── Body parser (bypassing raw webhook route for signature verification) ──
app.use((req, res, next) => {
  if (req.originalUrl === "/api/v1/payments/webhook") {
    return next();
  }
  express.json({ limit: "10mb" })(req, res, next);
});
app.use(express.urlencoded({ extended: true }));

// ── Cookie parser ──
app.use(cookieParser());

// ── Input sanitization (XSS + NoSQL injection) ──
app.use(sanitize);

// ── CORS — locked to the exact Vercel production domain via CLIENT_URL ──
// Never use origin: '*'; credentials require an explicit, single origin.
const corsOrigin = process.env.CLIENT_URL;
if (!corsOrigin && process.env.NODE_ENV === "production") {
  console.error("❌ STARTUP FAILED — CLIENT_URL is not set. CORS cannot be configured safely.");
  process.exit(1);
}
app.use(
  cors({
    origin: corsOrigin || "http://localhost:5173",
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

// ── Mount routes under v1Router ──
app.use("/api/v1", require("./src/routes/v1"));

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// ── Global error handler ──
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Trendy Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 API: http://localhost:${PORT}/api/v1\n`);
  });
};

startServer();
