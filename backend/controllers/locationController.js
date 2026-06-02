const asyncHandler = require("express-async-handler");
const State = require("../models/State");
const City = require("../models/City");
const Area = require("../models/Area");
const ServiceablePincode = require("../models/ServiceablePincode");

// @desc    Get all active states
// @route   GET /api/v1/locations/states
// @access  Public
exports.getStates = asyncHandler(async (req, res) => {
  const states = await State.find({ isActive: true }).sort({ name: 1 });
  res.status(200).json({ success: true, states });
});

// @desc    Get cities by state
// @route   GET /api/v1/locations/cities?state=stateId
// @access  Public
exports.getCitiesByState = asyncHandler(async (req, res) => {
  const { state } = req.query;
  if (!state) {
    return res.status(400).json({ success: false, message: "State ID is required" });
  }
  const cities = await City.find({ state, isActive: true }).sort({ name: 1 });
  res.status(200).json({ success: true, cities });
});

// @desc    Get areas by city
// @route   GET /api/v1/locations/areas?city=cityId
// @access  Public
exports.getAreasByCity = asyncHandler(async (req, res) => {
  const { city } = req.query;
  if (!city) {
    return res.status(400).json({ success: false, message: "City ID is required" });
  }
  const areas = await Area.find({ city }).sort({ name: 1 });
  res.status(200).json({ success: true, areas });
});

// @desc    Validate pincode and get location details
// @route   GET /api/v1/locations/pincode/:pincode
// @access  Public
exports.validatePincode = asyncHandler(async (req, res) => {
  const { pincode } = req.params;
  
  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ success: false, message: "Invalid pincode format" });
  }

  const serviceable = await ServiceablePincode.findOne({ pincode });
  
  if (!serviceable) {
    return res.status(404).json({ success: false, message: "Invalid pincode or delivery unavailable" });
  }

  // Fetch areas for this pincode
  const areas = await Area.find({ pincode }).sort({ name: 1 });

  res.status(200).json({
    success: true,
    location: {
      pincode: serviceable.pincode,
      state: serviceable.stateName,
      district: serviceable.districtName,
      city: serviceable.cityName,
      areas: areas.map(a => a.name),
      isServiceable: serviceable.isServiceable,
      estimatedDays: serviceable.estimatedDays,
      codAvailable: serviceable.codAvailable,
    }
  });
});

// @desc    Check delivery availability
// @route   GET /api/v1/locations/availability/:pincode
// @access  Public
exports.checkDeliveryAvailability = asyncHandler(async (req, res) => {
  const { pincode } = req.params;
  
  const serviceable = await ServiceablePincode.findOne({ pincode });
  
  if (!serviceable || !serviceable.isServiceable) {
    return res.status(200).json({
      success: true,
      available: false,
      message: "Delivery is currently unavailable for this location."
    });
  }

  res.status(200).json({
    success: true,
    available: true,
    estimatedDays: serviceable.estimatedDays,
    codAvailable: serviceable.codAvailable,
  });
});
