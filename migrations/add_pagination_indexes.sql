-- Indexes to support ORDER BY columns used in paginated queries
-- Run once. All use IF NOT EXISTS so safe to re-run.

-- orders.created_at  (used in ORDER BY in getMyOrders + admin getAllOrders)
CREATE INDEX IF NOT EXISTS idx_orders_user_created   ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created        ON orders(created_at DESC);

-- reviews.created_at (used in ORDER BY in getProductReviews)
CREATE INDEX IF NOT EXISTS idx_reviews_product_created ON reviews(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_created         ON reviews(created_at DESC);

-- profiles.created_at (used in ORDER BY in admin getUsers)
CREATE INDEX IF NOT EXISTS idx_profiles_created ON profiles(created_at DESC);

-- vendors.created_at (used in ORDER BY in admin getVendors — already ordered)
CREATE INDEX IF NOT EXISTS idx_vendors_created ON vendors(created_at DESC);
