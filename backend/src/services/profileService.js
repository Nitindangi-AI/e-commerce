const profileRepository = require("../repositories/profileRepository");
const { NotFoundError, BadRequestError } = require("../middleware/errors");

const PROFILE_ALLOWED_FIELDS = new Set([
  "first_name",
  "last_name",
  "display_name",
  "phone",
  "date_of_birth",
  "gender",
  "avatar_url",
  "notification_preferences",
]);

exports.getMyProfile = async (userId) => {
  const profile = await profileRepository.findById(userId);
  if (!profile) {
    throw new NotFoundError("Profile not found");
  }
  return profile;
};

exports.updateMyProfile = async (userId, updatesData) => {
  const updates = [];
  const params = [userId];
  let paramIndex = 2;

  for (const [key, value] of Object.entries(updatesData)) {
    if (!PROFILE_ALLOWED_FIELDS.has(key)) {
      continue; // Silently drop
    }
    updates.push(`${key} = $${paramIndex}`);
    params.push(value ?? null);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError("No valid profile fields provided");
  }

  const updatesClause = updates.join(", ");
  const profile = await profileRepository.updateProfile(userId, updatesClause, params);
  if (!profile) {
    throw new NotFoundError("Profile not found");
  }

  return profile;
};

exports.getPublicVendorProfile = async (vendorId) => {
  const vendor = await profileRepository.findPublicVendorProfile(vendorId);
  if (!vendor) {
    throw new NotFoundError("Vendor not found");
  }
  return vendor;
};
