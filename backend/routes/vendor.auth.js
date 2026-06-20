const express = require('express');
const router = express.Router();
const { createClient, createAdminClient } = require('@insforge/sdk');
const db = require('../config/db');

// Initialize InsForge client
const insforge = createClient({
  baseUrl: process.env.INSFORGE_URL,
  anonKey: process.env.INSFORGE_ANON_KEY,
  isServerMode: true
});

// Initialize InsForge Admin client (bypasses RLS using service role key)
let adminInsforge = null;
if (process.env.INSFORGE_URL && process.env.INSFORGE_SERVICE_ROLE_KEY) {
  adminInsforge = createAdminClient({
    baseUrl: process.env.INSFORGE_URL,
    apiKey: process.env.INSFORGE_SERVICE_ROLE_KEY
  });
}

router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, store_name, phone } = req.body;

    // 2. Validate all fields are present and non-empty
    if (!full_name || !email || !password || !store_name || !phone) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // 3. Validate email format and password length
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    // 4. Use InsForge SDK to sign up
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
      // 7. Return 409 if email is already registered
      const errMsg = authError.message.toLowerCase();
      if (errMsg.includes('already registered') || errMsg.includes('already exists')) {
        return res.status(409).json({ message: 'Email is already registered.' });
      }
      return res.status(400).json({ message: authError.message });
    }

    const userId = authData?.user?.id;
    if (!userId) {
      return res.status(500).json({ message: 'Failed to retrieve user ID.' });
    }

    // 5. Insert row into the vendors table (uses admin client to bypass RLS)
    const client = adminInsforge || insforge;
    const { error: dbError } = await client.database
      .from('vendors')
      .insert([
        {
          user_id: userId,
          store_name: store_name,
          status: 'pending'
        }
      ]);

    if (dbError) {
      console.error('Database insert error for vendor:', dbError.message);
      // Clean up orphaned InsForge user from database
      await db.query("DELETE FROM auth.users WHERE id = $1", [userId]).catch((cleanupErr) => {
        console.error('Failed to cleanup orphaned vendor auth user:', cleanupErr.message);
      });
      return res.status(500).json({ message: 'User created but failed to create vendor profile. Onboarding rolled back.' });
    }

    // 6. Return 201 on success
    return res.status(201).json({
      message: 'Vendor registered. Awaiting approval.',
      user_id: userId
    });

  } catch (error) {
    // 8. Return 500 for any other unexpected error
    console.error('Unexpected error during vendor registration:', error);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 2. Validate fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // 3. SignIn with password
    const { data: authData, error: authError } = await insforge.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      // 7. Return 401 for wrong credentials
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userId = authData.user.id;

    // 4. Query profiles table to check role
    const { data: profileData, error: profileError } = await insforge.database
      .from('profiles')
      .select('role, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profileData || profileData.role !== 'vendor') {
      await insforge.auth.signOut();
      return res.status(403).json({ error: 'This account is not registered as a vendor.' });
    }

    // 5. Query vendors table to check status
    const { data: vendorData, error: vendorError } = await insforge.database
      .from('vendors')
      .select('store_name, status')
      .eq('user_id', userId)
      .single();

    if (vendorError || !vendorData) {
      await insforge.auth.signOut();
      return res.status(403).json({ error: 'Vendor profile not found.' });
    }

    if (vendorData.status === 'pending') {
      await insforge.auth.signOut();
      return res.status(403).json({ error: 'Your vendor account is pending approval.' });
    }

    if (vendorData.status === 'rejected') {
      await insforge.auth.signOut();
      return res.status(403).json({ error: 'Your vendor application was rejected.' });
    }

    // 6. Return 200 on success
    return res.status(200).json({
      access_token: authData.accessToken,
      refresh_token: authData.refreshToken,
      user: {
        id: userId,
        email: authData.user.email,
        full_name: profileData.full_name,
        store_name: vendorData.store_name,
        status: vendorData.status
      }
    });

  } catch (error) {
    console.error('Unexpected error during vendor login:', error);
    return res.status(500).json({ error: 'An unexpected error occurred during login.' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token.' });
    }

    const { error } = await insforge.auth.signOut();

    if (error) {
      console.error('Error during logout:', error);
      return res.status(500).json({ error: 'Failed to invalidate session.' });
    }

    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Unexpected error during vendor logout:', error);
    return res.status(500).json({ error: 'An unexpected error occurred during logout.' });
  }
});

module.exports = router;
