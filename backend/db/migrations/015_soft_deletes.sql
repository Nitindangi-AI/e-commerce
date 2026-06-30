-- Alter tables to add deleted_at columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Recreate RLS policies for products to filter out soft-deleted products
DROP POLICY IF EXISTS "Public can read products" ON products;
CREATE POLICY "Public can read products" ON products FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Admin can insert products" ON products;
CREATE POLICY "Admin can insert products" ON products FOR INSERT WITH CHECK (
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
  (auth.uid() = seller_id AND EXISTS (SELECT 1 FROM vendors WHERE user_id = auth.uid() AND status = 'approved')))
);

DROP POLICY IF EXISTS "Admin can update products" ON products;
CREATE POLICY "Admin can update products" ON products
  FOR UPDATE
  USING (
    (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.uid() = seller_id AND EXISTS (
          SELECT 1 FROM vendors WHERE user_id = auth.uid() AND status = 'approved')))
    AND deleted_at IS NULL
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.uid() = seller_id AND EXISTS (
          SELECT 1 FROM vendors WHERE user_id = auth.uid() AND status = 'approved')))
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Admin can delete products" ON products;
CREATE POLICY "Admin can delete products" ON products
  FOR DELETE
  USING (
    (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.uid() = seller_id AND EXISTS (
          SELECT 1 FROM vendors WHERE user_id = auth.uid() AND status = 'approved')))
    AND deleted_at IS NULL
  );

-- Recreate RLS policies for orders to filter out soft-deleted orders
DROP POLICY IF EXISTS "Users can read own orders" ON orders;
CREATE POLICY "Users can read own orders" ON orders FOR SELECT USING (
  (user_id = auth.uid() OR
   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
   is_vendor_for_order(id, auth.uid()))
  AND deleted_at IS NULL
);

DROP POLICY IF EXISTS "Users can update own orders" ON orders;
CREATE POLICY "Users can update own orders" ON orders
  FOR UPDATE
  USING (
    (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR is_vendor_for_order(id, auth.uid()))
    AND deleted_at IS NULL
  )
  WITH CHECK (
    (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR is_vendor_for_order(id, auth.uid()))
    AND deleted_at IS NULL
  );
