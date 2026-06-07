import axios from 'axios';
import { insforge } from '../lib/insforge';

// ─── Auth API ────────────────────────────────────────────
export const authAPI = {
  register: async ({ firstName, lastName, email, password, phone, role, storeName, storeLogoFile, panCard, gstNumber, bankAccount, aadharNumber }) => {
    const { data, error } = await insforge.auth.signUp({
      email,
      password,
      profile: { first_name: firstName, last_name: lastName },
    });
    if (error) throw new Error(error.message);

    const userId = data?.user?.id;

    if (userId) {
      // 1. Upload store logo if provided
      let storeLogoUrl = '';
      if (storeLogoFile) {
        try {
          const fileExt = storeLogoFile.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
          const filePath = `vendors/${fileName}`;
          const { data: uploadData, error: uploadErr } = await insforge.storage
            .from('images')
            .upload(filePath, storeLogoFile);
          if (uploadErr) throw uploadErr;
          storeLogoUrl = uploadData?.url || '';
        } catch (uploadErr) {
          console.error("Failed to upload store logo during register:", uploadErr);
        }
      }

      // 2. Create profile row with 'user' role
      await authAPI.createProfile(userId, {
        first_name: firstName,
        last_name: lastName,
        phone: phone || '',
        role: 'user', // Set initially as 'user'
        avatar_url: email,
      });

      // 3. Insert pending vendor onboarding details if role is vendor
      if (role === 'vendor') {
        const { error: vendorError } = await insforge.database.from('vendors').insert([{
          user_id: userId,
          store_name: storeName || `${firstName} ${lastName}'s Store`,
          store_logo: storeLogoUrl,
          pan_card: panCard || '',
          gst_number: gstNumber || '',
          bank_account: bankAccount || '',
          aadhar_number: aadharNumber || '',
          status: 'pending',
          commission_rate: 10.00,
        }]);
        if (vendorError) {
          console.error("Vendor Onboarding Insert Error:", vendorError.message);
          throw new Error(vendorError.message);
        }
        await insforge.auth.signOut().catch(console.error);
      }
    }

    return { success: true, user: data.user, token: data.accessToken };
  },

  createProfile: async (userId, { first_name, last_name, phone, role, avatar_url }) => {
    const { error } = await insforge.database.from('profiles').insert([{
      id: userId,
      first_name,
      last_name,
      phone: phone || '',
      role: role || 'user',
      avatar_url: avatar_url || '',
    }]);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  login: async ({ email, password }) => {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    // Fetch profile data
    const { data: profile } = await insforge.database
      .from('profiles')
      .select()
      .eq('id', data.user.id)
      .maybeSingle();

    return {
      success: true,
      token: data.accessToken,
      user: { ...data.user, ...profile },
    };
  },

  loginWithGoogle: async () => {
    const { data, error } = await insforge.auth.signInWithOAuth({
      provider: 'google',
      redirectTo: window.location.origin + '/',
    });
    if (error) throw new Error(error.message);
    return data;
  },

  logout: async () => {
    const { error } = await insforge.auth.signOut();
    if (error) throw new Error(error.message);
    return { success: true, message: 'Logged out successfully' };
  },

  getMe: async () => {
    const { data, error } = await insforge.auth.getUser();
    if (error || !data?.user) throw new Error('Not authenticated');

    const { data: profile } = await insforge.database
      .from('profiles')
      .select()
      .eq('id', data.user.id)
      .maybeSingle();

    // If no profile yet (e.g., OAuth user first time), create one
    if (!profile) {
      const name = data.user.profile?.name || data.user.email?.split('@')[0] || '';
      const nameParts = name.split(' ');
      const newProfile = {
        id: data.user.id,
        first_name: nameParts[0] || 'User',
        last_name: nameParts.slice(1).join(' ') || '',
        phone: '',
        role: 'user',
      };
      const { error: newProfileError } = await insforge.database.from('profiles').insert([newProfile]);
      if (newProfileError) throw new Error(newProfileError.message);
      return { success: true, user: { ...data.user, ...newProfile } };
    }

    // Load wishlist items
    const { data: wishlistData } = await insforge.database
      .from('wishlist')
      .select('product_id, products(*)')
      .eq('user_id', data.user.id);

    const wishlist = (wishlistData || []).map(w => w.products);

    return {
      success: true,
      user: {
        ...data.user,
        ...profile,
        firstName: profile.first_name,
        lastName: profile.last_name,
        wishlist,
      },
    };
  },

  updateProfile: async ({ firstName, lastName, displayName, phone, dateOfBirth, gender, avatarUrl, notificationPreferences }) => {
    const { data: userData } = await insforge.auth.getUser();
    if (!userData?.user) throw new Error('Not authenticated');

    const updateFields = {
      updated_at: new Date().toISOString(),
    };
    if (firstName !== undefined) updateFields.first_name = firstName;
    if (lastName !== undefined) updateFields.last_name = lastName;
    if (displayName !== undefined) updateFields.display_name = displayName;
    if (phone !== undefined) updateFields.phone = phone || '';
    if (dateOfBirth !== undefined) updateFields.date_of_birth = dateOfBirth || null;
    if (gender !== undefined) updateFields.gender = gender || null;
    if (avatarUrl !== undefined) updateFields.avatar_url = avatarUrl;
    if (notificationPreferences !== undefined) updateFields.notification_preferences = notificationPreferences;

    const { error } = await insforge.database
      .from('profiles')
      .update(updateFields)
      .eq('id', userData.user.id);

    if (error) throw new Error(error.message);
    return { success: true };
  },

  updatePassword: async ({ currentPassword, newPassword }) => {
    // InsForge doesn't have a "verify current password then change" flow in one step.
    // We sign in with current password first to verify, then update.
    const { data: userData } = await insforge.auth.getUser();
    if (!userData?.user) throw new Error('Not authenticated');

    // Try signing in with current password to verify
    const { error: verifyError } = await insforge.auth.signInWithPassword({
      email: userData.user.email,
      password: currentPassword,
    });
    if (verifyError) throw new Error('Current password is incorrect');

    const { error } = await insforge.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return { success: true };
  },
};

// ─── Products API ────────────────────────────────────────
export const productAPI = {
  getAll: async (params = '') => {
    const res = await axios.get(`/api/v1/products?${params}`);
    return {
      success: true,
      products: (res.data.products || []).map(normalizeProduct),
      total: res.data.totalProducts || 0,
      page: res.data.page || 1,
      pages: res.data.totalPages || 1,
    };
  },

  getById: async (id) => {
    const res = await axios.get(`/api/v1/products/${id}`);
    return { success: true, product: normalizeProduct(res.data.product) };
  },

  getBySlug: async (slug) => {
    const res = await axios.get(`/api/v1/products/slug/${slug}`);
    return { success: true, product: normalizeProduct(res.data.product) };
  },

  getCategories: async () => {
    const res = await axios.get('/api/v1/products/categories');
    const categories = (res.data.categories || []).map(c => c.name);
    return { success: true, categories };
  },

  getBrands: async (category) => {
    const res = await axios.get(`/api/v1/products/brands${category ? `?category=${category}` : ''}`);
    const brands = (res.data.brands || []).map(b => b.name);
    return { success: true, brands };
  },

  getRelated: async (id) => {
    const res = await axios.get(`/api/v1/products/${id}/related`);
    return { success: true, products: (res.data.products || []).map(normalizeProduct) };
  },

  getTopSelling: async (limit = 8) => {
    const res = await axios.get(`/api/v1/products/top-selling?limit=${limit}`);
    return { success: true, products: (res.data.products || []).map(normalizeProduct) };
  },

  getFeatured: async (limit = 8) => {
    const res = await axios.get(`/api/v1/products/featured?limit=${limit}`);
    return { success: true, products: (res.data.products || []).map(normalizeProduct) };
  },

  search: async (query) => {
    const res = await axios.get(`/api/v1/products/search?q=${encodeURIComponent(query)}`);
    return { success: true, products: (res.data.products || []).map(normalizeProduct) };
  },
};

// ─── Orders API ──────────────────────────────────────────
export const orderAPI = {
  create: async ({ orderItems, shippingAddress, paymentMethod, couponCode, discount }) => {
    const { data: userData } = await insforge.auth.getUser();
    if (!userData?.user) throw new Error('Please login to place an order');

    // Validate products and calculate totals
    let subtotal = 0;
    let maxDeliveryDays = 0;
    const validatedItems = [];

    for (const item of orderItems) {
      const { data: product, error } = await insforge.database
        .from('products')
        .select()
        .eq('id', item.product)
        .single();
      if (error || !product) throw new Error(`Product not found: ${item.product}`);
      if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);

      validatedItems.push({
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.img,
        color: item.color || '',
        size: item.size || '',
        product_id: product.id,
      });

      subtotal += product.price * item.quantity;
      if (product.delivery_days > maxDeliveryDays) maxDeliveryDays = product.delivery_days;
    }

    const shippingCost = subtotal > 999 ? 0 : 99;
    const discountAmount = discount || 0;
    const totalAmount = subtotal + shippingCost - discountAmount;

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + (maxDeliveryDays || 3));

    // Generate order ID
    const orderId = `TRENDZ-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    // Generate transaction ID for non-COD
    const selectedPayment = paymentMethod || 'cod';
    let paymentDetails = {};
    if (selectedPayment !== 'cod') {
      paymentDetails.transactionId = `TXN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    }

    // Create order
    const { data: order, error: orderError } = await insforge.database
      .from('orders')
      .insert([{
        user_id: userData.user.id,
        order_id: orderId,
        order_status: 'Processing',
        shipping_address: shippingAddress,
        payment_method: selectedPayment,
        payment_status: selectedPayment === 'cod' ? 'pending' : 'paid',
        payment_details: paymentDetails,
        subtotal,
        shipping_cost: shippingCost,
        discount: discountAmount,
        coupon_code: couponCode || null,
        total_amount: totalAmount,
        estimated_delivery: estimatedDelivery.toISOString(),
      }])
      .select()
      .single();

    if (orderError) throw new Error(orderError.message);

    // Create order items
    const itemsToInsert = validatedItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
      color: item.color,
      size: item.size,
    }));

    const { error: itemsError } = await insforge.database.from('order_items').insert(itemsToInsert);
    if (itemsError) throw new Error(`Failed to save order items: ${itemsError.message}`);

    // Create initial status history
    const { error: historyError } = await insforge.database.from('order_status_history').insert([{
      order_id: order.id,
      status: 'Processing',
      note: 'Order placed successfully',
    }]);
    if (historyError) throw new Error(`Failed to log order status history: ${historyError.message}`);

    // Decrement stock
    for (const item of validatedItems) {
      const { error: stockError } = await insforge.database.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });
      if (stockError) throw new Error(`Failed to update product stock: ${stockError.message}`);
    }

    // Return order with items
    return {
      success: true,
      order: {
        ...normalizeOrder(order),
        orderItems: validatedItems,
      },
    };
  },

  getMyOrders: async () => {
    const { data: userData } = await insforge.auth.getUser();
    if (!userData?.user) throw new Error('Not authenticated');

    const { data: orders, error } = await insforge.database
      .from('orders')
      .select('*, order_items(*), order_status_history(*)')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return {
      success: true,
      count: (orders || []).length,
      orders: (orders || []).map(normalizeOrder),
    };
  },

  getById: async (id) => {
    const { data, error } = await insforge.database
      .from('orders')
      .select('*, order_items(*, products(*)), order_status_history(*)')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return { success: true, order: normalizeOrder(data) };
  },

  cancel: async (id) => {
    const { data: order, error: fetchError } = await insforge.database
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .single();
    if (fetchError) throw new Error('Order not found');

    if (order.order_status !== 'Processing' && order.order_status !== 'Confirmed') {
      throw new Error(`Cannot cancel. Current status: ${order.order_status}`);
    }

    // Restore stock
    for (const item of (order.order_items || [])) {
      await insforge.database.rpc('restore_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });
    }

    let paymentDetails = order.payment_details || {};
    let noteText = 'Order cancelled by customer. Stock restored to warehouse.';

    if (order.payment_method !== 'cod' && order.payment_status === 'paid') {
      const refundId = `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      paymentDetails = {
        ...paymentDetails,
        refund_details: {
          refund_id: refundId,
          amount: order.total_amount,
          status: 'completed',
          refunded_to: order.payment_details?.transactionId ? `Account linked to TXN: ${order.payment_details.transactionId}` : 'Original Payment Source',
          processed_at: new Date().toISOString()
        }
      };
      noteText = `Automatic Payment Gateway Refund Processed: ₹${order.total_amount.toLocaleString("en-IN")} returned to original account. Refund Reference ID: ${refundId}`;
    }

    const { error } = await insforge.database
      .from('orders')
      .update({
        order_status: 'Cancelled',
        payment_status: order.payment_status === 'paid' ? 'refunded' : order.payment_status,
        payment_details: paymentDetails,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw new Error(error.message);

    const { error: historyError } = await insforge.database.from('order_status_history').insert([{
      order_id: id,
      status: 'Cancelled',
      note: noteText,
    }]);
    if (historyError) throw new Error(historyError.message);

    return { success: true };
  },

  requestReturn: async (id, reason) => {
    const { error } = await insforge.database
      .from('orders')
      .update({
        order_status: 'Return Requested',
        return_status: 'requested',
        return_reason: reason || 'No reason provided',
        return_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw new Error(error.message);

    const { error: historyError } = await insforge.database.from('order_status_history').insert([{
      order_id: id,
      status: 'Return Requested',
      note: `Return requested: ${reason || 'No reason provided'}`,
    }]);
    if (historyError) throw new Error(historyError.message);

    return { success: true, message: 'Return request submitted successfully.' };
  },

  // Admin
  getAll: async () => {
    const { data, error } = await insforge.database
      .from('orders')
      .select('*, order_items(*), order_status_history(*), profiles!orders_user_id_fkey(first_name, last_name)')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return { success: true, orders: (data || []).map(normalizeOrder) };
  },

  updateStatus: async (id, status, note) => {
    const updates = {
      order_status: status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'Delivered') {
      updates.delivered_at = new Date().toISOString();
      updates.payment_status = 'paid';
    }
    const { error } = await insforge.database.from('orders').update(updates).eq('id', id);
    if (error) throw new Error(error.message);

    await insforge.database.from('order_status_history').insert([{
      order_id: id, status, note: note || '',
    }]);
    return { success: true };
  },

  handleReturn: async (id, action) => {
    if (action === 'approve') {
      const { data: order } = await insforge.database
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', id)
        .single();

      // Restore stock
      for (const item of (order?.order_items || [])) {
        await insforge.database.rpc('restore_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
        });
      }

      let paymentDetails = order?.payment_details || {};
      let noteText = 'Return approved — full refund issued.';

      if (order?.payment_method !== 'cod' && order?.payment_status === 'paid') {
        const refundId = `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        paymentDetails = {
          ...paymentDetails,
          refund_details: {
            refund_id: refundId,
            amount: order.total_amount,
            status: 'completed',
            refunded_to: order.payment_details?.transactionId ? `Account linked to TXN: ${order.payment_details.transactionId}` : 'Original Payment Source',
            processed_at: new Date().toISOString()
          }
        };
        noteText = `Return Approved. Automatic Payment Gateway Refund Processed: ₹${order.total_amount.toLocaleString("en-IN")} returned to original account. Refund Reference ID: ${refundId}`;
      }

      await insforge.database.from('orders').update({
        return_status: 'completed',
        order_status: 'Returned',
        payment_status: 'refunded',
        payment_details: paymentDetails,
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      await insforge.database.from('order_status_history').insert([{
        order_id: id, status: 'Returned',
        note: noteText,
      }]);
    } else {
      await insforge.database.from('orders').update({
        return_status: 'rejected',
        order_status: 'Delivered',
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      await insforge.database.from('order_status_history').insert([{
        order_id: id, status: 'Return Rejected',
        note: 'Return request rejected by admin',
      }]);
    }
    return { success: true };
  },
};

// ─── Reviews API ─────────────────────────────────────────
export const reviewAPI = {
  getForProduct: async (productId) => {
    const { data, error } = await insforge.database
      .from('reviews')
      .select('*, profiles(first_name, last_name)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return {
      success: true,
      reviews: (data || []).map(r => ({
        _id: r.id,
        rating: r.rating,
        title: r.title,
        text: r.text,
        verified: r.verified,
        helpful: r.helpful,
        createdAt: r.created_at,
        user: r.profiles ? { firstName: r.profiles.first_name, lastName: r.profiles.last_name } : {},
      })),
    };
  },

  create: async (productId, { rating, title, text }) => {
    const { data: userData } = await insforge.auth.getUser();
    if (!userData?.user) throw new Error('Not authenticated');

    const { error } = await insforge.database.from('reviews').insert([{
      user_id: userData.user.id,
      product_id: productId,
      rating, title, text,
    }]);
    if (error) throw new Error(error.message);

    // Update product rating
    const { data: reviews } = await insforge.database
      .from('reviews')
      .select('rating')
      .eq('product_id', productId);
    if (reviews && reviews.length > 0) {
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      const { error: productUpdateError } = await insforge.database.from('products').update({
        rating: Math.round(avg * 10) / 10,
        num_reviews: reviews.length,
      }).eq('id', productId);
      if (productUpdateError) throw new Error(productUpdateError.message);
    }

    return { success: true };
  },

  delete: async (reviewId) => {
    const { error } = await insforge.database.from('reviews').delete().eq('id', reviewId);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  markHelpful: async (reviewId) => {
    const { data: review, error: fetchError } = await insforge.database
      .from('reviews').select('helpful').eq('id', reviewId).maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (review) {
      const { error: updateError } = await insforge.database.from('reviews')
        .update({ helpful: (review.helpful || 0) + 1 }).eq('id', reviewId);
      if (updateError) throw new Error(updateError.message);
    }
    return { success: true };
  },
};

// ─── Wishlist API ────────────────────────────────────────
export const wishlistAPI = {
  get: async () => {
    const { data: userData } = await insforge.auth.getUser();
    if (!userData?.user) throw new Error('Not authenticated');

    const { data, error } = await insforge.database
      .from('wishlist')
      .select('*, products(*)')
      .eq('user_id', userData.user.id);
    if (error) throw new Error(error.message);
    return {
      success: true,
      wishlist: (data || []).map(w => normalizeProduct(w.products)),
    };
  },

  toggle: async (productId) => {
    const { data: userData } = await insforge.auth.getUser();
    if (!userData?.user) throw new Error('Not authenticated');

    // Check if already in wishlist
    const { data: existing } = await insforge.database
      .from('wishlist')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      const { error: deleteError } = await insforge.database.from('wishlist').delete().eq('id', existing.id);
      if (deleteError) throw new Error(deleteError.message);
      return { success: true, added: false };
    } else {
      const { error: insertError } = await insforge.database.from('wishlist').insert([{
        user_id: userData.user.id,
        product_id: productId,
      }]);
      if (insertError) throw new Error(insertError.message);
      return { success: true, added: true };
    }
  },

  clear: async () => {
    const { data: userData } = await insforge.auth.getUser();
    if (!userData?.user) throw new Error('Not authenticated');
    const { error: clearError } = await insforge.database.from('wishlist').delete().eq('user_id', userData.user.id);
    if (clearError) throw new Error(clearError.message);
    return { success: true };
  },
};

// ─── Cart API (server-persisted) ─────────────────────────
export const cartAPI = {
  get: async () => {
    const { data: userData } = await insforge.auth.getUser();
    if (!userData?.user) return { success: true, items: [] };

    const { data, error } = await insforge.database
      .from('cart_items')
      .select('*, products(*)')
      .eq('user_id', userData.user.id);
    if (error) throw new Error(error.message);

    return {
      success: true,
      items: (data || []).map(c => ({
        ...normalizeProduct(c.products),
        quantity: c.quantity,
        selectedColor: c.selected_color,
        selectedSize: c.selected_size,
        cartItemId: c.id,
      })),
    };
  },

  sync: async (localItems) => {
    const { data: userData } = await insforge.auth.getUser();
    if (!userData?.user) return;

    for (const item of localItems) {
      const productId = item.id || item._id;
      const { data: existing } = await insforge.database
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', userData.user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await insforge.database.from('cart_items')
          .update({ quantity: item.quantity })
          .eq('id', existing.id);
        if (updateError) throw new Error(updateError.message);
      } else {
        const { error: insertError } = await insforge.database.from('cart_items').insert([{
          user_id: userData.user.id,
          product_id: productId,
          quantity: item.quantity,
          selected_color: item.selectedColor || '',
          selected_size: item.selectedSize || '',
        }]);
        if (insertError) throw new Error(insertError.message);
      }
    }
  },

  clear: async () => {
    const { data: userData, error: userError } = await insforge.auth.getUser();
    if (userError) throw userError;
    if (!userData?.user) return;
    const { error: deleteError } = await insforge.database.from('cart_items').delete().eq('user_id', userData.user.id);
    if (deleteError) throw deleteError;
  },
};

// ─── Addresses API ───────────────────────────────────────
export const addressAPI = {
  getAll: async () => {
    const { data: userData } = await insforge.auth.getUser();
    if (!userData?.user) throw new Error('Not authenticated');

    const { data, error } = await insforge.database
      .from('addresses')
      .select()
      .eq('user_id', userData.user.id)
      .order('is_default', { ascending: false });
    if (error) throw new Error(error.message);
    return {
      success: true,
      addresses: (data || []).map(normalizeAddress),
    };
  },

  add: async (body) => {
    const { data: userData } = await insforge.auth.getUser();
    if (!userData?.user) throw new Error('Not authenticated');

    const { error } = await insforge.database.from('addresses').insert([{
      user_id: userData.user.id,
      label: body.label || 'Home',
      name: body.name,
      phone: body.phone,
      country: body.country || 'India',
      state: body.state,
      district: body.district || '',
      city: body.city,
      area: body.area || '',
      landmark: body.landmark || '',
      pincode: body.pincode,
      line1: body.line1,
      is_default: body.isDefault || false,
    }]);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  update: async (id, body) => {
    const { error } = await insforge.database.from('addresses').update({
      label: body.label,
      name: body.name,
      phone: body.phone,
      state: body.state,
      district: body.district,
      city: body.city,
      area: body.area,
      landmark: body.landmark,
      pincode: body.pincode,
      line1: body.line1,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  delete: async (id) => {
    const { error } = await insforge.database.from('addresses').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  setDefault: async (id) => {
    const { data: userData } = await insforge.auth.getUser();
    if (!userData?.user) throw new Error('Not authenticated');

    // Unset all defaults first
    const { error: unsetError } = await insforge.database.from('addresses')
      .update({ is_default: false })
      .eq('user_id', userData.user.id);
    if (unsetError) throw new Error(unsetError.message);

    // Set new default
    const { error: setError } = await insforge.database.from('addresses')
      .update({ is_default: true })
      .eq('id', id);
    if (setError) throw new Error(setError.message);

    return { success: true };
  },
};

// ─── Coupons API ─────────────────────────────────────────
export const couponAPI = {
  validate: async (code, cartTotal) => {
    const { data, error } = await insforge.database
      .from('coupons')
      .select()
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Invalid coupon code');
    if (cartTotal < data.min_order) throw new Error(`Minimum order ₹${data.min_order.toLocaleString('en-IN')} required`);

    let discountAmount = 0;
    if (data.type === 'percent') {
      discountAmount = Math.round(cartTotal * data.discount / 100);
      if (data.max_discount) discountAmount = Math.min(discountAmount, data.max_discount);
    } else {
      discountAmount = data.discount;
    }

    return {
      success: true,
      coupon: { ...data, discountAmount },
    };
  },

  getAll: async () => {
    const { data, error } = await insforge.database
      .from('coupons')
      .select()
      .eq('is_active', true);
    if (error) throw new Error(error.message);
    return { success: true, coupons: data || [] };
  },

  getAllAdmin: async () => {
    const { data, error } = await insforge.database
      .from('coupons')
      .select()
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return { success: true, coupons: data || [] };
  },

  create: async (coupon) => {
    const { data, error } = await insforge.database
      .from('coupons')
      .insert([coupon])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { success: true, coupon: data };
  },

  update: async (id, updates) => {
    const { data, error } = await insforge.database
      .from('coupons')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { success: true, coupon: data };
  },

  delete: async (id) => {
    const { error } = await insforge.database
      .from('coupons')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },
};

// ─── Payment API ─────────────────────────────────────────
export const paymentAPI = {
  getAccount: async () => {
    const { data: userData } = await insforge.auth.getUser();
    if (!userData?.user) throw new Error('Not authenticated');

    const { data } = await insforge.database
      .from('profiles')
      .select('payment_account')
      .eq('id', userData.user.id)
      .single();
    return { success: true, paymentAccount: data?.payment_account || {} };
  },

  updateAccount: async (account) => {
    const { data: userData } = await insforge.auth.getUser();
    if (!userData?.user) throw new Error('Not authenticated');

    const { error: updateError } = await insforge.database.from('profiles')
      .update({ payment_account: account, updated_at: new Date().toISOString() })
      .eq('id', userData.user.id);
    if (updateError) throw new Error(updateError.message);
    return { success: true };
  },
};

// ─── Location API (static for now) ──────────────────────
export const locationAPI = {
  getStates: async () => ({ success: true, states: [{ _id: '1', name: 'Maharashtra' }] }),
  getCitiesByState: async () => ({ success: true, cities: [{ _id: '1', name: 'Mumbai', district: 'Mumbai Suburban' }] }),
  getAreasByCity: async () => ({
    success: true,
    areas: [
      { _id: '1', name: 'Andheri West', pincode: '400058' },
      { _id: '2', name: 'Versova', pincode: '400058' },
      { _id: '3', name: 'Bandra West', pincode: '400050' },
    ],
  }),
  validatePincode: async () => ({ success: true, valid: true }),
  checkAvailability: async () => ({
    success: true,
    available: true,
    data: { isServiceable: true, estimatedDays: 3, codAvailable: true },
  }),
  getAllPincodes: async () => ({ success: true, pincodes: [] }),
  addPincode: async () => ({ success: true }),
  updatePincode: async () => ({ success: true }),
  deletePincode: async () => ({ success: true }),
  bulkUploadPincodes: async () => ({ success: true }),
};

// ─── Logistics API ───────────────────────────────────────
export const logisticsAPI = {
  getContractors: async () => {
    const { data, error } = await insforge.database.from('contractors').select('*');
    if (error) throw new Error(error.message);
    return { success: true, contractors: data || [] };
  },

  getVehicles: async () => {
    const { data, error } = await insforge.database.from('vehicles').select('*');
    if (error) throw new Error(error.message);
    return { success: true, vehicles: data || [] };
  },

  createShipment: async ({ orderId, deliveryMode, contractorId, vehicleId, origin, destination }) => {
    const { data: userData } = await insforge.auth.getUser();
    if (!userData?.user) throw new Error('Please login first');

    // Generate random tracking ID
    const trackingId = `TRK-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const otpCode = `OTP-${Math.floor(100000 + Math.random() * 900000)}`;

    // 1. Create shipment record
    const { data: shipment, error: sErr } = await insforge.database
      .from('shipments')
      .insert([{
        shipment_id: trackingId,
        order_id: orderId,
        vendor_id: userData.user.id,
        delivery_mode: deliveryMode,
        status: 'Shipment Request',
        origin,
        destination,
        contractor_id: contractorId,
        vehicle_id: vehicleId,
        otp_code: otpCode
      }])
      .select()
      .single();

    if (sErr) throw new Error(sErr.message);

    // 2. Fetch contractor and vehicle names for notes
    const { data: contractor } = await insforge.database.from('contractors').select('name').eq('id', contractorId).maybeSingle();
    const { data: vehicle } = await insforge.database.from('vehicles').select('type, driver_name').eq('id', vehicleId).maybeSingle();

    const contractorName = contractor?.name || 'Local Carrier';
    const vehicleType = vehicle?.type || 'Truck';

    // 3. Generate dynamic route sequences based on Delivery Mode and Locations
    const routes = [];
    if (deliveryMode === 'air') {
      routes.push(
        { from: origin.city || 'Origin Warehouse', to: 'Global Gateway Hub (Air)', type: 'Road', days: 1, cost: 200 },
        { from: 'Global Gateway Hub (Air)', to: 'Country Hub Airport', type: 'Air', days: 1, cost: 800 },
        { from: 'Country Hub Airport', to: destination.city || 'Destination Hub', type: 'Road', days: 1, cost: 150 }
      );
    } else if (deliveryMode === 'road') {
      routes.push(
        { from: origin.city || 'Origin Warehouse', to: 'State Hub (Surface)', type: 'Road', days: 2, cost: 120 },
        { from: 'State Hub (Surface)', to: 'District Hub', type: 'Road', days: 1, cost: 60 },
        { from: 'District Hub', to: destination.city || 'Destination Hub', type: 'Road', days: 1, cost: 30 }
      );
    } else if (deliveryMode === 'rail') {
      routes.push(
        { from: origin.city || 'Origin Warehouse', to: 'Central Rail Terminal', type: 'Road', days: 1, cost: 100 },
        { from: 'Central Rail Terminal', to: 'State Rail Depot', type: 'Rail', days: 2, cost: 80 },
        { from: 'State Rail Depot', to: destination.city || 'Destination Hub', type: 'Road', days: 1, cost: 50 }
      );
    } else if (deliveryMode === 'water') {
      routes.push(
        { from: origin.city || 'Origin Warehouse', to: 'International Container Port', type: 'Road', days: 2, cost: 150 },
        { from: 'International Container Port', to: 'Country Sea Port', type: 'Water', days: 8, cost: 350 },
        { from: 'Country Sea Port', to: destination.city || 'Destination Hub', type: 'Road', days: 2, cost: 100 }
      );
    } else { // hybrid (multi-stage global network!)
      const isInter = origin.country !== destination.country;
      if (isInter) {
        routes.push(
          { from: `${origin.city}, ${origin.country}`, to: 'International Airport', type: 'Air', days: 1, cost: 900 },
          { from: 'International Airport', to: 'India Central Hub', type: 'Air', days: 2, cost: 1500 },
          { from: 'India Central Hub', to: `${destination.state} State Hub`, type: 'Road', days: 2, cost: 400 },
          { from: `${destination.state} State Hub`, to: `${destination.city} District Hub`, type: 'Road', days: 1, cost: 200 },
          { from: `${destination.city} District Hub`, to: destination.area || 'Last Mile Area', type: 'Road', days: 1, cost: 100 }
        );
      } else {
        routes.push(
          { from: origin.city || 'Origin Warehouse', to: `${destination.state} State Hub`, type: 'Road', days: 1, cost: 250 },
          { from: `${destination.state} State Hub`, to: `${destination.city} District Hub`, type: 'Road', days: 1, cost: 150 },
          { from: `${destination.city} District Hub`, to: destination.area || 'Last Mile Area', type: 'Road', days: 1, cost: 80 }
        );
      }
    }

    // Insert routes into DB
    const routeInserts = routes.map((r, idx) => ({
      route_id: `RTE-${idx + 1}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      shipment_id: shipment.id,
      from_location: r.from,
      to_location: r.to,
      transport_type: r.type,
      contractor_id: contractorId,
      sequence_order: idx + 1,
      estimated_days: r.days,
      cost: r.cost
    }));

    await insforge.database.from('delivery_routes').insert(routeInserts);

    // 4. Create initial tracking entry
    await insforge.database.from('tracking').insert([{
      tracking_id: `LOC-1-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      shipment_id: shipment.id,
      status: 'Shipment Request',
      location: origin.city || 'Origin Warehouse'
    }]);

    // 5. Update order details
    const { data: order } = await insforge.database.from('orders').select('payment_details').eq('id', orderId).single();
    const existingDetails = order?.payment_details || {};
    const updatedDetails = {
      ...existingDetails,
      tracking_number: trackingId,
      courier: contractorName,
      dispatched_at: new Date().toISOString(),
      otp_code: otpCode
    };

    await insforge.database.from('orders').update({
      order_status: 'Shipped',
      payment_details: updatedDetails,
      updated_at: new Date().toISOString()
    }).eq('id', orderId);

    // 6. Insert order status history
    await insforge.database.from('order_status_history').insert([{
      order_id: orderId,
      status: 'Shipped',
      note: `Courier Shipment Dispatched via ${contractorName} (${vehicleType}). AWB Tracking: ${trackingId}. Last-mile OTP code sent to customer.`
    }]);

    return { success: true, shipmentId: shipment.id, trackingId, otpCode };
  },

  getShipmentByOrderId: async (orderId) => {
    const { data: shipment, error: sErr } = await insforge.database
      .from('shipments')
      .select('*, contractors(*), vehicles(*)')
      .eq('order_id', orderId)
      .maybeSingle();

    if (sErr) throw new Error(sErr.message);
    if (!shipment) return { success: true, shipment: null };

    const { data: routes } = await insforge.database
      .from('delivery_routes')
      .select('*')
      .eq('shipment_id', shipment.id)
      .order('sequence_order', { ascending: true });

    const { data: tracking } = await insforge.database
      .from('tracking')
      .select('*')
      .eq('shipment_id', shipment.id)
      .order('timestamp', { ascending: false });

    const { data: events } = await insforge.database
      .from('shipment_events')
      .select('*')
      .eq('shipment_id', shipment.id)
      .order('timestamp', { ascending: true });

    return {
      success: true,
      shipment: {
        ...shipment,
        routes: routes || [],
        tracking: tracking || [],
        events: events || []
      }
    };
  },

  updateShipmentStatus: async ({ shipmentId, status, location, note, estimatedDelivery }) => {
    // Update shipment table
    const updateFields = {
      updated_at: new Date().toISOString()
    };
    if (status) updateFields.status = status;
    if (location !== undefined) updateFields.current_location = location;
    if (estimatedDelivery !== undefined) updateFields.estimated_delivery = estimatedDelivery;
    if (status === 'Delivered') {
      updateFields.actual_delivery = new Date().toISOString();
    }

    const { error: uErr } = await insforge.database
      .from('shipments')
      .update(updateFields)
      .eq('id', shipmentId);
    if (uErr) throw new Error(uErr.message);

    // Insert tracking entry (legacy)
    await insforge.database.from('tracking').insert([{
      tracking_id: `LOC-${Date.now().toString(36).toUpperCase()}`,
      shipment_id: shipmentId,
      status: status || 'Updated',
      location: location || ''
    }]);

    // Insert shipment event
    await insforge.database.from('shipment_events').insert([{
      shipment_id: shipmentId,
      status: status || 'Updated',
      location: location || '',
      description: note || `Shipment advanced to: ${status || 'Updated'}`
    }]);

    // Fetch shipment to get order ID and destination
    const { data: shipment } = await insforge.database.from('shipments').select('order_id, otp_code, destination, vehicles(driver_name, driver_phone)').eq('id', shipmentId).single();
    let smsSent = false;
    let customerPhone = null;

    if (shipment && status) {
      let orderStatus = '';
      let historyNote = note || `Shipment advanced to: ${status} in ${location || 'Transit'}`;

      if (status === 'pickup_scheduled' || status === 'picked_up') {
        orderStatus = 'Confirmed';
      } else if (status === 'in_transit' || status === 'International Shipping' || status === 'Country Hub' || status === 'State Hub' || status === 'District Hub') {
        orderStatus = 'Shipped';
      } else if (status === 'Last Mile Delivery' || status === 'out_for_delivery') {
        orderStatus = 'Out for Delivery';
        const driverName = shipment.vehicles?.driver_name || 'Delivery Partner';
        const driverPhone = shipment.vehicles?.driver_phone || 'N/A';
        historyNote = `Package is out for delivery with ${driverName} (${driverPhone}). Please share OTP ${shipment.otp_code} upon safe receipt.`;

        // Simulate sending SMS to customer
        customerPhone = shipment.destination?.phone || 'registered number';
        console.log(`[SMS GATEWAY] Sending OTP ${shipment.otp_code} to ${customerPhone}`);
        smsSent = true;
      } else if (status === 'Delivered' || status === 'delivered') {
        orderStatus = 'Delivered';
        historyNote = `Package delivered successfully. Verification Complete.`;
      } else if (status === 'failed') {
        orderStatus = 'Cancelled';
      } else if (status === 'returned') {
        orderStatus = 'Returned';
      }

      if (orderStatus) {
        const orderUpdates = {
          order_status: orderStatus,
          updated_at: new Date().toISOString()
        };
        if (orderStatus === 'Delivered') {
          orderUpdates.delivered_at = new Date().toISOString();
          orderUpdates.payment_status = 'paid';
        }

        await insforge.database.from('orders').update(orderUpdates).eq('id', shipment.order_id);

        await insforge.database.from('order_status_history').insert([{
          order_id: shipment.order_id,
          status: orderStatus,
          note: historyNote
        }]);
      }
    }

    return { success: true, smsSent, customerPhone };
  },

  verifyOTPAndDeliver: async ({ shipmentId, otp }) => {
    const { data: shipment } = await insforge.database.from('shipments').select('*').eq('id', shipmentId).single();
    if (!shipment) throw new Error('Shipment not found');

    const cleanOtp = otp.trim().toUpperCase();
    const cleanDbOtp = shipment.otp_code.trim().toUpperCase();

    if (cleanOtp !== cleanDbOtp && cleanOtp !== cleanDbOtp.replace('OTP-', '')) {
      throw new Error('Invalid verification OTP code. Handoff rejected.');
    }

    // Update shipment status to Delivered
    await insforge.database.from('shipments').update({
      status: 'Delivered',
      actual_delivery: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', shipmentId);

    // Insert tracking
    await insforge.database.from('tracking').insert([{
      tracking_id: `LOC-DEL-${Date.now().toString(36).toUpperCase()}`,
      shipment_id: shipmentId,
      status: 'Delivered',
      location: shipment.destination?.city || 'Customer Address'
    }]);

    // Insert shipment event
    await insforge.database.from('shipment_events').insert([{
      shipment_id: shipmentId,
      status: 'Delivered',
      location: shipment.destination?.city || 'Customer Address',
      description: 'Shipment delivered successfully. Proof of delivery: Customer OTP verification verified successfully.'
    }]);

    // Update parent order to Delivered, paid, set delivered_at
    await insforge.database.from('orders').update({
      order_status: 'Delivered',
      payment_status: 'paid',
      delivered_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', shipment.order_id);

    // Insert order status history
    await insforge.database.from('order_status_history').insert([{
      order_id: shipment.order_id,
      status: 'Delivered',
      note: 'Shipment delivered successfully. Proof of delivery: Customer OTP verification verified successfully.'
    }]);

    return { success: true };
  },

  addShipmentEvent: async ({ shipmentId, status, location, note }) => {
    const { error } = await insforge.database.from('shipment_events').insert([{
      shipment_id: shipmentId,
      status,
      location,
      description: note
    }]);
    if (error) throw new Error(error.message);
    return { success: true };
  }
};


// ─── Helpers ─────────────────────────────────────────────

/** Normalize Postgres row → frontend-compatible product object */
function normalizeProduct(p) {
  if (!p) return p;
  return {
    _id: p.id,
    id: p.id,
    name: p.name,
    price: p.price,
    originalPrice: p.original_price,
    category: p.category,
    brand: p.brand,
    material: p.material,
    badge: p.badge,
    img: p.img,
    images: p.images || [],
    description: p.description,
    rating: parseFloat(p.rating) || 0,
    numReviews: p.num_reviews || 0,
    stock: p.stock,
    specs: p.specs || {},
    colors: p.colors || [],
    sizes: p.sizes || [],
    deliveryDays: p.delivery_days,
    seller: p.seller_id,
    returnPolicy: p.return_policy || { returnable: true, returnDays: 5 },
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    slug: p.slug,
    // Computed discount
    get discount() {
      if (this.originalPrice && this.originalPrice > this.price) {
        return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
      }
      return 0;
    },
  };
}

/** Normalize Postgres order row → frontend-compatible order object */
function normalizeOrder(o) {
  if (!o) return o;

  const delivered = o.delivered_at ? new Date(o.delivered_at) : null;
  const created = o.created_at ? new Date(o.created_at) : new Date();
  const isDelivered = o.order_status === 'Delivered';
  
  // Calculate dynamic return window based on the items' return policies
  let maxReturnDays = 5; // default fallback
  let isAnyItemReturnable = false;

  const orderItems = (o.order_items || []).map(item => {
    const prod = item.products ? normalizeProduct(item.products) : null;
    const returnable = prod?.returnPolicy?.returnable ?? true;
    const returnDays = prod?.returnPolicy?.returnDays ?? 5;
    
    if (returnable) {
      isAnyItemReturnable = true;
      if (returnDays > maxReturnDays) maxReturnDays = returnDays;
    }

    return {
      _id: item.id,
      product: item.product_id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
      color: item.color,
      size: item.size,
      returnable,
      returnDays,
    };
  });

  const returnWindowMs = maxReturnDays * 24 * 60 * 60 * 1000;
  
  const returnEligible = isDelivered && 
    o.return_status === 'none' && 
    isAnyItemReturnable &&
    (Date.now() - created.getTime() <= returnWindowMs);

  const returnDaysRemaining = isDelivered && o.return_status === 'none' && isAnyItemReturnable
    ? Math.max(0, Math.ceil((returnWindowMs - (Date.now() - created.getTime())) / (24 * 60 * 60 * 1000)))
    : 0;

  return {
    _id: o.id,
    id: o.id,
    orderId: o.order_id,
    orderNumber: o.order_number,
    orderStatus: o.order_status,
    shippingAddress: o.shipping_address,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    paymentDetails: o.payment_details || {},
    subtotal: o.subtotal,
    shippingCost: o.shipping_cost,
    discount: o.discount,
    couponCode: o.coupon_code,
    totalAmount: o.total_amount,
    estimatedDelivery: o.estimated_delivery,
    deliveredAt: o.delivered_at,
    returnStatus: o.return_status,
    returnReason: o.return_reason,
    returnRequestedAt: o.return_requested_at,
    returnEligible,
    returnDaysRemaining,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    orderItems,
    statusHistory: (o.order_status_history || []).map(h => ({
      status: h.status,
      timestamp: h.timestamp,
      note: h.note,
    })),
    user: o.profiles ? {
      firstName: o.profiles.first_name,
      lastName: o.profiles.last_name,
    } : undefined,
  };
}

/** Normalize address */
function normalizeAddress(a) {
  if (!a) return a;
  return {
    _id: a.id,
    id: a.id,
    label: a.label,
    name: a.name,
    phone: a.phone,
    country: a.country,
    state: a.state,
    district: a.district,
    city: a.city,
    area: a.area,
    landmark: a.landmark,
    pincode: a.pincode,
    line1: a.line1,
    isDefault: a.is_default,
  };
}
