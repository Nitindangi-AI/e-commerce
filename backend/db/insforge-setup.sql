-- ============================================
-- Trendy E-Commerce InsForge Schema
-- ============================================

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0), -- stored in paise. ₹1 = 100
  original_price INTEGER DEFAULT NULL, -- stored in paise. ₹1 = 100
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  material TEXT DEFAULT '',
  badge TEXT DEFAULT '',
  img TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  description TEXT NOT NULL,
  rating NUMERIC(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  num_reviews INTEGER DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  specs JSONB DEFAULT '{}',
  colors TEXT[] DEFAULT '{}',
  sizes TEXT[] DEFAULT '{}',
  delivery_days INTEGER DEFAULT 3,
  seller_id UUID REFERENCES auth.users(id),
  return_policy JSONB DEFAULT '{"returnable": true, "returnDays": 5}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_rating ON products(rating DESC);

-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT DEFAULT '',
  text TEXT DEFAULT '',
  verified BOOLEAN DEFAULT false,
  helpful INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Addresses table
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  country TEXT DEFAULT 'India',
  state TEXT NOT NULL,
  district TEXT DEFAULT '',
  city TEXT NOT NULL,
  area TEXT DEFAULT '',
  landmark TEXT DEFAULT '',
  pincode TEXT NOT NULL,
  line1 TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_addresses_user ON addresses(user_id);

-- Cart items table
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  selected_color TEXT DEFAULT '',
  selected_size TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id, selected_color, selected_size)
);

CREATE INDEX idx_cart_user ON cart_items(user_id);

-- Wishlist table
CREATE TABLE wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_wishlist_user ON wishlist(user_id);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL UNIQUE,
  order_status TEXT NOT NULL DEFAULT 'Processing' CHECK (order_status IN ('Processing', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Return Requested', 'Returned')),
  shipping_address JSONB NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cod' CHECK (payment_method IN ('cod', 'upi', 'card', 'netbanking')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_details JSONB DEFAULT '{}',
  subtotal INTEGER NOT NULL, -- stored in paise. ₹1 = 100
  shipping_cost INTEGER DEFAULT 0, -- stored in paise. ₹1 = 100
  discount INTEGER DEFAULT 0, -- stored in paise. ₹1 = 100
  coupon_code TEXT DEFAULT NULL,
  total_amount INTEGER NOT NULL, -- stored in paise. ₹1 = 100
  estimated_delivery TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  return_status TEXT DEFAULT 'none' CHECK (return_status IN ('none', 'requested', 'approved', 'rejected', 'completed')),
  return_reason TEXT DEFAULT '',
  return_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  name TEXT NOT NULL,
  price INTEGER NOT NULL, -- stored in paise. ₹1 = 100
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  image TEXT NOT NULL,
  color TEXT DEFAULT '',
  size TEXT DEFAULT ''
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Order status history
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT DEFAULT '',
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_status_history_order ON order_status_history(order_id);

-- Coupons table
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount INTEGER NOT NULL, -- stored in paise. ₹1 = 100 (if flat)
  type TEXT NOT NULL CHECK (type IN ('percent', 'flat')),
  min_order INTEGER DEFAULT 0, -- stored in paise. ₹1 = 100
  max_discount INTEGER DEFAULT NULL, -- stored in paise. ₹1 = 100
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
