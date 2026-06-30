const asyncHandler = require("express-async-handler");
const locationService = require("../services/locationService");

// Public endpoints
exports.getStates = asyncHandler(async (req, res) => {
  const states = await locationService.getStates();
  res.status(200).json({ success: true, states });
});

exports.getCitiesByState = asyncHandler(async (req, res) => {
  const cities = await locationService.getCitiesByState(req.query.state);
  res.status(200).json({ success: true, cities });
});

exports.getAreasByCity = asyncHandler(async (req, res) => {
  const areas = await locationService.getAreasByCity(req.query.city);
  res.status(200).json({ success: true, areas });
});

exports.validatePincode = asyncHandler(async (req, res) => {
  const location = await locationService.validatePincode(req.params.pincode);
  res.status(200).json({ success: true, location });
});

exports.checkDeliveryAvailability = asyncHandler(async (req, res) => {
  const availability = await locationService.checkDeliveryAvailability(req.params.pincode);
  res.status(200).json({ success: true, ...availability });
});

// Admin endpoints
exports.getAllPincodes = asyncHandler(async (req, res) => {
  const pincodes = await locationService.getAllPincodes();
  res.status(200).json({ success: true, count: pincodes.length, pincodes });
});

exports.addPincode = asyncHandler(async (req, res) => {
  const pincode = await locationService.addPincode(req.body);
  res.status(201).json({ success: true, pincode });
});

exports.updatePincode = asyncHandler(async (req, res) => {
  const pincode = await locationService.updatePincode(req.params.id, req.body);
  res.status(200).json({ success: true, pincode });
});

exports.deletePincode = asyncHandler(async (req, res) => {
  const data = await locationService.deletePincode(req.params.id);
  res.status(200).json({ success: true, data });
});

exports.bulkUploadPincodes = asyncHandler(async (req, res) => {
  const message = await locationService.bulkUploadPincodes();
  res.status(200).json({ success: true, message });
});
