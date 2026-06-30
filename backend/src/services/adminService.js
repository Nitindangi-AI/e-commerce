const adminRepository = require("../repositories/adminRepository");
const { NotFoundError, BadRequestError } = require("../middleware/errors");
const crypto = require("crypto");

exports.getDashboardStats = async () => {
  const gmv_today = await adminRepository.getGmvToday();
  const gmv_month = await adminRepository.getGmvMonth();
  const orders_today = await adminRepository.getOrdersTodayCount();
  const orders_pending = await adminRepository.getOrdersPendingCount();
  const new_users_today = await adminRepository.getNewUsersCount();
  const active_vendors = await adminRepository.getVendorsCountByStatus('approved');
  const pending_vendor_approvals = await adminRepository.getVendorsCountByStatus('pending');
  const low_stock_count = await adminRepository.getLowStockCount();

  return {
    gmv_today,
    gmv_month,
    orders_today,
    orders_pending,
    new_users_today,
    active_vendors,
    pending_vendor_approvals,
    low_stock_count
  };
};

exports.approveVendor = async (vendorId, adminId) => {
  await adminRepository.beginTransaction();

  try {
    const vendor = await adminRepository.updateVendorStatus(vendorId, 'approved', adminId);
    if (!vendor) {
      throw new NotFoundError("Vendor not found");
    }

    const userId = vendor.user_id;

    // Ensure SQL profile row exists and set role to 'vendor'
    const profile = await adminRepository.findProfileById(userId);
    if (!profile) {
      const authUser = await adminRepository.findAuthUserById(userId);
      let emailVal = "";
      let phoneVal = "";
      let fullName = "";
      let firstName = "";
      let lastName = "";

      if (authUser) {
        emailVal = authUser.email || "";
        const meta = authUser.user_meta || {};
        phoneVal = meta.phone || "";
        fullName = meta.full_name || meta.name || "";
        firstName = meta.first_name || "";
        lastName = meta.last_name || "";
      }

      const referralCode = `TRENDY-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      await adminRepository.createProfile({
        id: userId,
        email: emailVal,
        phone: phoneVal,
        fullName,
        firstName,
        lastName,
        role: 'vendor',
        referralCode
      });
    } else {
      await adminRepository.updateProfileRole(userId, 'vendor');
    }

    await adminRepository.createNotification(userId, 'system', 'Vendor Approved', 'Your vendor account has been approved!');

    await adminRepository.commitTransaction();
    return vendor;
  } catch (error) {
    await adminRepository.rollbackTransaction();
    throw error;
  }
};

exports.rejectVendor = async (vendorId, reason) => {
  await adminRepository.beginTransaction();

  try {
    const vendor = await adminRepository.updateVendorStatus(vendorId, 'rejected', reason);
    if (!vendor) {
      throw new NotFoundError("Vendor not found");
    }

    const userId = vendor.user_id;

    await adminRepository.updateProfileRole(userId, 'customer');
    await adminRepository.createNotification(userId, 'system', 'Vendor Rejected', `Your vendor registration request was rejected. Reason: ${reason}`);

    await adminRepository.commitTransaction();
    return vendor;
  } catch (error) {
    await adminRepository.rollbackTransaction();
    throw error;
  }
};

exports.suspendVendor = async (vendorId, reason) => {
  await adminRepository.beginTransaction();

  try {
    const vendor = await adminRepository.updateVendorStatus(vendorId, 'suspended', reason);
    if (!vendor) {
      throw new NotFoundError("Vendor not found");
    }

    const userId = vendor.user_id;

    await adminRepository.updateProfileRole(userId, 'customer');
    await adminRepository.createNotification(userId, 'system', 'Account Suspended', `Your vendor account has been suspended. Reason: ${reason}`);

    await adminRepository.commitTransaction();
    return vendor;
  } catch (error) {
    await adminRepository.rollbackTransaction();
    throw error;
  }
};

exports.getVendors = async (status, page, limit) => {
  const parsedPage = parseInt(page || 1, 10);
  const parsedLimit = parseInt(limit || 24, 10);
  const offset = (parsedPage - 1) * parsedLimit;

  const { vendors, total } = await adminRepository.getVendorsList(status, parsedLimit, offset);

  return {
    total,
    count: vendors.length,
    page: parsedPage,
    totalPages: Math.ceil(total / parsedLimit),
    vendors
  };
};

exports.banUser = async (userId) => {
  const profile = await adminRepository.banUserProfile(userId);
  if (!profile) {
    throw new NotFoundError("User profile not found");
  }
  return profile;
};

exports.getUsers = async (page = 1, limit = 20) => {
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);
  const offset = (parsedPage - 1) * parsedLimit;

  const { users, total } = await adminRepository.getUsersList(parsedLimit, offset);

  return {
    data: users,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit)
    }
  };
};

exports.getInventoryAlerts = async () => {
  return adminRepository.getInventoryAlerts();
};

exports.getAllOrders = async (filters, page, limit) => {
  const parsedPage = parseInt(page || 1, 10);
  const parsedLimit = parseInt(limit || 24, 10);
  const offset = (parsedPage - 1) * parsedLimit;

  const { orders, total } = await adminRepository.getAllOrders(filters, parsedLimit, offset);

  const formattedOrders = orders.map(row => ({
    ...row,
    user: {
      email: row.email,
      firstName: row.full_name.split(' ')[0] || '',
      lastName: row.full_name.split(' ')[1] || ''
    }
  }));

  return {
    count: formattedOrders.length,
    total,
    page: parsedPage,
    totalPages: Math.ceil(total / parsedLimit),
    orders: formattedOrders
  };
};
