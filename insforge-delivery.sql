-- ========================================================
-- COMPLETE DELIVERY NETWORK DATABASE SCHEMA
-- ========================================================

-- 1. Create Contractors Table
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  vehicle_types TEXT[] DEFAULT '{}',
  availability BOOLEAN DEFAULT true,
  rating NUMERIC(2,1) DEFAULT 5.0 CHECK (rating >= 1.0 AND rating <= 5.0),
  pricing INTEGER NOT NULL DEFAULT 100, -- base pricing in INR
  live_status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id TEXT UNIQUE NOT NULL,
  contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  capacity INTEGER NOT NULL, -- weight capacity in kg
  driver_name TEXT NOT NULL,
  driver_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Transit', 'Maintenance', 'Offline')),
  location TEXT DEFAULT 'India',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Shipments Table
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id TEXT UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES auth.users(id),
  delivery_mode TEXT NOT NULL CHECK (delivery_mode IN ('air', 'road', 'water', 'rail', 'hybrid')),
  status TEXT NOT NULL DEFAULT 'Shipment Request' CHECK (status IN (
    'Shipment Request', 'Contractor Received', 'Accept / Reject', 
    'Vehicle Assigned', 'Driver Assigned', 'Pickup Scheduled', 
    'International Shipping', 'Country Hub', 'State Hub', 
    'District Hub', 'Area Hub', 'Last Mile Delivery', 'OTP Verification', 'Delivered'
  )),
  origin JSONB NOT NULL,
  destination JSONB NOT NULL,
  contractor_id UUID REFERENCES contractors(id),
  vehicle_id UUID REFERENCES vehicles(id),
  otp_code TEXT NOT NULL DEFAULT '123456', -- unique verification code
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Delivery Routes Table
CREATE TABLE IF NOT EXISTS delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id TEXT UNIQUE NOT NULL,
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  transport_type TEXT NOT NULL, -- Air, Road, Water, Rail
  contractor_id UUID REFERENCES contractors(id),
  sequence_order INTEGER NOT NULL,
  estimated_days INTEGER DEFAULT 1,
  cost INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create Tracking Table
CREATE TABLE IF NOT EXISTS tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id TEXT UNIQUE NOT NULL,
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- ========================================================
-- ENABLE ROW LEVEL SECURITY
-- ========================================================
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- RLS POLICIES FOR NEW TABLES
-- ========================================================

-- 1. Contractors Policy (Public read, Admin all)
DROP POLICY IF EXISTS "Public read contractors" ON contractors;
CREATE POLICY "Public read contractors" ON contractors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage contractors" ON contractors;
CREATE POLICY "Admin manage contractors" ON contractors FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Vehicles Policy (Public read, Admin all)
DROP POLICY IF EXISTS "Public read vehicles" ON vehicles;
CREATE POLICY "Public read vehicles" ON vehicles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage vehicles" ON vehicles;
CREATE POLICY "Admin manage vehicles" ON vehicles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Shipments Policy (User read own shipments, Vendor read/update own, Admin all)
DROP POLICY IF EXISTS "Users read own shipments" ON shipments;
CREATE POLICY "Users read own shipments" ON shipments FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE id = shipments.order_id AND user_id = auth.uid()) OR
  vendor_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Vendors update own shipments" ON shipments;
CREATE POLICY "Vendors update own shipments" ON shipments FOR UPDATE USING (
  vendor_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admin manage shipments" ON shipments;
CREATE POLICY "Admin manage shipments" ON shipments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Delivery Routes Policy (Users/Vendors read associated, Admin manage)
DROP POLICY IF EXISTS "Users read associated routes" ON delivery_routes;
CREATE POLICY "Users read associated routes" ON delivery_routes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM shipments s
    LEFT JOIN orders o ON s.order_id = o.id
    WHERE s.id = delivery_routes.shipment_id AND (o.user_id = auth.uid() OR s.vendor_id = auth.uid())
  ) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admin manage routes" ON delivery_routes;
CREATE POLICY "Admin manage routes" ON delivery_routes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 5. Tracking Policy (Users/Vendors read associated, Admin & Vendor manage)
DROP POLICY IF EXISTS "Users read associated tracking" ON tracking;
CREATE POLICY "Users read associated tracking" ON tracking FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM shipments s
    LEFT JOIN orders o ON s.order_id = o.id
    WHERE s.id = tracking.shipment_id AND (o.user_id = auth.uid() OR s.vendor_id = auth.uid())
  ) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Vendors insert associated tracking" ON tracking;
