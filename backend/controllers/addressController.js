const asyncHandler = require("express-async-handler");
const Address = require("../models/Address");
const ServiceablePincode = require("../models/ServiceablePincode");
const Area = require("../models/Area");

exports.getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id });
  res.status(200).json({ success: true, addresses });
});

exports.addAddress = asyncHandler(async (req, res) => {
  const { label, name, phone, country, state, district, city, area, landmark, pincode, line1, isDefault } = req.body;

  // Strict Validation: Pincode must be serviceable
  const serviceablePincode = await ServiceablePincode.findOne({ pincode });
  if (!serviceablePincode) {
    return res.status(400).json({ success: false, message: "Delivery is currently unavailable for this pincode." });
  }

  if (!serviceablePincode.isServiceable) {
    return res.status(400).json({ success: false, message: "Delivery is currently unavailable for this location." });
  }

  // Strict Validation: Ensure State, District, City match the Pincode
  if (state !== serviceablePincode.stateName) {
    return res.status(400).json({ success: false, message: `Selected state does not match the pincode. Expected: ${serviceablePincode.stateName}` });
  }
  if (district !== serviceablePincode.districtName) {
    return res.status(400).json({ success: false, message: `Selected district does not match the pincode. Expected: ${serviceablePincode.districtName}` });
  }
  if (city !== serviceablePincode.cityName) {
    return res.status(400).json({ success: false, message: `Selected city does not match the pincode. Expected: ${serviceablePincode.cityName}` });
  }

  // Strict Validation: Ensure Area belongs to the Pincode
  const areaExists = await Area.findOne({ name: area, pincode });
  if (!areaExists) {
    return res.status(400).json({ success: false, message: `Selected area does not belong to the pincode ${pincode}.` });
  }

  // Check if duplicate address exists for the user to prevent spam
  const existingAddress = await Address.findOne({
    user: req.user._id,
    name,
    phone,
    line1,
    pincode,
  });

  if (existingAddress) {
    return res.status(400).json({ success: false, message: "This address is already registered in your account." });
  }

  // Handle Default Address Logic
  const existingAddressesCount = await Address.countDocuments({ user: req.user._id });
  let newIsDefault = isDefault;

  if (existingAddressesCount === 0) {
    newIsDefault = true;
  } else if (newIsDefault) {
    await Address.updateMany({ user: req.user._id }, { $set: { isDefault: false } });
  }

  const newAddress = await Address.create({
    user: req.user._id,
    label,
    name,
    phone,
    country,
    state,
    district,
    city,
    area,
    landmark,
    pincode,
    line1,
    isDefault: newIsDefault,
  });

  const addresses = await Address.find({ user: req.user._id });
  res.status(201).json({ success: true, addresses });
});

exports.updateAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) return res.status(404).json({ success: false, message: "Address not found" });

  const { label, name, phone, country, state, district, city, area, landmark, pincode, line1, isDefault } = req.body;

  // Strict Validation if pincode or location changes
  if (pincode || state || district || city || area) {
    const checkPincode = pincode || address.pincode;
    const serviceablePincode = await ServiceablePincode.findOne({ pincode: checkPincode });
    if (!serviceablePincode) {
      return res.status(400).json({ success: false, message: "Delivery is currently unavailable for this pincode." });
    }
    if (!serviceablePincode.isServiceable) {
      return res.status(400).json({ success: false, message: "Delivery is currently unavailable for this location." });
    }

    const checkState = state || address.state;
    const checkDistrict = district || address.district;
    const checkCity = city || address.city;
    const checkArea = area || address.area;

    if (checkState !== serviceablePincode.stateName) {
      return res.status(400).json({ success: false, message: `Selected state does not match the pincode. Expected: ${serviceablePincode.stateName}` });
    }
    if (checkDistrict !== serviceablePincode.districtName) {
      return res.status(400).json({ success: false, message: `Selected district does not match the pincode. Expected: ${serviceablePincode.districtName}` });
    }
    if (checkCity !== serviceablePincode.cityName) {
      return res.status(400).json({ success: false, message: `Selected city does not match the pincode. Expected: ${serviceablePincode.cityName}` });
    }

    const areaExists = await Area.findOne({ name: checkArea, pincode: checkPincode });
    if (!areaExists) {
      return res.status(400).json({ success: false, message: `Selected area does not belong to the pincode ${checkPincode}.` });
    }
  }

  if (isDefault) {
    await Address.updateMany({ user: req.user._id }, { $set: { isDefault: false } });
  }

  address.label = label || address.label;
  address.name = name || address.name;
  address.phone = phone || address.phone;
  address.country = country || address.country;
  address.state = state || address.state;
  address.district = district || address.district;
  address.city = city || address.city;
  address.area = area || address.area;
  address.landmark = landmark !== undefined ? landmark : address.landmark;
  address.pincode = pincode || address.pincode;
  address.line1 = line1 || address.line1;
  if (isDefault !== undefined) address.isDefault = isDefault;

  await address.save();

  const addresses = await Address.find({ user: req.user._id });
  res.status(200).json({ success: true, addresses });
});

exports.deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) return res.status(404).json({ success: false, message: "Address not found" });

  const wasDefault = address.isDefault;
  await address.remove();

  if (wasDefault) {
    const remainingAddress = await Address.findOne({ user: req.user._id });
    if (remainingAddress) {
      remainingAddress.isDefault = true;
      await remainingAddress.save();
    }
  }

  const addresses = await Address.find({ user: req.user._id });
  res.status(200).json({ success: true, addresses });
});

exports.setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) return res.status(404).json({ success: false, message: "Address not found" });

  await Address.updateMany({ user: req.user._id }, { $set: { isDefault: false } });
  
  address.isDefault = true;
  await address.save();

  const addresses = await Address.find({ user: req.user._id });
  res.status(200).json({ success: true, addresses });
});
