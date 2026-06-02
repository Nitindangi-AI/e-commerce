-- ========================================================
-- Complete Multi-Vendor Marketplace DB Schema & RLS Setup
-- ========================================================

-- 1. Create Vendors Onboarding Table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL UNIQUE,
  store_logo TEXT DEFAULT '',
  store_banner TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  commission_rate NUMERIC(5,2) DEFAULT 10.00,
  pan_card TEXT DEFAULT '',
  gst_number TEXT DEFAULT '',
  bank_account TEXT DEFAULT '',
  aadhar_number TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on Vendors
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Recreate Vendors policies
DROP POLICY IF EXISTS "Public can read approved vendors" ON vendors;
CREATE POLICY "Public can read approved vendors" 
  ON vendors FOR SELECT USING (status = 'approved' OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own vendor profile" ON vendors;
CREATE POLICY "Users can manage own vendor profile" 
  ON vendors FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage all vendors" ON vendors;
CREATE POLICY "Admins manage all vendors" 
  ON vendors FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Upgrade Products RLS policies to allow Vendors to manage their own products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can insert products" ON products;
CREATE POLICY "Admin can insert products" ON products FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
  (auth.uid() = seller_id AND EXISTS (SELECT 1 FROM vendors WHERE user_id = auth.uid() AND status = 'approved'))
);

DROP POLICY IF EXISTS "Admin can update products" ON products;
CREATE POLICY "Admin can update products" ON products FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
  (auth.uid() = seller_id AND EXISTS (SELECT 1 FROM vendors WHERE user_id = auth.uid() AND status = 'approved'))
);

DROP POLICY IF EXISTS "Admin can delete products" ON products;
CREATE POLICY "Admin can delete products" ON products FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
  (auth.uid() = seller_id)
);

-- 3. Upgrade Orders RLS policies to allow Vendors to view & modify orders containing their products
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_vendor_for_order(p_order_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = p_order_id AND p.seller_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Users can read own orders" ON orders;
CREATE POLICY "Users can read own orders" ON orders FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
  is_vendor_for_order(id, auth.uid())
);

DROP POLICY IF EXISTS "Users can update own orders" ON orders;
CREATE POLICY "Users can update own orders" ON orders FOR UPDATE USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
  is_vendor_for_order(id, auth.uid())
);

-- 4. Upgrade Order Items RLS policies to allow Vendors to view order items of their products
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own order items" ON order_items;
CREATE POLICY "Users can read own order items" ON order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM products p 
    WHERE p.id = order_items.product_id AND p.seller_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
