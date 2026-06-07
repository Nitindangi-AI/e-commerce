-- ============================================
-- Migration 002: Missing Tables & Columns
-- ============================================

-- ──────────────────────────────────────────────
-- 1. Upgrade profiles table
-- ──────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male','female','non_binary','prefer_not_to_say'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email":true,"sms":false,"push":true,"order_updates":true,"promotions":false}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE DEFAULT UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_spent NUMERIC(12,2) DEFAULT 0;

-- ──────────────────────────────────────────────
-- 2. Upgrade products table
-- ──────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE DEFAULT 'SKU-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('men','women','unisex','kids'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS age_group TEXT DEFAULT 'adult';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_sold INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS wishlist_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock','low_stock','out_of_stock','discontinued'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_grams INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Auto slug trigger
CREATE OR REPLACE FUNCTION generate_product_slug() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(REGEXP_REPLACE(COALESCE(NEW.name,'product'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_product_slug ON products;
CREATE TRIGGER set_product_slug BEFORE INSERT ON products FOR EACH ROW EXECUTE FUNCTION generate_product_slug();

-- Auto stock_status trigger
CREATE OR REPLACE FUNCTION update_stock_status() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock = 0 THEN NEW.stock_status := 'out_of_stock';
  ELSIF NEW.stock <= NEW.low_stock_threshold THEN NEW.stock_status := 'low_stock';
  ELSE NEW.stock_status := 'in_stock';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_stock_status ON products;
CREATE TRIGGER set_stock_status BEFORE INSERT OR UPDATE OF stock ON products FOR EACH ROW EXECUTE FUNCTION update_stock_status();

-- ──────────────────────────────────────────────
-- 3. Categories table
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  parent_id UUID REFERENCES categories(id),
  image_url TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO categories (name, slug, sort_order) VALUES
('Men','men',1),('Women','women',2),('Kids','kids',3),
('Footwear','footwear',4),('Accessories','accessories',5),
('Sports','sports',6),('Ethnic','ethnic',7),('Western','western',8)
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────
-- 4. Product variants table
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE DEFAULT 'VAR-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8)),
  color TEXT DEFAULT '',
  size TEXT DEFAULT '',
  price_modifier NUMERIC(8,2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  img TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view variants" ON product_variants;
CREATE POLICY "Anyone can view variants" ON product_variants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Sellers manage own variants" ON product_variants;
CREATE POLICY "Sellers manage own variants" ON product_variants FOR ALL USING (
  EXISTS (SELECT 1 FROM products WHERE id = product_id AND seller_id = auth.uid())
);

-- ──────────────────────────────────────────────
-- 5. Payments table
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  method TEXT NOT NULL CHECK (method IN ('cod','upi','card','netbanking','wallet','emi')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','initiated','success','failed','refunded','cancelled')),
  gateway TEXT DEFAULT '',
  gateway_order_id TEXT DEFAULT '',
  gateway_payment_id TEXT DEFAULT '',
  failure_reason TEXT DEFAULT '',
  refund_amount NUMERIC(10,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own payments" ON payments;
CREATE POLICY "Users see own payments" ON payments FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin sees all payments" ON payments;
CREATE POLICY "Admin sees all payments" ON payments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ──────────────────────────────────────────────
-- 6. User notifications table
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('order_update','promotion','price_drop','back_in_stock','system','review_reminder')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notifications" ON user_notifications;
CREATE POLICY "Users manage own notifications" ON user_notifications FOR ALL USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 7. Inventory log table
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('restock','sale','return','adjustment','damage')),
  quantity_change INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reference_id UUID,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────
-- 8. Upgrade orders table
-- ──────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE DEFAULT 'ORD-' || TO_CHAR(NOW(),'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_reason TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_status TEXT DEFAULT 'none' CHECK (return_status IN ('none','requested','approved','picked_up','received','refunded','rejected'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_points_used INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_points_earned INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_message TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ──────────────────────────────────────────────
-- 9. Upgrade order_items table
-- ──────────────────────────────────────────────
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name TEXT DEFAULT '';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_img TEXT DEFAULT '';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size TEXT DEFAULT '';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES profiles(id);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT false;

-- ──────────────────────────────────────────────
-- 10. Upgrade reviews table
-- ──────────────────────────────────────────────
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS size_fit TEXT DEFAULT '' CHECK (size_fit IN ('','runs_small','true_to_size','runs_large'));
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_verified_purchase BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('published','pending','rejected','hidden'));
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_reply TEXT DEFAULT '';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ──────────────────────────────────────────────
-- 11. Production performance indexes
-- ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_total_sold ON products(total_sold DESC);
CREATE INDEX IF NOT EXISTS idx_products_avg_rating ON products(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON products(stock_status);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_fts ON products USING gin(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(description,'')));
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_id ON order_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(shipment_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON user_notifications(user_id);
