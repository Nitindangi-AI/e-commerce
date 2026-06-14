const { createClient } = require("@insforge/sdk");
const db = require("../config/db");

// ── InsForge client factory ──────────────────────────────────────────────
// Each request gets the user's Bearer token injected via setAccessToken(),
// so we create a single shared client instance and swap the token per-request.
// This avoids creating a new SDK client on every HTTP request.
let _insforge = null;

function getInsforgeClient() {
  if (!_insforge) {
    _insforge = createClient({
      baseUrl: process.env.INSFORGE_URL,
      anonKey: process.env.INSFORGE_ANON_KEY,
      isServerMode: true,
    });
  }
  return _insforge;
}

// ── Helper: resolve user profile from InsForge token ─────────────────────
// 1. Sets the Bearer token on the SDK client
// 2. Calls auth.getCurrentUser() to validate the token server-side
// 3. Fetches the user's profile row from the profiles table
// Returns { user, profile } on success or { error, status } on failure
async function resolveUserFromToken(token) {
  const client = getInsforgeClient();

  // Inject the user's access token so the SDK sends it as Authorization header
  client.setAccessToken(token);

  try {
    const { data: authData, error: authError } = await client.auth.getCurrentUser();

    // Clear the token immediately after use so the shared client doesn't leak it
    client.setAccessToken(null);

    if (authError || !authData?.user) {
      return { error: "Invalid or expired token. Please log in again.", status: 401 };
    }

    const userId = authData.user.id;

    // Fetch profile from PostgreSQL profiles table
    const profileRes = await db.query(
      "SELECT * FROM profiles WHERE id = $1",
      [userId]
    );

    if (profileRes.rows.length === 0) {
      return { error: "User profile not found", status: 403 };
    }

    const profile = profileRes.rows[0];

    // Check if account is active (banned users are blocked)
    if (profile.status && profile.status !== "active") {
      return { error: "Account is not active", status: 403 };
    }

    return {
      user: {
        id: profile.id,
        _id: profile.id, // backward compat alias used by some controllers
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      },
      profile,
    };
  } catch (err) {
    // Ensure token is cleared even on unexpected errors
    client.setAccessToken(null);
    console.error("Auth middleware error:", err.message);
    return { error: "Authentication failed. Please log in again.", status: 401 };
  }
}

// ── Middleware: verifyToken (required auth) ──────────────────────────────
const verifyToken = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required", message: "Authentication required" });
  }

  const result = await resolveUserFromToken(token);

  if (result.error) {
    return res.status(result.status).json({ error: result.error, message: result.error });
  }

  req.user = result.user;

  // Enforce server-side role-based access control
  const originalUrl = req.originalUrl || "";
  const role = req.user.role;

  if (role === 'admin') {
    return next();
  }

  if (role === 'customer') {
    if (originalUrl.startsWith('/api/vendor') || originalUrl.startsWith('/api/admin')) {
      return res.status(403).json({ error: "Unauthorized role access", message: "Customer is not authorized to access this resource" });
    }
    return next();
  }

  if (role === 'vendor') {
    const isProfileOrLogout = 
      originalUrl.includes('/auth/profile') || 
      originalUrl.includes('/auth/logout') || 
      originalUrl.includes('/auth/me');

    if (originalUrl.startsWith('/api/vendor') || isProfileOrLogout) {
      return next();
    }

    return res.status(403).json({ error: "Unauthorized role access", message: "Vendor is not authorized to access this resource" });
  }

  return res.status(403).json({ error: "Unauthorized role access", message: "Role is not authorized to access this resource" });
};

// ── Middleware: requireAdmin ─────────────────────────────────────────────
const requireAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required", message: "Admin access required" });
  }
  next();
};

// ── Middleware: requireVendor ────────────────────────────────────────────
const requireVendor = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required", message: "Authentication required" });

  if (req.user.role === 'admin') {
    return next(); // admin gets full access
  }

  try {
    const vendorRes = await db.query("SELECT * FROM vendors WHERE user_id = $1", [req.user.id]);
    if (vendorRes.rows.length === 0 || vendorRes.rows[0].status !== "approved") {
      return res.status(403).json({ error: "Approved vendor account required", message: "Approved vendor account required" });
    }
    req.vendor = vendorRes.rows[0];
    next();
  } catch (error) {
    return res.status(500).json({ error: error.message, message: error.message });
  }
};

// ── Middleware: optionalAuth (non-blocking auth) ─────────────────────────
const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  const result = await resolveUserFromToken(token);

  if (result.error) {
    // Optional auth never blocks — just set user to null
    req.user = null;
    return next();
  }

  req.user = result.user;
  next();
};

// ── Aliases for backward compatibility ───────────────────────────────────
const protect = verifyToken;

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const msg = `Role '${req.user?.role || ""}' is not authorized to access this resource`;
      return res.status(403).json({
        error: msg,
        message: msg
      });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  requireAdmin,
  requireVendor,
  optionalAuth,
  protect,
  authorize,
};

