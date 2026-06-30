const express = require("express");
const router = express.Router();
const {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require("../controllers/addressController");
const { protect } = require("../../middleware/auth");
const {
  validateAddress,
  validateAddressUpdate,
} = require("../../middleware/validate");

router.get("/", protect, getAddresses);
router.post("/", protect, validateAddress, addAddress);
router.put("/:id", protect, validateAddressUpdate, updateAddress);
router.delete("/:id", protect, deleteAddress);
router.put("/:id/default", protect, setDefaultAddress);

module.exports = router;
