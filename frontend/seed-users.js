import { createClient } from '@insforge/sdk';

const VITE_INSFORGE_URL = 'https://r7q99f5d.us-east.insforge.app';
const VITE_INSFORGE_ANON_KEY = 'ik_84619633df209ae1fafdaf404bfbd91a';

const usersToSeed = [
  {
    email: 'admin@trendy.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'TRENDY',
    phone: '+91 99999 00000',
    role: 'admin'
  },
  {
    email: 'seller1@trendy.com',
    password: 'seller123',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+91 98765 00001',
    role: 'vendor',
    storeName: 'Meridian Timepieces',
    panCard: 'ABCDE1234F',
    gstNumber: '22AAAAA0000A1Z5',
    bankAccount: '123456789012',
    aadharNumber: '123456789012',
    status: 'approved'
  },
  {
    email: 'seller2@trendy.com',
    password: 'seller123',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '+91 98765 00002',
    role: 'vendor',
    storeName: 'OpticaLux Styles',
    panCard: 'FGHIJ5678K',
    gstNumber: '22BBBBB1111B2Z6',
    bankAccount: '987654321098',
    aadharNumber: '987654321098',
    status: 'pending' // Let one be pending so the admin can test approval flow!
  },
  {
    email: 'user1@trendy.com',
    password: 'user123',
    firstName: 'Alice',
    lastName: 'Brown',
    phone: '+91 98765 00003',
    role: 'customer'
  },
  {
    email: 'user2@trendy.com',
    password: 'user123',
    firstName: 'Bob',
    lastName: 'Green',
    phone: '+91 98765 00004',
    role: 'customer'
  }
];

async function seed() {
  console.log('🏁 Starting InsForge Auth & Profiles seed...');

  for (const u of usersToSeed) {
    console.log(`\nProcessing ${u.role}: ${u.email}...`);
    try {
      // Create a fresh client so we don't mix sessions
      const client = createClient({
        baseUrl: VITE_INSFORGE_URL,
        anonKey: VITE_INSFORGE_ANON_KEY,
      });

      let userId;
      
      // 1. Try SignUp
      const signUpRes = await client.auth.signUp({
        email: u.email,
        password: u.password,
        profile: { first_name: u.firstName, last_name: u.lastName },
      });

      if (signUpRes.error) {
        if (signUpRes.error.message.includes('already exists') || signUpRes.error.message.includes('registered')) {
          console.log(`ℹ️ User already exists in Auth. Logging in...`);
          const signInRes = await client.auth.signInWithPassword({
            email: u.email,
            password: u.password
          });
          if (signInRes.error) {
            console.error(`❌ Login failed for ${u.email}:`, signInRes.error.message);
            continue;
          }
          userId = signInRes.data.user.id;
          console.log(`✅ User logged in: ${userId}`);
        } else {
          console.error(`❌ SignUp failed for ${u.email}:`, signUpRes.error.message);
          continue;
        }
      } else {
        userId = signUpRes.data.user.id;
        console.log(`✅ User registered in Auth: ${userId}`);
      }

      // 2. Insert Profile (using the authenticated client for RLS)
      // Check if profile exists first
      const { data: existingProfile } = await client.database
        .from('profiles')
        .select()
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile) {
        console.log(`ℹ️ Profile already exists for ${u.email}`);
      } else {
        const { error: profileError } = await client.database.from('profiles').insert([{
          id: userId,
          first_name: u.firstName,
          last_name: u.lastName,
          phone: u.phone,
          role: u.role,
          avatar_url: u.email,
        }]);

        if (profileError) {
          console.error(`❌ Profile insert failed for ${u.email}:`, profileError.message);
          continue;
        }
        console.log(`✅ Profile created for ${u.email}`);
      }

      // 3. Insert Vendor (if role is vendor)
      if (u.role === 'vendor') {
        const { data: existingVendor } = await client.database
          .from('vendors')
          .select()
          .eq('user_id', userId)
          .maybeSingle();

        if (existingVendor) {
          console.log(`ℹ️ Vendor record already exists for ${u.email}`);
        } else {
          const { error: vendorError } = await client.database.from('vendors').insert([{
            user_id: userId,
            store_name: u.storeName,
            pan_card: u.panCard,
            gst_number: u.gstNumber,
            bank_account: u.bankAccount,
            aadhar_number: u.aadharNumber,
            status: u.status,
            commission_rate: 12.50
          }]);

          if (vendorError) {
            console.error(`❌ Vendor insert failed for ${u.email}:`, vendorError.message);
          } else {
            console.log(`✅ Vendor profile created (Status: ${u.status})`);
          }
        }
      }
    } catch (e) {
      console.error(`❌ Unexpected error for ${u.email}:`, e);
    }
  }

  console.log('\n🎉 Seeding finished successfully!');
}

seed();
