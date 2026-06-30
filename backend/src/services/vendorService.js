const { createClient, createAdminClient } = require('@insforge/sdk');
const vendorRepository = require("../repositories/vendorRepository");
const { NotFoundError, BadRequestError, ForbiddenError, AuthError, AppError } = require("../middleware/errors");

const insforge = createClient({
  baseUrl: process.env.INSFORGE_URL || process.env.INSFORGE_BASE_URL,
  anonKey: process.env.INSFORGE_ANON_KEY,
  isServerMode: true
});

let adminInsforge = null;
if ((process.env.INSFORGE_URL || process.env.INSFORGE_BASE_URL) && process.env.INSFORGE_SERVICE_ROLE_KEY) {
  adminInsforge = createAdminClient({
    baseUrl: process.env.INSFORGE_URL || process.env.INSFORGE_BASE_URL,
    apiKey: process.env.INSFORGE_SERVICE_ROLE_KEY
  });
}

// Validation helpers
const validatePAN = (pan) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
const validateGSTIN = (gst) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst);
const validateAadhaar = (aadhaar) => /^[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}$/.test(aadhaar.replace(/\s/g, ''));
const validateIFSC = (ifsc) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
const validateBankAccount = (acc) => /^[0-9]{9,18}$/.test(acc);

exports.getDashboardStats = async (userId) => {
  return vendorRepository.getDashboardStats(userId);
};

exports.getVendorProducts = async (userId, page, limit) => {
  const parsedPage = parseInt(page || 1, 10);
  const parsedLimit = parseInt(limit || 24, 10);
  const offset = (parsedPage - 1) * parsedLimit;

  const total = await vendorRepository.getProductsCount(userId);
  const products = await vendorRepository.getProductsList(userId, parsedLimit, offset);

  return {
    count: products.length,
    total,
    page: parsedPage,
    totalPages: Math.ceil(total / parsedLimit),
    products
  };
};

exports.getVendorOrders = async (userId) => {
  const result = await vendorRepository.getOrdersList(userId);
  const orders = [];
  for (const order of result) {
    const items = await vendorRepository.getOrderItems(order.id, userId);
    orders.push({
      ...order,
      orderItems: items
    });
  }
  return orders;
};

exports.getEarnings = async (userId) => {
  const rows = await vendorRepository.getEarningsGrouped(userId);
  return rows.map(row => {
    const gross = parseFloat(row.gross_revenue);
    const rate = parseFloat(row.comm_percent);
    const commission = (gross * rate) / 100;
    const net = gross - commission;
    return {
      month: row.month,
      grossRevenue: gross,
      commission,
      netRevenue: net,
      commissionRate: rate
    };
  });
};

exports.updateStoreProfile = async (userId, storeData) => {
  const { store_name, store_description, store_logo, store_email, store_phone } = storeData;

  const updates = [];
  const params = [userId];
  let paramIndex = 2;

  if (store_name !== undefined) {
    updates.push(`store_name = $${paramIndex}`);
    params.push(store_name);
    paramIndex++;
  }
  if (store_description !== undefined) {
    updates.push(`store_description = $${paramIndex}`);
    params.push(store_description);
    paramIndex++;
  }
  if (store_logo !== undefined) {
    updates.push(`store_logo = $${paramIndex}`);
    params.push(store_logo);
    paramIndex++;
  }
  if (store_email !== undefined) {
    updates.push(`store_email = $${paramIndex}`);
    params.push(store_email);
    paramIndex++;
  }
  if (store_phone !== undefined) {
    updates.push(`store_phone = $${paramIndex}`);
    params.push(store_phone);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new BadRequestError("No update fields provided");
  }

  updates.push(`updated_at = now()`);
  const updatesPart = updates.join(", ");
  const vendor = await vendorRepository.updateStoreProfile(userId, updatesPart, params);
  if (!vendor) {
    throw new NotFoundError("Vendor profile not found");
  }

  return vendor;
};

exports.registerVendor = async (registerData) => {
  const {
    full_name, email, password, store_name, phone, store_description, business_address,
    pan_card, gstin: gst_number, bank_account, aadhar_number, ifsc_code, store_logo
  } = registerData;

  // Validate presence
  if (!full_name || !email || !password || !store_name || !phone || !store_description || !pan_card || !gst_number || !bank_account || !aadhar_number || !ifsc_code) {
    throw new BadRequestError('All fields are required.');
  }
  if (!business_address || !business_address.trim()) {
    throw new BadRequestError('Business address is required.');
  }

  // Validate format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new BadRequestError('Invalid email format.');
  }
  if (password.length < 8) {
    throw new BadRequestError('Password must be at least 8 characters.');
  }
  if (!validatePAN(pan_card)) {
    throw new BadRequestError('Invalid PAN card format (Expected: ABCDE1234F).');
  }
  if (!validateGSTIN(gst_number)) {
    throw new BadRequestError('Invalid GSTIN format.');
  }
  if (!validateAadhaar(aadhar_number)) {
    throw new BadRequestError('Invalid Aadhaar number format.');
  }
  if (!validateIFSC(ifsc_code)) {
    throw new BadRequestError('Invalid IFSC code format.');
  }
  if (!validateBankAccount(bank_account)) {
    throw new BadRequestError('Invalid bank account number format.');
  }

  // Sign up using SDK
  const { data: authData, error: authError } = await insforge.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        role: 'vendor',
        phone
      }
    }
  });

  if (authError) {
    const errMsg = authError.message.toLowerCase();
    if (errMsg.includes('already registered') || errMsg.includes('already exists')) {
      throw new AppError('Email is already registered.', 409);
    }
    throw new BadRequestError(authError.message);
  }

  const userId = authData?.user?.id;
  if (!userId) {
    throw new AppError('Failed to retrieve user ID.', 500);
  }

  // Insert vendor row using admin client to bypass RLS
  const client = adminInsforge || insforge;
  const { error: dbError } = await client.database
    .from('vendors')
    .insert([
      {
        user_id: userId,
        store_name,
        store_description,
        store_logo: store_logo || '',
        business_address: business_address || '',
        pan_card,
        gst_number,
        bank_account,
        aadhar_number,
        ifsc_code,
        status: 'pending',
        commission_rate: 10.00
      }
    ]);

  if (dbError) {
    console.error('Database insert error for vendor:', dbError.message);
    // Cleanup orphaned InsForge user from database
    await vendorRepository.deleteAuthUser(userId).catch((cleanupErr) => {
      console.error('Failed to cleanup orphaned vendor auth user:', cleanupErr.message);
    });
    throw new AppError('User created but failed to create vendor profile. Onboarding rolled back.', 500);
  }

  return { userId };
};

