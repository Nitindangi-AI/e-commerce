-- ============================================
-- Migration 001: Critical Fixes
-- Run after insforge-setup.sql and insforge-multivendor.sql
-- ============================================

-- ──────────────────────────────────────────────
-- 1. CREATE profiles TABLE
--    Referenced in every RLS policy but never
--    defined in the original schema.
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT DEFAULT '',
  full_name TEXT DEFAULT '',
  display_name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'merchant', 'admin', 'superadmin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned', 'deleted')),
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create a profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;
CREATE POLICY "Admin can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ──────────────────────────────────────────────
-- 2. FIX price columns — INTEGER → NUMERIC
--    INTEGER truncates decimals; NUMERIC(p,s)
--    stores exact currency values.
-- ──────────────────────────────────────────────

-- Products
ALTER TABLE products
  ALTER COLUMN price TYPE NUMERIC(10,2) USING price::NUMERIC;

ALTER TABLE products
  ALTER COLUMN original_price TYPE NUMERIC(10,2) USING original_price::NUMERIC;

-- Orders
ALTER TABLE orders
  ALTER COLUMN total_amount TYPE NUMERIC(12,2) USING total_amount::NUMERIC;

ALTER TABLE orders
  ALTER COLUMN subtotal TYPE NUMERIC(12,2) USING subtotal::NUMERIC;

ALTER TABLE orders
  ALTER COLUMN shipping_cost TYPE NUMERIC(8,2) USING shipping_cost::NUMERIC;

ALTER TABLE orders
  ALTER COLUMN discount TYPE NUMERIC(10,2) USING discount::NUMERIC;

-- Coupons
ALTER TABLE coupons
  ALTER COLUMN discount TYPE NUMERIC(10,2) USING discount::NUMERIC;

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS usage_limit INTEGER DEFAULT 100;

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0;

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10,2) DEFAULT 0;


-- ──────────────────────────────────────────────
-- 3. FIX vendors table — add missing columns
-- ──────────────────────────────────────────────

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT '';

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT DEFAULT '';

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2) DEFAULT 10;

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS store_description TEXT DEFAULT '';

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS store_email TEXT DEFAULT '';

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS store_slug TEXT UNIQUE;

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS total_revenue NUMERIC(14,2) DEFAULT 0;

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) DEFAULT 0;
