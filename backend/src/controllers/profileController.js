const asyncHandler = require("express-async-handler");
const profileService = require("../services/profileService");

exports.getMyProfile = asyncHandler(async (req, res) => {
  const profile = await profileService.getMyProfile(req.user._id.toString());
  res.status(200).json({ success: true, profile });
});

exports.updateMyProfile = asyncHandler(async (req, res) => {
  const profile = await profileService.updateMyProfile(req.user._id.toString(), req.body);
  res.status(200).json({ success: true, profile });
});

exports.getPublicVendorProfile = asyncHandler(async (req, res) => {
  const vendor = await profileService.getPublicVendorProfile(req.params.vendorId);
  res.status(200).json({ success: true, vendor });
});
