CREATE POLICY "Vendors insert own shipments" ON shipments FOR INSERT WITH CHECK (vendor_id = auth.uid());
CREATE POLICY "Vendors insert associated routes" ON delivery_routes FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM shipments WHERE id = delivery_routes.shipment_id AND vendor_id = auth.uid()));
