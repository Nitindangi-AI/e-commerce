import { createClient } from '@insforge/sdk';

const VITE_INSFORGE_URL = process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL;
const VITE_INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY || process.env.VITE_INSFORGE_ANON_KEY;

const adminClient = createClient({
  baseUrl: VITE_INSFORGE_URL,
  anonKey: VITE_INSFORGE_ANON_KEY,
});

const usersToSeed = [
  {
    email: 'admin@trendy.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'TRENDY',
    phone: '+91 99999 00000',
    role: 'admin',
    isVendor: false
  },
  {
    email: 'seller1@trendy.com',
    password: 'seller123',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+91 98765 00001',
    role: 'vendor', // Succeeded check constraints!
    isVendor: true,
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
    role: 'customer', // Starts as 'customer' role until admin approves vendor status
    isVendor: true,
    storeName: 'OpticaLux Styles',
    panCard: 'FGHIJ5678K',
    gstNumber: '22BBBBB1111B2Z6',
    bankAccount: '987654321098',
    aadharNumber: '987654321098',
    status: 'pending' // Pending admin approval
  },
  {
    email: 'user1@trendy.com',
    password: 'user123',
    firstName: 'Alice',
    lastName: 'Brown',
    phone: '+91 98765 00003',
    role: 'customer',
    isVendor: false
  },
  {
    email: 'user2@trendy.com',
    password: 'user123',
    firstName: 'Bob',
    lastName: 'Green',
    phone: '+91 98765 00004',
    role: 'customer',
    isVendor: false
  }
];

