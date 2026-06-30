const asyncHandler = require("express-async-handler");
const addressService = require("../services/addressService");

exports.getAddresses = asyncHandler(async (req, res) => {
  const addresses = await addressService.getAddresses(req.user.id);
  res.status(200).json({ success: true, addresses });
});

exports.addAddress = asyncHandler(async (req, res) => {
  const addresses = await addressService.addAddress(req.user.id, req.body);
  res.status(201).json({ success: true, addresses });
});

exports.updateAddress = asyncHandler(async (req, res) => {
  const addresses = await addressService.updateAddress(req.params.id, req.user.id, req.body);
  res.status(200).json({ success: true, addresses });
});

exports.deleteAddress = asyncHandler(async (req, res) => {
  const addresses = await addressService.deleteAddress(req.params.id, req.user.id);
  res.status(200).json({ success: true, addresses });
});

exports.setDefaultAddress = asyncHandler(async (req, res) => {
  const addresses = await addressService.setDefaultAddress(req.params.id, req.user.id);
  res.status(200).json({ success: true, addresses });
});
