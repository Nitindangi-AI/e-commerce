const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("./models/Product");
const User = require("./models/User");
const Coupon = require("./models/Coupon");
const Review = require("./models/Review");

dotenv.config();

const products = [
  { name: "Noir Chronograph", price: 34900, originalPrice: 45000, category: "Watches", brand: "Meridian", material: "Stainless Steel", badge: "Bestseller", img: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=800&auto=format&fit=crop","https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=800&auto=format&fit=crop","https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?q=80&w=800&auto=format&fit=crop"], description: "A timeless masterpiece featuring a midnight black dial, Swiss-made movement, and premium Italian leather strap. Water-resistant to 100m.", rating: 4.8, numReviews: 124, stock: 8, specs: { Movement: "Swiss Quartz", Case: "Stainless Steel", "Water Resistance": "100m", Strap: "Italian Leather", Warranty: "2 Years" }, colors: ["Black","Brown","Navy"], deliveryDays: 2 },
  { name: "Titanium Diver", price: 52000, originalPrice: null, category: "Watches", brand: "Meridian", material: "Titanium", badge: "Exclusive", img: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1547996160-81dfa63595aa?q=80&w=800&auto=format&fit=crop"], description: "Professional diving watch with Grade 5 titanium casing, sapphire crystal, and helium escape valve. 300m water resistance.", rating: 5.0, numReviews: 19, stock: 2, specs: { Movement: "Automatic", Case: "Grade 5 Titanium", Crystal: "Sapphire", "Water Resistance": "300m", Warranty: "5 Years" }, colors: ["Silver","Black"], deliveryDays: 4 },
  { name: "Rose Gold Chronograph", price: 42000, originalPrice: 55000, category: "Watches", brand: "Aurelian", material: "Rose Gold", badge: "Premium", img: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?q=80&w=800&auto=format&fit=crop"], description: "Rose gold-plated chronograph with mother-of-pearl dial, sapphire crystal, and Italian alligator strap.", rating: 4.9, numReviews: 37, stock: 4, specs: { Movement: "Swiss Chronograph", Case: "Rose Gold Plated", Crystal: "Sapphire", Strap: "Alligator Leather", Warranty: "3 Years" }, colors: ["Rose Gold"], deliveryDays: 3 },
  { name: "Carbon Sunglasses", price: 19900, originalPrice: 24900, category: "Eyewear", brand: "OpticaLux", material: "Carbon Fiber", badge: "Limited", img: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800&auto=format&fit=crop"], description: "Ultra-lightweight carbon fiber frames with polarized UV400 lenses. Scratch-resistant coating.", rating: 4.9, numReviews: 203, stock: 3, specs: { Frame: "Carbon Fiber", Lens: "Polarized UV400", Weight: "18g", Coating: "Anti-Reflective", Warranty: "1 Year" }, colors: ["Matte Black","Tortoise"], deliveryDays: 2 },
  { name: "Gold Aviators", price: 22000, originalPrice: 28000, category: "Eyewear", brand: "OpticaLux", material: "Metal", badge: "Sale", img: "https://images.unsplash.com/photo-1572635196237-14b3f281501f?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1572635196237-14b3f281501f?q=80&w=800&auto=format&fit=crop"], description: "Classic gold-rimmed aviator sunglasses with gradient-tinted lenses.", rating: 4.4, numReviews: 72, stock: 20, specs: { Frame: "Gold-Plated Metal", Lens: "Gradient Tint", "UV Protection": "UV400", Weight: "25g", Warranty: "1 Year" }, colors: ["Gold","Silver","Rose Gold"], deliveryDays: 2 },
  { name: "Pilot Aviators", price: 12900, originalPrice: 15000, category: "Eyewear", brand: "Vistara Optics", material: "Stainless Steel", badge: "Sale", img: "https://images.unsplash.com/photo-1508296695146-257a814070b4?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1508296695146-257a814070b4?q=80&w=800&auto=format&fit=crop"], description: "Military-spec pilot aviators with Zeiss optics and spring-loaded temples.", rating: 4.6, numReviews: 91, stock: 18, specs: { Frame: "Stainless Steel", Lens: "Zeiss Mineral Glass", "UV Protection": "UV400", Weight: "28g", Warranty: "2 Years" }, colors: ["Gunmetal","Gold"], deliveryDays: 2 },
  { name: "Velvet Sneakers", price: 25900, originalPrice: null, category: "Footwear", brand: "StrideX", material: "Velvet", badge: "Hot", img: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800&auto=format&fit=crop"], description: "Premium velvet-finished sneakers with memory foam insoles.", rating: 4.7, numReviews: 89, stock: 15, specs: { Upper: "Velvet Fabric", Sole: "Rubber", Insole: "Memory Foam", Closure: "Lace-Up", Warranty: "6 Months" }, colors: ["White","Black","Grey"], sizes: ["UK 7","UK 8","UK 9","UK 10","UK 11"], deliveryDays: 3 },
  { name: "Suede Loafers", price: 18500, originalPrice: null, category: "Footwear", brand: "StrideX", material: "Suede", badge: "", img: "https://images.unsplash.com/photo-1614252339460-e1ca4be584cc?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1614252339460-e1ca4be584cc?q=80&w=800&auto=format&fit=crop"], description: "Handcrafted Italian suede loafers with blake-stitched construction.", rating: 4.8, numReviews: 47, stock: 12, specs: { Upper: "Italian Suede", Sole: "Leather", Construction: "Blake Stitch", Lining: "Calfskin", Warranty: "6 Months" }, colors: ["Tan","Navy","Burgundy"], sizes: ["UK 7","UK 8","UK 9","UK 10","UK 11"], deliveryDays: 3 },
  { name: "Leather Derby", price: 21500, originalPrice: null, category: "Footwear", brand: "StrideX", material: "Leather", badge: "New", img: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=800&auto=format&fit=crop"], description: "Classic derby shoe in burnished calfskin leather with Goodyear-welted sole.", rating: 4.8, numReviews: 41, stock: 9, specs: { Upper: "Burnished Calfskin", Sole: "Leather + Rubber", Construction: "Goodyear Welt", Lining: "Full Leather", Warranty: "1 Year" }, colors: ["Brown","Black","Oxblood"], sizes: ["UK 7","UK 8","UK 9","UK 10","UK 11"], deliveryDays: 3 },
  { name: "Obsidian Wallet", price: 8900, originalPrice: null, category: "Accessories", brand: "Artisan & Co.", material: "Leather", badge: "New", img: "https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=800&auto=format&fit=crop"], description: "Minimalist full-grain leather wallet with RFID blocking technology.", rating: 4.6, numReviews: 58, stock: 25, specs: { Material: "Full-Grain Leather", RFID: "Yes", "Card Slots": "8", Dimensions: "11 × 9 × 1.5 cm", Warranty: "1 Year" }, colors: ["Black","Tan"], deliveryDays: 3 },
  { name: "Leather Duffle", price: 29900, originalPrice: 35000, category: "Accessories", brand: "Artisan & Co.", material: "Leather", badge: "Essential", img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800&auto=format&fit=crop"], description: "Spacious weekend duffle bag crafted from full-grain vegetable-tanned leather.", rating: 4.7, numReviews: 63, stock: 7, specs: { Material: "Full-Grain Leather", Hardware: "Solid Brass", Capacity: "45L", Dimensions: "55 × 28 × 30 cm", Warranty: "2 Years" }, colors: ["Brown","Black"], deliveryDays: 4 },
  { name: "Titanium Cufflinks", price: 6900, originalPrice: 9500, category: "Accessories", brand: "Meridian", material: "Titanium", badge: "Sale", img: "https://images.unsplash.com/photo-1590736969955-71cc94901144?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1590736969955-71cc94901144?q=80&w=800&auto=format&fit=crop"], description: "Precision-machined Grade 5 titanium cufflinks with brushed satin finish.", rating: 4.5, numReviews: 34, stock: 30, specs: { Material: "Grade 5 Titanium", Finish: "Brushed Satin", Closure: "Toggle", Weight: "12g/pair", Warranty: "1 Year" }, colors: ["Silver","Gunmetal"], deliveryDays: 2 },
  { name: "Oxford Classic Shirt", price: 4500, originalPrice: 5900, category: "Shirts", brand: "ThreadCraft", material: "Cotton", badge: "Bestseller", img: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop"], description: "Premium Oxford cotton shirt with a tailored fit and mother-of-pearl buttons.", rating: 4.7, numReviews: 156, stock: 35, specs: { Fabric: "100% Oxford Cotton", Fit: "Tailored", Collar: "Button-Down", Buttons: "Mother-of-Pearl", Warranty: "3 Months" }, colors: ["White","Blue","Pink"], sizes: ["S","M","L","XL","XXL"], deliveryDays: 2 },
  { name: "Linen Casual Shirt", price: 3800, originalPrice: null, category: "Shirts", brand: "ThreadCraft", material: "Linen", badge: "New", img: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop"], description: "Breathable pure linen shirt, perfect for summer. Relaxed fit with mandarin collar.", rating: 4.5, numReviews: 89, stock: 22, specs: { Fabric: "100% Linen", Fit: "Relaxed", Collar: "Mandarin", Style: "Casual", Warranty: "3 Months" }, colors: ["Beige","Olive","White"], sizes: ["S","M","L","XL","XXL"], deliveryDays: 2 },
  { name: "Silk Formal Shirt", price: 7200, originalPrice: 9000, category: "Shirts", brand: "Aurelian", material: "Silk", badge: "Premium", img: "https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?q=80&w=800&auto=format&fit=crop"], description: "Luxurious mulberry silk shirt with French cuffs. Perfect for black-tie events.", rating: 4.9, numReviews: 28, stock: 6, specs: { Fabric: "Mulberry Silk", Fit: "Slim", Collar: "Spread", Cuffs: "French", Warranty: "6 Months" }, colors: ["Ivory","Black","Navy"], sizes: ["S","M","L","XL"], deliveryDays: 3 },
  { name: "Slim Fit Chinos", price: 3200, originalPrice: 4200, category: "Pants", brand: "ThreadCraft", material: "Cotton", badge: "Bestseller", img: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=800&auto=format&fit=crop"], description: "Stretch cotton chinos with a modern slim fit. Comfortable for office or weekend.", rating: 4.6, numReviews: 210, stock: 40, specs: { Fabric: "98% Cotton 2% Elastane", Fit: "Slim", Rise: "Mid-Rise", Pockets: "4", Warranty: "3 Months" }, colors: ["Khaki","Navy","Olive","Black"], sizes: ["28","30","32","34","36"], deliveryDays: 2 },
  { name: "Wool Trousers", price: 8500, originalPrice: null, category: "Pants", brand: "Aurelian", material: "Wool", badge: "Premium", img: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800&auto=format&fit=crop"], description: "Italian wool trousers with a flat-front design. Perfect drape and wrinkle-resistant.", rating: 4.8, numReviews: 42, stock: 10, specs: { Fabric: "100% Italian Wool", Fit: "Regular", Rise: "High-Rise", Closure: "Hook & Zip", Warranty: "6 Months" }, colors: ["Charcoal","Navy","Brown"], sizes: ["30","32","34","36"], deliveryDays: 3 },
  { name: "Denim Jeans", price: 4800, originalPrice: 6000, category: "Pants", brand: "StrideX", material: "Denim", badge: "Sale", img: "https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800&auto=format&fit=crop"], description: "Premium selvedge denim jeans with a classic straight fit. Japanese fabric.", rating: 4.7, numReviews: 134, stock: 28, specs: { Fabric: "14oz Selvedge Denim", Fit: "Straight", Rise: "Mid-Rise", Wash: "Indigo", Warranty: "6 Months" }, colors: ["Indigo","Black","Light Wash"], sizes: ["28","30","32","34","36"], deliveryDays: 2 },
  { name: "Beard Oil Kit", price: 1800, originalPrice: 2500, category: "Grooming", brand: "Noir Homme", material: "Natural Oils", badge: "Bestseller", img: "https://images.unsplash.com/photo-1621607512214-68297480165e?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1621607512214-68297480165e?q=80&w=800&auto=format&fit=crop"], description: "Premium beard oil kit with argan, jojoba, and vitamin E. Includes dropper bottle and comb.", rating: 4.6, numReviews: 312, stock: 50, specs: { Ingredients: "Argan, Jojoba, Vitamin E", Volume: "50ml", Type: "Beard Care", "Skin Type": "All", Warranty: "N/A" }, colors: [], deliveryDays: 2 },
  { name: "Luxury Perfume Set", price: 12500, originalPrice: 16000, category: "Grooming", brand: "Aurelian", material: "Glass", badge: "Limited", img: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=800&auto=format&fit=crop"], description: "Trio of luxury eau de parfum. Notes of oud, sandalwood, and bergamot. Gift boxed.", rating: 4.8, numReviews: 67, stock: 8, specs: { Volume: "3 × 30ml", Notes: "Oud, Sandalwood, Bergamot", Longevity: "8-10 hours", Type: "Eau de Parfum", Warranty: "N/A" }, colors: [], deliveryDays: 3 },
  { name: "Shaving Kit Deluxe", price: 3500, originalPrice: null, category: "Grooming", brand: "Noir Homme", material: "Stainless Steel", badge: "New", img: "https://images.unsplash.com/photo-1585751119414-ef2636f8aede?q=80&w=800&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1585751119414-ef2636f8aede?q=80&w=800&auto=format&fit=crop"], description: "Complete shaving set with safety razor, badger brush, and sandalwood cream.", rating: 4.7, numReviews: 98, stock: 15, specs: { Razor: "Double-Edge Safety", Brush: "Badger Hair", Cream: "Sandalwood", Material: "Stainless Steel + Wood", Warranty: "1 Year" }, colors: [], deliveryDays: 2 },
];

const coupons = [
  { code: "TRENDZ10", discount: 10, type: "percent", minOrder: 5000, description: "10% off on orders above ₹5,000" },
  { code: "FIRST500", discount: 500, type: "flat", minOrder: 2000, description: "₹500 off on your first order" },
  { code: "TRENDZ20", discount: 20, type: "percent", minOrder: 15000, description: "20% off on orders above ₹15,000", maxDiscount: 5000 },
];

const users = [
  { firstName: "Admin", lastName: "TRENDZ", email: "admin@trendz.com", password: "admin123", role: "admin", phone: "+91 99999 00000" },
  { firstName: "Alex", lastName: "Rivera", email: "alex@trendz.com", password: "test1234", role: "user", phone: "+91 98765 43210", addresses: [{ label: "Home", name: "Alex Rivera", phone: "+91 98765 43210", line1: "42, Park Street, Andheri West", city: "Mumbai", state: "Maharashtra", pincode: "400058", isDefault: true }, { label: "Office", name: "Alex Rivera", phone: "+91 98765 43210", line1: "Tech Park, Whitefield", city: "Bangalore", state: "Karnataka", pincode: "560066", isDefault: false }] },
];

const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

const connectDB = async () => {
  let uri = process.env.MONGO_URI;
  try {
    await mongoose.connect(uri || "mongodb://localhost:27017/luxe-ecommerce", {
      serverSelectionTimeoutMS: 3000,
    });
  } catch {
    console.log("⚡ Local MongoDB not found, starting in-memory server...");
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }
  console.log("✅ MongoDB connected for seeding");
};

const importData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Product.deleteMany();
    await User.deleteMany();
    await Coupon.deleteMany();
    await Review.deleteMany();

    // Seed users
    const createdUsers = await User.create(users);
    console.log(`✅ ${createdUsers.length} users seeded`);

    // Seed products
    const createdProducts = await Product.create(products);
    console.log(`✅ ${createdProducts.length} products seeded`);

    // Seed coupons
    const createdCoupons = await Coupon.create(coupons);
    console.log(`✅ ${createdCoupons.length} coupons seeded`);

    // Seed some reviews for the first product
    const testUser = createdUsers.find(u => u.role === "user");
    const firstProduct = createdProducts[0];
    if (testUser && firstProduct) {
      await Review.create([
        { user: testUser._id, product: firstProduct._id, rating: 5, title: "Absolutely stunning!", text: "The build quality is exceptional. Easily the best watch I own.", verified: true, helpful: 24 },
        { user: createdUsers[0]._id, product: firstProduct._id, rating: 4, title: "Great watch, minor issue", text: "Beautiful watch. Strap was slightly stiff initially but broke in after a week.", verified: false, helpful: 12 },
      ]);
      console.log("✅ Sample reviews seeded");
    }

    console.log("\n🎉 All data seeded successfully!\n");
    console.log("📧 Admin login: admin@trendz.com / admin123");
    console.log("📧 User login:  alex@trendz.com / test1234\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error.message);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await connectDB();
    await Product.deleteMany();
    await User.deleteMany();
    await Coupon.deleteMany();
    await Review.deleteMany();
    const Order = require("./models/Order");
    await Order.deleteMany();
    console.log("🗑️  All data destroyed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

if (process.argv[2] === "--import") importData();
else if (process.argv[2] === "--destroy") destroyData();
else { console.log("Usage: node seeder.js --import | --destroy"); process.exit(1); }
