const express = require("express");
const router = express.Router();
const {
  updateMyProfile,
  getMyProfile,
  getPublicVendorProfile,
} = require("../controllers/profileController");
const { protect } = require("../../middleware/auth");
const { stripProfilePrivilegedFields } = require("../../middleware/securityGuards");

// Private — authenticated user's own profile
router.get("/me", protect, getMyProfile);

// PATCH /api/v1/profile
router.patch("/", protect, stripProfilePrivilegedFields, updateMyProfile);

// Public — PII-stripped vendor storefront
router.get("/vendor/:vendorId", getPublicVendorProfile);

module.exports = router;
