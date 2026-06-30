const addressRepository = require("../repositories/addressRepository");
const { NotFoundError, BadRequestError } = require("../middleware/errors");

const normalizeAddress = (addr) => {
  if (!addr) return null;
  return {
    _id: addr.id,
    id: addr.id,
    user: addr.user_id,
    label: addr.label,
    name: addr.name,
    phone: addr.phone,
    country: addr.country,
    state: addr.state,
    district: addr.district,
    city: addr.city,
    area: addr.area,
    landmark: addr.landmark,
    pincode: addr.pincode,
    line1: addr.line1,
    isDefault: addr.is_default,
    createdAt: addr.created_at,
    updatedAt: addr.updated_at
  };
};

exports.getAddresses = async (userId) => {
  const rows = await addressRepository.findAllByUserId(userId);
  return rows.map(normalizeAddress);
};

exports.addAddress = async (userId, addressData) => {
  const { label, name, phone, country, state, district, city, area, landmark, pincode, line1, isDefault } = addressData;

  const dup = await addressRepository.findDuplicate(userId, name, phone, line1, pincode);
  if (dup) {
    throw new BadRequestError("This address is already registered in your account.");
  }

  const count = await addressRepository.countByUserId(userId);
  let newIsDefault = isDefault;

  if (count === 0) {
    newIsDefault = true;
  } else if (newIsDefault) {
    await addressRepository.unsetDefaultsForUser(userId);
  }

  await addressRepository.create({
    userId,
    label: label || "Home",
    name,
    phone,
    country: country || "India",
    state,
    district: district || "",
    city,
    area: area || "",
    landmark: landmark || "",
    pincode,
    line1,
    isDefault: newIsDefault || false
  });

  return exports.getAddresses(userId);
};

exports.updateAddress = async (addressId, userId, updateData) => {
  const existing = await addressRepository.findByIdAndUserId(addressId, userId);
  if (!existing) {
    throw new NotFoundError("Address not found");
  }

  const { label, name, phone, country, state, district, city, area, landmark, pincode, line1, isDefault } = updateData;

  let newIsDefault = isDefault;
  if (newIsDefault !== undefined && newIsDefault) {
    await addressRepository.unsetDefaultsForUser(userId);
  } else if (newIsDefault === undefined) {
    newIsDefault = existing.is_default;
  }

  await addressRepository.update(addressId, userId, {
    label: label || existing.label,
    name: name || existing.name,
    phone: phone || existing.phone,
    country: country || existing.country,
    state: state || existing.state,
    district: district !== undefined ? district : existing.district,
    city: city || existing.city,
    area: area !== undefined ? area : existing.area,
    landmark: landmark !== undefined ? landmark : existing.landmark,
    pincode: pincode || existing.pincode,
    line1: line1 || existing.line1,
    isDefault: newIsDefault
  });

  return exports.getAddresses(userId);
};

exports.deleteAddress = async (addressId, userId) => {
  const existing = await addressRepository.findByIdAndUserId(addressId, userId);
  if (!existing) {
    throw new NotFoundError("Address not found");
  }

  const wasDefault = existing.is_default;
  await addressRepository.delete(addressId, userId);

  if (wasDefault) {
    const latest = await addressRepository.findLatestByUserId(userId);
    if (latest) {
      await addressRepository.setDefault(latest.id, userId);
    }
  }

  return exports.getAddresses(userId);
};

exports.setDefaultAddress = async (addressId, userId) => {
  const existing = await addressRepository.findByIdAndUserId(addressId, userId);
  if (!existing) {
    throw new NotFoundError("Address not found");
  }

  await addressRepository.unsetDefaultsForUser(userId);
  await addressRepository.setDefault(addressId, userId);

  return exports.getAddresses(userId);
};
