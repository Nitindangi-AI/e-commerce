/**
 * securityGuards.js
 * -----------------
 * Centralised security middleware for Trendy backend.
 *
 * POLICIES:
 *  1. PROFILE_IMMUTABLE_FIELDS  — Never allowed in a user profile update.
 *  2. VENDOR_IMMUTABLE_FIELDS   — Never allowed in a vendor store update.
 *  3. ORDER_STATUS_ALLOWLIST    — Only these exact strings are accepted by updateOrderStatus.
 *  4. requireOrderOwnership     — Ensures the caller owns the order (or is admin).
 *  5. requireShipmentOwnership  — Ensures the caller owns the shipment's order (or is admin/vendor).
 */

const db = require("../config/db");
const { NotFoundError, ForbiddenError, BadRequestError } = require("./errors");

// ── 1. Fields a user is NEVER allowed to write to their own profile ────────────
const PROFILE_IMMUTABLE_FIELDS = new Set([
  "role",
  "permissions",
  "status",          // active / banned — only admin
  "loyalty_points",  // only awarded by order system
  "total_orders",    // computed by system
  "total_spent",     // computed by system
  "referral_code",   // generated at creation
  "id",
  "email",           // managed by auth layer
  "created_at",
  "updated_at",
]);

/**
 * stripProfilePrivilegedFields
 * Removes any field from req.body that a normal user must never be able to set.
 * Applied to PATCH /api/v1/profile (or any route that writes to profiles).
 */
const stripProfilePrivilegedFields = (req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    for (const field of PROFILE_IMMUTABLE_FIELDS) {
      if (field in req.body) {
        delete req.body[field];
      }
    }
  }
  next();
};

// ── 2. Fields a vendor is NEVER allowed to write to their own vendor record ───
const VENDOR_IMMUTABLE_FIELDS = new Set([
  "status",           // only admin approve/reject
  "commission_rate",  // only admin sets this
  "commission_percent",
  "approved_at",
  "approved_by",
  "rejection_reason",
  "user_id",          // identity — never changes
  "id",
  "created_at",
  // Financial identity fields — once submitted they can only be changed by reapplying
  "pan_card",
  "gst_number",
  "bank_account",
  "aadhar_number",
  "ifsc_code",
]);

/**
 * stripVendorPrivilegedFields
 * Removes protected fields from vendor store-profile update body.
 * Applied to PATCH /api/v1/vendor/store.
 */
const stripVendorPrivilegedFields = (req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    for (const field of VENDOR_IMMUTABLE_FIELDS) {
      if (field in req.body) {
        delete req.body[field];
      }
    }
  }
  next();
};

// ── 3. Order status allowlist ──────────────────────────────────────────────────
const ORDER_STATUS_ALLOWLIST = new Set([
  "Confirmed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
]);

/**
 * validateOrderStatus
 * Rejects any status value not in the allowlist.
 * Applied to PUT /api/v1/orders/:id/status.
 */
const validateOrderStatus = (req, res, next) => {
  const { status } = req.body;
  if (!status || !ORDER_STATUS_ALLOWLIST.has(status)) {
    return next(new BadRequestError(`Invalid order status. Allowed values: ${[...ORDER_STATUS_ALLOWLIST].join(", ")}`));
  }
  next();
};

// ── 4. Order ownership enforcement ────────────────────────────────────────────
/**
 * requireOrderOwnership
 * Fetches the order and verifies the caller is the owner or an admin.
 * Attaches order to req.order for downstream controllers.
 * Applied to any order-specific action a customer can trigger.
 */
const requireOrderOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query("SELECT * FROM orders WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return next(new NotFoundError("Order not found"));
    }
    const order = result.rows[0];

    if (
      order.user_id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return next(new ForbiddenError("Not authorized to access this order"));
    }

    req.order = order; // attach for downstream use
    next();
  } catch (err) {
    next(err);
  }
};

// ── 5. Shipment ownership enforcement ─────────────────────────────────────────
/**
 * requireShipmentOwnership
 * Fetches the shipment, then its parent order, and verifies:
 *   - caller is the order owner (customer), OR
 *   - caller is a vendor who sold at least one item in the order, OR
 *   - caller is admin
 * Applied to GET /:id/shipment and POST /:id/slot.
 */
const requireShipmentOwnership = async (req, res, next) => {
  try {
    const orderId = req.params.id; // routes use order id for shipment lookup

    // Fetch order to verify ownership
    const orderRes = await db.query("SELECT * FROM orders WHERE id = $1", [orderId]);
    if (orderRes.rows.length === 0) {
      return next(new NotFoundError("Order not found"));
    }
    const order = orderRes.rows[0];
    const callerId = req.user._id.toString();
    const callerRole = req.user.role;

    if (callerRole === "admin") return next();

    // Customer — must own the order
    if (callerRole === "customer") {
      if (order.user_id.toString() !== callerId) {
        return next(new ForbiddenError("Not authorized to access this shipment"));
      }
      req.order = order;
      return next();
    }

    // Vendor — must have at least one item in the order
    if (callerRole === "vendor") {
      const itemCheck = await db.query(
        "SELECT id FROM order_items WHERE order_id = $1 AND seller_id = $2 LIMIT 1",
        [orderId, callerId]
      );
      if (itemCheck.rows.length === 0) {
        return next(new ForbiddenError("Not authorized to access this shipment"));
      }
      req.order = order;
      return next();
    }

    return next(new ForbiddenError("Unauthorized"));
  } catch (err) {
    next(err);
  }
};

// ── 6. Delivery slot ownership enforcement ────────────────────────────────────
/**
 * requireDeliverySlotAccess
 * Only admin may create delivery slots (scheduling).
 * Customers may only read their own order's slots.
 */
const requireDeliverySlotAccess = async (req, res, next) => {
  try {
    if (req.user.role === "admin") return next();

    const orderId = req.params.id;
    const orderRes = await db.query("SELECT user_id FROM orders WHERE id = $1", [orderId]);
    if (orderRes.rows.length === 0) {
      return next(new NotFoundError("Order not found"));
    }

    if (orderRes.rows[0].user_id.toString() !== req.user._id.toString()) {
      return next(new ForbiddenError("Not authorized to access delivery slots for this order"));
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  stripProfilePrivilegedFields,
  stripVendorPrivilegedFields,
  validateOrderStatus,
  requireOrderOwnership,
  requireShipmentOwnership,
  requireDeliverySlotAccess,
};
