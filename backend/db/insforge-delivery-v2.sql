-- Migration: Delivery System v2
-- File: insforge-delivery-v2.sql

-- 1. Shipments table
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tracking_number TEXT NOT NULL UNIQUE,
  carrier TEXT DEFAULT 'Trendy Express',
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'pickup_scheduled', 'picked_up',
    'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'
  )),
  current_location TEXT DEFAULT '',
  estimated_delivery TIMESTAMPTZ,
  actual_delivery TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Shipment events table
CREATE TABLE shipment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT DEFAULT '',
  description TEXT DEFAULT '',
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- 3. Delivery slots table
CREATE TABLE delivery_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time TEXT NOT NULL CHECK (slot_time IN ('9AM-12PM', '12PM-3PM', '3PM-6PM', '6PM-9PM')),
  is_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Extend orders table
ALTER TABLE orders ADD COLUMN delivery_slot_id UUID REFERENCES delivery_slots(id);

-- 5. Function to generate tracking numbers
CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TRD' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 10));
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to auto‑insert shipment on order creation
CREATE OR REPLACE FUNCTION insert_shipment_on_order()
RETURNS TRIGGER AS $$
DECLARE
  new_tracking TEXT;
BEGIN
  new_tracking := generate_tracking_number();
  INSERT INTO shipments (order_id, tracking_number, status, created_at, updated_at)
  VALUES (NEW.id, new_tracking, 'pending', now(), now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_insert_shipment_after_order
AFTER INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION insert_shipment_on_order();

-- 7. Enable RLS on new tables
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_slots ENABLE ROW LEVEL SECURITY;

-- Policies (example, adjust per your role definitions)
-- Shipments
CREATE POLICY "Users can read their own shipment" ON shipments FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = shipments.order_id AND orders.user = auth.uid())
);
CREATE POLICY "Admins can read all shipments" ON shipments FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins or vendors can update shipments" ON shipments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'vendor'))
);

-- Shipment events (same as shipments)
CREATE POLICY "Users can read their shipment events" ON shipment_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM shipments WHERE shipments.id = shipment_events.shipment_id AND EXISTS (
    SELECT 1 FROM orders WHERE orders.id = shipments.order_id AND orders.user = auth.uid()
  ))
);
CREATE POLICY "Admins can read all shipment events" ON shipment_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins or vendors can write shipment events" ON shipment_events FOR INSERT, UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'vendor'))
);

-- Delivery slots
CREATE POLICY "Users can read/insert their own slots" ON delivery_slots FOR SELECT, INSERT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = delivery_slots.order_id AND orders.user = auth.uid())
);
CREATE POLICY "Admins can manage all slots" ON delivery_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