exports.upgradeVendor = async (userId, upgradeData) => {
  const {
    store_name, store_description, business_address, pan_card, gst_number, bank_account, aadhar_number, ifsc_code, store_logo
  } = upgradeData;

  if (!store_name || !store_description || !pan_card || !gst_number || !bank_account || !aadhar_number || !ifsc_code) {
    throw new BadRequestError('All fields are required.');
  }
  if (!business_address || !business_address.trim()) {
    throw new BadRequestError('Business address is required.');
  }

  if (!validatePAN(pan_card)) throw new BadRequestError('Invalid PAN card format (Expected: ABCDE1234F).');
  if (!validateGSTIN(gst_number)) throw new BadRequestError('Invalid GSTIN format.');
  if (!validateAadhaar(aadhar_number)) throw new BadRequestError('Invalid Aadhaar number format.');
  if (!validateIFSC(ifsc_code)) throw new BadRequestError('Invalid IFSC code format.');
  if (!validateBankAccount(bank_account)) throw new BadRequestError('Invalid bank account number format.');

  const existing = await vendorRepository.findVendorProfileByUserId(userId);
  const client = adminInsforge || insforge;

  if (existing) {
    if (existing.status === 'approved') {
      throw new BadRequestError('You are already an approved vendor.');
    }
    if (existing.status === 'pending') {
      throw new BadRequestError('Your application is already pending review.');
    }

    const { error: dbError } = await client.database
      .from('vendors')
      .update({
        store_name,
        store_description,
        store_logo: store_logo || '',
        business_address: business_address || '',
        pan_card,
        gst_number,
        bank_account,
        aadhar_number,
        ifsc_code,
        status: 'pending',
        rejection_reason: '',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (dbError) {
      console.error('Database update error for vendor upgrade:', dbError.message);
      throw new AppError('Failed to update vendor profile.', 500);
    }
  } else {
    const { error: dbError } = await client.database
      .from('vendors')
      .insert([
        {
          user_id: userId,
          store_name,
          store_description,
          store_logo: store_logo || '',
          business_address: business_address || '',
          pan_card,
          gst_number,
          bank_account,
          aadhar_number,
          ifsc_code,
          status: 'pending',
          commission_rate: 10.00
        }
      ]);

    if (dbError) {
      console.error('Database insert error for vendor upgrade:', dbError.message);
      throw new AppError('Failed to submit vendor application.', 500);
    }
  }

  return { success: true };
};

exports.loginVendor = async (email, password) => {
  if (!email || !password) {
    throw new BadRequestError('Email and password are required.');
  }

  const { data: authData, error: authError } = await insforge.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    throw new AuthError('Invalid email or password.');
  }

  const userId = authData.user.id;

  const { data: profileData, error: profileError } = await insforge.database
    .from('profiles')
    .select('role, full_name')
    .eq('id', userId)
    .single();

  if (profileError || !profileData || profileData.role !== 'vendor') {
    await insforge.auth.signOut();
    throw new ForbiddenError('This account is not registered as a vendor.');
  }

  const { data: vendorData, error: vendorError } = await insforge.database
    .from('vendors')
    .select('store_name, status')
    .eq('user_id', userId)
    .single();

  if (vendorError || !vendorData) {
    await insforge.auth.signOut();
    throw new ForbiddenError('Vendor profile not found.');
  }

  if (vendorData.status === 'pending') {
    await insforge.auth.signOut();
    throw new ForbiddenError('Your vendor account is pending approval.');
  }
  if (vendorData.status === 'rejected') {
    await insforge.auth.signOut();
    throw new ForbiddenError('Your vendor application was rejected.');
  }
  if (vendorData.status === 'suspended') {
    await insforge.auth.signOut();
    throw new ForbiddenError('Your vendor account has been suspended. Please contact support.');
  }

  return {
    access_token: authData.accessToken,
    refresh_token: authData.refreshToken,
    user: {
      id: userId,
      email: authData.user.email,
      full_name: profileData.full_name,
      store_name: vendorData.store_name,
      status: vendorData.status
    }
  };
};

exports.logoutVendor = async () => {
  const { error } = await insforge.auth.signOut();
  if (error) {
    console.error('Error during logout:', error);
    throw new AppError('Failed to invalidate session.', 500);
  }
  return { success: true };
};
