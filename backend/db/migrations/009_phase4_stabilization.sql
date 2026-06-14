-- ============================================
-- Migration 009: Phase 4 Stabilization
-- ============================================

-- 1. Create delivery_slots table if it doesn't exist
CREATE TABLE IF NOT EXISTS delivery_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time TEXT NOT NULL CHECK (slot_time IN ('9AM-12PM', '12PM-3PM', '3PM-6PM', '6PM-9PM')),
  is_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add delivery_slot_id to orders table if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_slot_id UUID REFERENCES delivery_slots(id);

-- 3. Fix return status constraint inconsistency in orders table
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_return_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_return_status_check1;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS return_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_return_status_check 
  CHECK (return_status IN ('none', 'requested', 'approved', 'picked_up', 'received', 'refunded', 'rejected', 'completed'));

-- 4. Fix broken RLS policies (using orders.user_id instead of orders.user)

-- Shipments Table Policy
DROP POLICY IF EXISTS "Users can read their own shipment" ON shipments;
CREATE POLICY "Users can read their own shipment" ON shipments FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = shipments.order_id AND orders.user_id = auth.uid())
);

-- Shipment Events Table Policy
DROP POLICY IF EXISTS "Users can read their own shipment events" ON shipment_events;
CREATE POLICY "Users can read their own shipment events" ON shipment_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM shipments WHERE shipments.id = shipment_events.shipment_id AND EXISTS (
    SELECT 1 FROM orders WHERE orders.id = shipments.order_id AND orders.user_id = auth.uid()
  ))
);

-- Delivery Slots Table Policies
DROP POLICY IF EXISTS "Users can read/insert their own slots" ON delivery_slots;
DROP POLICY IF EXISTS "Users can read their own slots" ON delivery_slots;
DROP POLICY IF EXISTS "Users can insert their own slots" ON delivery_slots;

CREATE POLICY "Users can read their own slots" ON delivery_slots FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = delivery_slots.order_id AND orders.user_id = auth.uid())
);

CREATE POLICY "Users can insert their own slots" ON delivery_slots FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = delivery_slots.order_id AND orders.user_id = auth.uid())
);
