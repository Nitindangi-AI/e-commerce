-- Create shipment_events table
CREATE TABLE IF NOT EXISTS shipment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT DEFAULT '',
  description TEXT DEFAULT '',
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE shipment_events ENABLE ROW LEVEL SECURITY;

-- Select policy
DROP POLICY IF EXISTS "Users read associated shipment events" ON shipment_events;
CREATE POLICY "Users read associated shipment events" ON shipment_events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM shipments s
    LEFT JOIN orders o ON s.order_id = o.id
    WHERE s.id = shipment_events.shipment_id AND (o.user_id = auth.uid() OR s.vendor_id = auth.uid())
  ) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Insert/Update policy
DROP POLICY IF EXISTS "Admins or vendors write shipment events" ON shipment_events;
CREATE POLICY "Admins or vendors write shipment events" ON shipment_events FOR INSERT, UPDATE USING (
  EXISTS (SELECT 1 FROM shipments WHERE id = shipment_events.shipment_id AND vendor_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Full management policy for Admin
DROP POLICY IF EXISTS "Admin manage shipment events" ON shipment_events;
CREATE POLICY "Admin manage shipment events" ON shipment_events FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
