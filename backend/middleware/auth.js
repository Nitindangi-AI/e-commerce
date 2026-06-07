const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../config/db");

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
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    
    // Hash token
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Check user_sessions table: is_active = true AND expires_at > now()
    const sessionRes = await db.query(
      "SELECT * FROM user_sessions WHERE token_hash = $1 AND is_active = true AND expires_at > now()",
      [tokenHash]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }

    // UPDATE user_sessions last_active_at
    await db.query(
      "UPDATE user_sessions SET last_active_at = now() WHERE token_hash = $1",
      [tokenHash]
    );

    // Fetch profile
    const profileRes = await db.query(
      "SELECT * FROM profiles WHERE id = $1",
      [decoded.id]
    );

    if (profileRes.rows.length === 0 || profileRes.rows[0].status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    const profile = profileRes.rows[0];

    req.user = {
      id: profile.id,
      email: profile.email,
      phone: profile.phone,
      role: profile.role,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
};

const requireAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const requireVendor = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  
  try {
    const vendorRes = await db.query('SELECT * FROM vendors WHERE user_id = $1', [req.user.id]);
    if (vendorRes.rows.length === 0 || vendorRes.rows[0].status !== 'approved') {
      return res.status(403).json({ error: 'Approved vendor account required' });
    }
    req.vendor = vendorRes.rows[0];
    next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

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

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const sessionRes = await db.query(
      "SELECT * FROM user_sessions WHERE token_hash = $1 AND is_active = true AND expires_at > now()",
      [tokenHash]
    );

    if (sessionRes.rows.length === 0) {
      req.user = null;
      return next();
    }

    const profileRes = await db.query(
      "SELECT * FROM profiles WHERE id = $1",
      [decoded.id]
    );

    if (profileRes.rows.length === 0 || profileRes.rows[0].status !== 'active') {
      req.user = null;
      return next();
    }

    const profile = profileRes.rows[0];
    req.user = {
      id: profile.id,
      email: profile.email,
      phone: profile.phone,
      role: profile.role,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url
    };

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// Aliases for backward compatibility
const protect = verifyToken;

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Role '${req.user?.role || ""}' is not authorized to access this resource`
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
  authorize
};
