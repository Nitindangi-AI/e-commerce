const express = require("express");
const router = express.Router();
const {
  getStates,
  getCitiesByState,
  getAreasByCity,
  validatePincode,
  checkDeliveryAvailability,
  getAllPincodes,
  addPincode,
  updatePincode,
  deletePincode,
  bulkUploadPincodes,
} = require("../controllers/locationController");
const { protect, authorize } = require("../../middleware/auth");

// Public routes
router.get("/states", getStates);
router.get("/cities", getCitiesByState);
router.get("/areas", getAreasByCity);
router.get("/pincode/:pincode", validatePincode);
router.get("/availability/:pincode", checkDeliveryAvailability);

// Admin routes
router.get("/admin/pincodes", protect, authorize("admin"), getAllPincodes);
router.post("/admin/pincodes", protect, authorize("admin"), addPincode);
router.put("/admin/pincodes/:id", protect, authorize("admin"), updatePincode);
router.delete("/admin/pincodes/:id", protect, authorize("admin"), deletePincode);
router.post("/admin/pincodes/bulk", protect, authorize("admin"), bulkUploadPincodes);

module.exports = router;