CREATE POLICY "Vendors insert associated tracking" ON tracking FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM shipments WHERE id = tracking.shipment_id AND vendor_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admin manage tracking" ON tracking;
CREATE POLICY "Admin manage tracking" ON tracking FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ========================================================
-- SEED DATA SETUP
-- ========================================================

-- Seed Contractors
INSERT INTO contractors (contractor_id, name, country, state, district, vehicle_types, availability, rating, pricing, live_status) VALUES
('CON-DHLNET', 'DHL Smart Global Network', 'Global', 'All', 'All', ARRAY['Cargo Aircraft', 'Ship', 'Container'], true, 4.9, 1500, 'Active'),
('CON-FEDEX', 'FedEx Express Routing', 'Global', 'All', 'All', ARRAY['Cargo Aircraft', 'Truck', 'Mini Van'], true, 4.8, 1200, 'Active'),
('CON-DELHIV', 'Delhivery National Logistics', 'India', 'All', 'All', ARRAY['Container', 'Truck', 'Mini Van', 'Bike'], true, 4.7, 300, 'Active'),
('CON-BLUEDT', 'Bluedart Surface Premium', 'India', 'All', 'All', ARRAY['Cargo Aircraft', 'Truck', 'Mini Van'], true, 4.8, 450, 'Active'),
('CON-MPROAD', 'MP State Highway Roadways', 'India', 'Madhya Pradesh', 'All', ARRAY['Truck', 'Mini Van'], true, 4.3, 150, 'Active'),
('CON-VIDLOC', 'Vidisha Local Express Delivery', 'India', 'Madhya Pradesh', 'Vidisha', ARRAY['Mini Van', 'Scooter', 'Bike'], true, 4.6, 60, 'Active'),
('CON-INDDRV', 'Independent Owner-Driver Fleet', 'India', 'All', 'All', ARRAY['Mini Van', 'Scooter', 'Bike'], true, 4.5, 50, 'Active')
ON CONFLICT (contractor_id) DO NOTHING;

-- Seed Vehicles (linked to contractors)
INSERT INTO vehicles (vehicle_id, contractor_id, type, capacity, driver_name, driver_phone, status, location) VALUES
('VEH-DHL01', (SELECT id FROM contractors WHERE contractor_id = 'CON-DHLNET' LIMIT 1), 'Cargo Aircraft', 50000, 'Capt. Christopher Nolan', '+1 (555) 019-2831', 'Available', 'USA Global Hub'),
('VEH-FED02', (SELECT id FROM contractors WHERE contractor_id = 'CON-FEDEX' LIMIT 1), 'Cargo Aircraft', 45000, 'Capt. Sarah Connor', '+1 (555) 018-9922', 'Available', 'London Heathrow Airport'),
('VEH-DEL03', (SELECT id FROM contractors WHERE contractor_id = 'CON-DELHIV' LIMIT 1), 'Container', 15000, 'Rajesh Kumar', '+91 98234 56789', 'Available', 'Mumbai Port'),
('VEH-BLU04', (SELECT id FROM contractors WHERE contractor_id = 'CON-BLUEDT' LIMIT 1), 'Truck', 8000, 'Sukhwinder Singh', '+91 99123 45670', 'Available', 'Delhi Warehouse'),
('VEH-MPR05', (SELECT id FROM contractors WHERE contractor_id = 'CON-MPROAD' LIMIT 1), 'Mini Van', 2000, 'Ramesh Yadav', '+91 88776 54321', 'Available', 'Bhopal Hub'),
('VEH-VID06', (SELECT id FROM contractors WHERE contractor_id = 'CON-VIDLOC' LIMIT 1), 'Scooter', 50, 'Amit Sharma', '+91 77665 44321', 'Available', 'Vidisha Area Office'),
('VEH-VID07', (SELECT id FROM contractors WHERE contractor_id = 'CON-VIDLOC' LIMIT 1), 'Bike', 40, 'Rahul Verma', '+91 66554 33210', 'Available', 'Vidisha Bantinagar')
ON CONFLICT (vehicle_id) DO NOTHING;
