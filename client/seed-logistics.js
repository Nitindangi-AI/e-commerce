import { createClient } from '@insforge/sdk';

const VITE_INSFORGE_URL = 'https://r7q99f5d.us-east.insforge.app';
const VITE_INSFORGE_ANON_KEY = 'ik_84619633df209ae1fafdaf404bfbd91a';

const client = createClient({
  baseUrl: VITE_INSFORGE_URL,
  anonKey: VITE_INSFORGE_ANON_KEY,
});

async function seed() {
  console.log('🚀 Starting Logistics Operating System Demo Data Seeding...');

  try {
    // 1. Fetch first order from orders table
    const { data: orders, error: oErr } = await client.database
      .from('orders')
      .select('*')
      .limit(1);

    if (oErr || !orders || orders.length === 0) {
      console.log('❌ No active orders found in the database. Please place an order first as customer.');
      return;
    }
    const order = orders[0];
    console.log(`✅ Loaded target order: ${order.order_id} (ID: ${order.id})`);

    // 2. Fetch first vendor from vendors table
    const { data: vendors, error: vErr } = await client.database
      .from('vendors')
      .select('*')
      .limit(1);

    if (vErr || !vendors || vendors.length === 0) {
      console.log('❌ No vendor profiles located.');
      return;
    }
    const vendor = vendors[0];
    console.log(`✅ Loaded target merchant: ${vendor.store_name} (Seller ID: ${vendor.user_id})`);

    // 3. Fetch first contractor and compatible vehicle
    const { data: contractors } = await client.database.from('contractors').select('*');
    const { data: vehicles } = await client.database.from('vehicles').select('*');

    if (!contractors || contractors.length === 0 || !vehicles || vehicles.length === 0) {
      console.log('❌ Logistics contractors or fleet driver databases are empty. Check pre-seeds.');
      return;
    }
    const contractor = contractors.find(c => c.name.includes('Delhivery')) || contractors[0];
    const vehicle = vehicles.find(v => v.contractor_id === contractor.id) || vehicles[0];
    console.log(`✅ Allocated partner carrier: ${contractor.name}`);
    console.log(`✅ Allocated fleet driver: ${vehicle.driver_name} (${vehicle.type})`);

    // 4. Check if a shipment already exists for this order to avoid duplicates
    const { data: existingShip } = await client.database
      .from('shipments')
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle();

    if (existingShip) {
      console.log('⚠️ A shipment already exists for this order. Cleaning up old routes and tracking records...');
      await client.database.from('tracking').delete().eq('shipment_id', existingShip.id);
      await client.database.from('delivery_routes').delete().eq('shipment_id', existingShip.id);
      await client.database.from('shipments').delete().eq('id', existingShip.id);
      console.log('🧹 Cleanup completed.');
    }

    // 5. Generate secure delivery credentials
    const trackingId = `TRK-${Date.now().toString(36).toUpperCase()}-DEMO`;
    const otpCode = 'OTP-555888';

    const origin = {
      name: `${vendor.store_name} Warehouse Hub`,
      city: 'Bhopal',
      state: 'Madhya Pradesh',
      country: 'India',
      line1: 'Industrial Logistics Area, Sector C',
      pincode: '462021',
      phone: '+91 98765 00001'
    };

    const destination = {
      name: order.shipping_address?.name || 'Alice Brown',
      city: order.shipping_address?.city || 'Vidisha',
      state: order.shipping_address?.state || 'Madhya Pradesh',
      country: order.shipping_address?.country || 'India',
      line1: order.shipping_address?.line1 || 'Bantinagar Express Colony',
      area: order.shipping_address?.area || 'Bantinagar',
      pincode: order.shipping_address?.pincode || '464001',
      phone: order.shipping_address?.phone || '+91 98765 00003'
    };

    // 6. Create shipment
    console.log('📦 Inserting shipment record...');
    const { data: shipment, error: sErr } = await client.database
      .from('shipments')
      .insert([{
        shipment_id: trackingId,
        order_id: order.id,
        vendor_id: vendor.user_id,
        delivery_mode: 'hybrid',
        status: 'Last Mile Delivery',
        origin,
        destination,
        contractor_id: contractor.id,
        vehicle_id: vehicle.id,
        otp_code: otpCode
      }])
      .select()
      .single();

    if (sErr) throw new Error(sErr.message);
    console.log(`✅ Created shipment! AWB Tracking: ${shipment.shipment_id}`);

    // 7. Insert sequential route paths (Global/Multi-stage fulfillment)
    console.log('🗺️ Generating sequential route sequences...');
    const routes = [
      { from: 'Bhopal Warehouse Hub', to: 'Indore Sorting Depot', type: 'Road', days: 1, priority: 1 },
      { from: 'Indore Sorting Depot', to: 'Madhya Pradesh Central Hub', type: 'Rail', days: 1, priority: 2 },
      { from: 'Madhya Pradesh Central Hub', to: 'Vidisha Area District Hub', type: 'Road', days: 1, priority: 3 },
      { from: 'Vidisha Area District Hub', to: destination.area || 'Bantinagar Last Mile', type: 'Road', days: 1, priority: 4 }
    ];

    const routeInserts = routes.map((r, i) => ({
      route_id: `RTE-DEMO-${i + 1}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      shipment_id: shipment.id,
      from_location: r.from,
      to_location: r.to,
      transport_type: r.type,
      contractor_id: contractor.id,
      sequence_order: r.priority,
      estimated_days: r.days,
      cost: 150 + i * 50
    }));

    const { error: rErr } = await client.database.from('delivery_routes').insert(routeInserts);
    if (rErr) throw new Error(rErr.message);
    console.log('✅ Generated 4 sequential route nodes.');

    // 8. Insert live sequential tracking coordinates log
    console.log('📡 Generating live GPS tracking timeline updates...');
    const now = new Date();
    const trackingLogs = [
      { status: 'Shipment Request', location: 'Bhopal Warehouse Hub', offsetHours: 6 },
      { status: 'Pickup Scheduled', location: 'Bhopal Warehouse Hub', offsetHours: 5 },
      { status: 'International Shipping', location: 'Indore Cargo Terminal', offsetHours: 4 },
      { status: 'Country Hub', location: 'Indore Sorting Depot', offsetHours: 3 },
      { status: 'State Hub', location: 'Madhya Pradesh Central Hub', offsetHours: 2 },
      { status: 'District Hub', location: 'Vidisha Area District Hub', offsetHours: 1 },
      { status: 'Last Mile Delivery', location: destination.area || 'Bantinagar Area', offsetHours: 0 }
    ];

    const trackingInserts = trackingLogs.map((log, i) => {
      const timestamp = new Date(now.getTime() - log.offsetHours * 60 * 60 * 1000);
      return {
        tracking_id: `LOC-DEMO-${i + 1}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        shipment_id: shipment.id,
        status: log.status,
        location: log.location,
        timestamp: timestamp.toISOString()
      };
    });

    const { error: tErr } = await client.database.from('tracking').insert(trackingInserts);
    if (tErr) throw new Error(tErr.message);
    console.log('✅ Injected 7 tracking checkpoints.');

    // 9. Sync parent order parameters
    console.log('🔄 Synchronizing parent order states and history entries...');
    const existingDetails = order.payment_details || {};
    const updatedDetails = {
      ...existingDetails,
      tracking_number: trackingId,
      courier: contractor.name,
      dispatched_at: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      otp_code: otpCode
    };

    const { error: uErr } = await client.database
      .from('orders')
      .update({
        order_status: 'Out for Delivery',
        payment_details: updatedDetails,
        updated_at: now.toISOString()
      })
      .eq('id', order.id);

    if (uErr) throw new Error(uErr.message);

    // 10. Write order status history
    await client.database.from('order_status_history').insert([
      {
        order_id: order.id,
        status: 'Shipped',
        note: `Dispatched via ${contractor.name} (${vehicle.type}). AWB tracking slip: ${trackingId}`,
        timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString()
      },
      {
        order_id: order.id,
        status: 'Out for Delivery',
        note: `Consignment is out for delivery with fleet driver ${vehicle.driver_name} (${vehicle.driver_phone}). Safe handoff OTP verified key sent.`,
        timestamp: now.toISOString()
      }
    ]);

    console.log('\n🎉 LOGISTICS OS DEMO SEED COMPLETED SUCCESSFULLY! 🎉');
    console.log('================================================================');
    console.log(`AWB Tracking Code  : ${trackingId}`);
    console.log(`Assigned Driver    : ${vehicle.driver_name} (${vehicle.driver_phone})`);
    console.log(`Delivery Destination: ${destination.city}, ${destination.state} (${destination.area})`);
    console.log(`Safe Handoff OTP    : ${otpCode}`);
    console.log('================================================================');
    console.log('\n👉 Open your browser, login, and verify:');
    console.log('1. Customer Orders List/Detail will show the live visual routing nodes & OTP.');
    console.log('2. Seller Logistics tab will display this in-transit consignment.');
    console.log('3. Admin Logistics Dashboard will compile metrics & grid entries.');

  } catch (err) {
    console.error('💥 Failed to seed logistics demo data:', err);
  }
}

seed();