const products = [
  { name: "Noir Chronograph", price: 34900, original_price: 45000, category: "Watches", brand: "Meridian", material: "Stainless Steel", badge: "Bestseller", img: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=800&auto=format&fit=crop","https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=800&auto=format&fit=crop","https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?q=80&w=800&auto=format&fit=crop"], description: "A timeless masterpiece featuring a midnight black dial, Swiss-made movement, and premium Italian leather strap. Water-resistant to 100m.", rating: 4.8, num_reviews: 124, stock: 8, specs: { Movement: "Swiss Quartz", Case: "Stainless Steel", "Water Resistance": "100m", Strap: "Italian Leather", Warranty: "2 Years" }, colors: ["Black","Brown","Navy"], delivery_days: 2 },
  { name: "Titanium Diver", price: 52000, original_price: null, category: "Watches", brand: "Meridian", material: "Titanium", badge: "Exclusive", img: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1547996160-81dfa63595aa?q=80&w=800&auto=format&fit=crop"], description: "Professional diving watch with Grade 5 titanium casing, sapphire crystal, and helium escape valve. 300m water resistance.", rating: 5.0, num_reviews: 19, stock: 2, specs: { Movement: "Automatic", Case: "Grade 5 Titanium", Crystal: "Sapphire", "Water Resistance": "300m", Warranty: "5 Years" }, colors: ["Silver","Black"], delivery_days: 4 },
  { name: "Rose Gold Chronograph", price: 42000, original_price: 55000, category: "Watches", brand: "Aurelian", material: "Rose Gold", badge: "Premium", img: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?q=80&w=800&auto=format&fit=crop"], description: "Rose gold-plated chronograph with mother-of-pearl dial, sapphire crystal, and Italian alligator strap.", rating: 4.9, num_reviews: 37, stock: 4, specs: { Movement: "Swiss Chronograph", Case: "Rose Gold Plated", Crystal: "Sapphire", Strap: "Alligator Leather", Warranty: "3 Years" }, colors: ["Rose Gold"], delivery_days: 3 },
  { name: "Carbon Sunglasses", price: 19900, original_price: 24900, category: "Eyewear", brand: "OpticaLux", material: "Carbon Fiber", badge: "Limited", img: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800&auto=format&fit=crop"], description: "Ultra-lightweight carbon fiber frames with polarized UV400 lenses. Scratch-resistant coating.", rating: 4.9, num_reviews: 203, stock: 3, specs: { Frame: "Carbon Fiber", Lens: "Polarized UV400", Weight: "18g", Coating: "Anti-Reflective", Warranty: "1 Year" }, colors: ["Matte Black","Tortoise"], delivery_days: 2 },
  { name: "Gold Aviators", price: 22000, original_price: 28000, category: "Eyewear", brand: "OpticaLux", material: "Metal", badge: "Sale", img: "https://images.unsplash.com/photo-1572635196237-14b3f281501f?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1572635196237-14b3f281501f?q=80&w=800&auto=format&fit=crop"], description: "Classic gold-rimmed aviator sunglasses with gradient-tinted lenses.", rating: 4.4, num_reviews: 72, stock: 20, specs: { Frame: "Gold-Plated Metal", Lens: "Gradient Tint", "UV Protection": "UV400", Weight: "25g", Warranty: "1 Year" }, colors: ["Gold","Silver","Rose Gold"], delivery_days: 2 },
  { name: "Pilot Aviators", price: 12900, original_price: 15000, category: "Eyewear", brand: "Vistara Optics", material: "Stainless Steel", badge: "Sale", img: "https://images.unsplash.com/photo-1508296695146-257a814070b4?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1508296695146-257a814070b4?q=80&w=800&auto=format&fit=crop"], description: "Military-spec pilot aviators with Zeiss optics and spring-loaded temples.", rating: 4.6, num_reviews: 91, stock: 18, specs: { Frame: "Stainless Steel", Lens: "Zeiss Mineral Glass", "UV Protection": "UV400", Weight: "28g", Warranty: "2 Years" }, colors: ["Gunmetal","Gold"], delivery_days: 2 },
  { name: "Velvet Sneakers", price: 25900, original_price: null, category: "Footwear", brand: "StrideX", material: "Velvet", badge: "Hot", img: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800&auto=format&fit=crop"], description: "Premium velvet-finished sneakers with memory foam insoles.", rating: 4.7, num_reviews: 89, stock: 15, specs: { Upper: "Velvet Fabric", Sole: "Rubber", Insole: "Memory Foam", Closure: "Lace-Up", Warranty: "6 Months" }, colors: ["White","Black","Grey"], sizes: ["UK 7","UK 8","UK 9","UK 10","UK 11"], delivery_days: 3 },
  { name: "Suede Loafers", price: 18500, original_price: null, category: "Footwear", brand: "StrideX", material: "Suede", badge: "", img: "https://images.unsplash.com/photo-1614252339460-e1ca4be584cc?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1614252339460-e1ca4be584cc?q=80&w=800&auto=format&fit=crop"], description: "Handcrafted Italian suede loafers with blake-stitched construction.", rating: 4.8, num_reviews: 47, stock: 12, specs: { Upper: "Italian Suede", Sole: "Leather", Construction: "Blake Stitch", Lining: "Calfskin", Warranty: "6 Months" }, colors: ["Tan","Navy","Burgundy"], sizes: ["UK 7","UK 8","UK 9","UK 10","UK 11"], delivery_days: 3 },
  { name: "Leather Derby", price: 21500, original_price: null, category: "Footwear", brand: "StrideX", material: "Leather", badge: "New", img: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=800&auto=format&fit=crop"], description: "Classic derby shoe in burnished calfskin leather with Goodyear-welted sole.", rating: 4.8, num_reviews: 41, stock: 9, specs: { Upper: "Burnished Calfskin", Sole: "Leather + Rubber", Construction: "Goodyear Welt", Lining: "Full Leather", Warranty: "1 Year" }, colors: ["Brown","Black","Oxblood"], sizes: ["UK 7","UK 8","UK 9","UK 10","UK 11"], delivery_days: 3 },
  { name: "Obsidian Wallet", price: 8900, original_price: null, category: "Accessories", brand: "Artisan & Co.", material: "Leather", badge: "New", img: "https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=800&auto=format&fit=crop"], description: "Minimalist full-grain leather wallet with RFID blocking technology.", rating: 4.6, num_reviews: 58, stock: 25, specs: { Material: "Full-Grain Leather", RFID: "Yes", "Card Slots": "8", Dimensions: "11 × 9 × 1.5 cm", Warranty: "1 Year" }, colors: ["Black","Tan"], delivery_days: 3 },
  { name: "Leather Duffle", price: 29900, original_price: 35000, category: "Accessories", brand: "Artisan & Co.", material: "Leather", badge: "Essential", img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800&auto=format&fit=crop"], description: "Spacious weekend duffle bag crafted from full-grain vegetable-tanned leather.", rating: 4.7, num_reviews: 63, stock: 7, specs: { Material: "Full-Grain Leather", Hardware: "Solid Brass", Capacity: "45L", Dimensions: "55 × 28 × 30 cm", Warranty: "2 Years" }, colors: ["Brown","Black"], delivery_days: 4 },
  { name: "Titanium Cufflinks", price: 6900, original_price: 9500, category: "Accessories", brand: "Meridian", material: "Titanium", badge: "Sale", img: "https://images.unsplash.com/photo-1590736969955-71cc94901144?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1590736969955-71cc94901144?q=80&w=800&auto=format&fit=crop"], description: "Precision-machined Grade 5 titanium cufflinks with brushed satin finish.", rating: 4.5, num_reviews: 34, stock: 30, specs: { Material: "Grade 5 Titanium", Finish: "Brushed Satin", Closure: "Toggle", Weight: "12g/pair", Warranty: "1 Year" }, colors: ["Silver","Gunmetal"], delivery_days: 2 },
  { name: "Oxford Classic Shirt", price: 4500, original_price: 5900, category: "Shirts", brand: "ThreadCraft", material: "Cotton", badge: "Bestseller", img: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop"], description: "Premium Oxford cotton shirt with a tailored fit and mother-of-pearl buttons.", rating: 4.7, num_reviews: 156, stock: 35, specs: { Fabric: "100% Oxford Cotton", Fit: "Tailored", Collar: "Button-Down", Buttons: "Mother-of-Pearl", Warranty: "3 Months" }, colors: ["White","Blue","Pink"], sizes: ["S","M","L","XL","XXL"], delivery_days: 2 },
  { name: "Linen Casual Shirt", price: 3800, original_price: null, category: "Shirts", brand: "ThreadCraft", material: "Linen", badge: "New", img: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop"], description: "Breathable pure linen shirt, perfect for summer. Relaxed fit with mandarin collar.", rating: 4.5, num_reviews: 89, stock: 22, specs: { Fabric: "100% Linen", Fit: "Relaxed", Collar: "Mandarin", Style: "Casual", Warranty: "3 Months" }, colors: ["Beige","Olive","White"], sizes: ["S","M","L","XL","XXL"], delivery_days: 2 },
  { name: "Silk Formal Shirt", price: 7200, original_price: 9000, category: "Shirts", brand: "Aurelian", material: "Silk", badge: "Premium", img: "https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?q=80&w=800&auto=format&fit=crop"], description: "Luxurious mulberry silk shirt with French cuffs. Perfect for black-tie events.", rating: 4.9, num_reviews: 28, stock: 6, specs: { Fabric: "Mulberry Silk", Fit: "Slim", Collar: "Spread", Cuffs: "French", Warranty: "6 Months" }, colors: ["Ivory","Black","Navy"], sizes: ["S","M","L","XL"], delivery_days: 3 },
  { name: "Slim Fit Chinos", price: 3200, original_price: 4200, category: "Pants", brand: "ThreadCraft", material: "Cotton", badge: "Bestseller", img: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=800&auto=format&fit=crop"], description: "Stretch cotton chinos with a modern slim fit. Comfortable for office or weekend.", rating: 4.6, num_reviews: 210, stock: 40, specs: { Fabric: "98% Cotton 2% Elastane", Fit: "Slim", Rise: "Mid-Rise", Pockets: "4", Warranty: "3 Months" }, colors: ["Khaki","Navy","Olive","Black"], sizes: ["28","30","32","34","36"], delivery_days: 2 },
  { name: "Wool Trousers", price: 8500, original_price: null, category: "Pants", brand: "Aurelian", material: "Wool", badge: "Premium", img: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800&auto=format&fit=crop"], description: "Italian wool trousers with a flat-front design. Perfect drape and wrinkle-resistant.", rating: 4.8, num_reviews: 42, stock: 10, specs: { Fabric: "100% Italian Wool", Fit: "Regular", Rise: "High-Rise", Closure: "Hook & Zip", Warranty: "6 Months" }, colors: ["Charcoal","Navy","Brown"], sizes: ["30","32","34","36"], delivery_days: 3 },
  { name: "Denim Jeans", price: 4800, original_price: 6000, category: "Pants", brand: "StrideX", material: "Denim", badge: "Sale", img: "https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800&auto=format&fit=crop"], description: "Premium selvedge denim jeans with a classic straight fit. Japanese fabric.", rating: 4.7, num_reviews: 134, stock: 28, specs: { Fabric: "14oz Selvedge Denim", Fit: "Straight", Rise: "Mid-Rise", Wash: "Indigo", Warranty: "6 Months" }, colors: ["Indigo","Black","Light Wash"], sizes: ["28","30","32","34","36"], delivery_days: 2 },
  { name: "Beard Oil Kit", price: 1800, original_price: 2500, category: "Grooming", brand: "Noir Homme", material: "Natural Oils", badge: "Bestseller", img: "https://images.unsplash.com/photo-1621607512214-68297480165e?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1621607512214-68297480165e?q=80&w=800&auto=format&fit=crop"], description: "Premium beard oil kit with argan, jojoba, and vitamin E. Includes dropper bottle and comb.", rating: 4.6, num_reviews: 312, stock: 50, specs: { Ingredients: "Argan, Jojoba, Vitamin E", Volume: "50ml", Type: "Beard Care", "Skin Type": "All", Warranty: "N/A" }, colors: [], delivery_days: 2 },
  { name: "Luxury Perfume Set", price: 12500, original_price: 16000, category: "Grooming", brand: "Aurelian", material: "Glass", badge: "Limited", img: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=800&auto=format&fit=crop"], description: "Trio of luxury eau de parfum. Notes of oud, sandalwood, and bergamot. Gift boxed.", rating: 4.8, num_reviews: 67, stock: 8, specs: { Volume: "3 × 30ml", Notes: "Oud, Sandalwood, Bergamot", Longevity: "8-10 hours", Type: "Eau de Parfum", Warranty: "N/A" }, colors: [], delivery_days: 3 },
  { name: "Shaving Kit Deluxe", price: 3500, original_price: null, category: "Grooming", brand: "Noir Homme", material: "Stainless Steel", badge: "New", img: "https://images.unsplash.com/photo-1585751119414-ef2636f8aede?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1585751119414-ef2636f8aede?q=80&w=800&auto=format&fit=crop"], description: "Complete shaving set with safety razor, badger brush, and sandalwood cream.", rating: 4.7, num_reviews: 98, stock: 15, specs: { Razor: "Double-Edge Safety", Brush: "Badger Hair", Cream: "Sandalwood", Material: "Stainless Steel + Wood", Warranty: "1 Year" }, colors: [], delivery_days: 2 },
];

const coupons = [
  { code: "TRENDY10", discount: 10, type: "percent", min_order: 5000, description: "10% off on orders above ₹5,000" },
  { code: "FIRST500", discount: 500, type: "flat", min_order: 2000, description: "₹500 off on your first order" },
  { code: "TRENDY20", discount: 20, type: "percent", min_order: 15000, description: "20% off on orders above ₹15,000", max_discount: 5000 },
];

async function seed() {
  console.log('🏁 Starting complete InsForge database seed (Without deleting existing data)...');

  // 1. Seed Users & Profiles
  const userIds = {};

  for (const u of usersToSeed) {
    console.log(`\nProcessing ${u.role}: ${u.email}...`);
    try {
      const client = createClient({
        baseUrl: VITE_INSFORGE_URL,
        anonKey: VITE_INSFORGE_ANON_KEY,
      });

      let userId;
      
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

      userIds[u.email] = userId;

      // Update or Insert profile row
      const { data: existingProfile } = await client.database
        .from('profiles')
        .select()
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile) {
        console.log(`ℹ️ Profile already exists for ${u.email}. Resetting profile role and details...`);
        const { error: profileError } = await client.database
          .from('profiles')
          .update({
            first_name: u.firstName,
            last_name: u.lastName,
            phone: u.phone,
            role: u.role,
            avatar_url: u.email,
          })
          .eq('id', userId);
        
        if (profileError) console.error(`❌ Profile update failed:`, profileError.message);
        else console.log(`✅ Profile reset successfully!`);
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

      // If user is vendor, insert/update vendor onboarding row
      if (u.isVendor) {
        const { data: existingVendor } = await client.database
          .from('vendors')
          .select()
          .eq('user_id', userId)
          .maybeSingle();

        if (existingVendor) {
          console.log(`ℹ️ Vendor record already exists. Resetting status...`);
          const { error: vendorError } = await client.database
            .from('vendors')
            .update({
              store_name: u.storeName,
              pan_card: u.panCard,
              gst_number: u.gstNumber,
              bank_account: u.bankAccount,
              aadhar_number: u.aadharNumber,
              status: u.status,
              commission_rate: 10.00
            })
            .eq('user_id', userId);
          if (vendorError) console.error(`❌ Vendor reset failed:`, vendorError.message);
          else console.log(`✅ Vendor record reset (Status: ${u.status})`);
        } else {
          const { error: vendorError } = await client.database.from('vendors').insert([{
            user_id: userId,
            store_name: u.storeName,
            pan_card: u.panCard,
            gst_number: u.gstNumber,
            bank_account: u.bankAccount,
            aadhar_number: u.aadharNumber,
            status: u.status,
            commission_rate: 10.00
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

  // 3. Seed Premium Products under approved seller1 (Checks if already exists by name)
  const sellerId = userIds['seller1@trendy.com'];
  if (!sellerId) {
    console.error('❌ Could not obtain seller1 user ID. Skipping product seeding.');
  } else {
    console.log(`\n📦 Checking and seeding premium products under seller_id: ${sellerId}...`);
    
    // Fetch current products to avoid duplicates
    const { data: existingProducts, error: prodFetchError } = await adminClient.database.from('products').select('name');
    const existingNames = new Set((existingProducts || []).map(p => p.name));

    const productsToInsert = [];
    for (const p of products) {
      if (!existingNames.has(p.name)) {
        productsToInsert.push({
          ...p,
          seller_id: sellerId,
          return_policy: { returnable: true, returnDays: 5 }
        });
      } else {
        console.log(`ℹ️ Product '${p.name}' already exists in database, skipping...`);
      }
    }

    if (productsToInsert.length > 0) {
      try {
        const { error } = await adminClient.database.from('products').insert(productsToInsert);
        if (error) {
          console.error('❌ Products seeding failed:', error.message);
        } else {
          console.log(`✅ Successfully seeded ${productsToInsert.length} new premium products!`);
        }
      } catch (err) {
        console.error('❌ Unexpected error seeding products:', err);
      }
    } else {
      console.log('ℹ️ All premium products already exist in the database.');
    }
  }

  // 4. Seed Coupons (Checks if already exists by code)
  console.log('\n🎟️ Checking and seeding platform coupons...');
  try {
    const { data: existingCoupons } = await adminClient.database.from('coupons').select('code');
    const existingCodes = new Set((existingCoupons || []).map(c => c.code));

    const couponsToInsert = coupons.filter(c => !existingCodes.has(c.code));

    if (couponsToInsert.length > 0) {
      const { error } = await adminClient.database.from('coupons').insert(couponsToInsert);
      if (error) {
        console.error('❌ Coupons seeding failed:', error.message);
      } else {
        console.log(`✅ Successfully seeded ${couponsToInsert.length} new coupons!`);
      }
    } else {
      console.log('ℹ️ All coupons already exist in the database.');
    }
  } catch (err) {
    console.error('❌ Unexpected error seeding coupons:', err);
  }

  console.log('\n🎉 ALL SEEDING TASKS COMPLETED SUCCESSFULLY!');
}

seed();
