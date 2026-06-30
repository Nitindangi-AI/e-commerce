const orderRepository = require("../repositories/orderRepository");
const { NotFoundError, BadRequestError, ForbiddenError, AppError } = require("../middleware/errors");
const generateOrderId = require("../../utils/generateOrderId");
const { processMockPayment } = require("../../utils/paymentGateway");
const { sendOrderConfirmationEmail, sendVendorOrderNotificationEmail } = require("../../utils/email");

exports.createOrder = async (userId, userEmail, orderData, idempotencyKey) => {
  const { orderItems, shippingAddress, paymentMethod, couponCode, useLoyalty } = orderData;
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  if (idempotencyKey) {
    if (!uuidRegex.test(idempotencyKey)) {
      throw new BadRequestError("Invalid X-Idempotency-Key format. Expected UUID.");
    }

    const keyCheck = await orderRepository.findIdempotencyKey(idempotencyKey);
    if (keyCheck) {
      const existingOrderId = keyCheck.order_id;
      const orderRow = await orderRepository.findOrderById(existingOrderId);
      if (orderRow) {
        const shipmentRow = await orderRepository.findShipmentByOrderId(orderRow.id);
        console.log(`[idempotency] Duplicate request for key ${idempotencyKey}. Returning existing order ${existingOrderId}.`);
        return {
          order: orderRow,
          shipment: shipmentRow ? {
            id: shipmentRow.id,
            tracking_number: shipmentRow.tracking_number,
            status: shipmentRow.status,
          } : null,
          isDuplicate: true
        };
      }
    }
  }

  if (!orderItems || orderItems.length === 0) {
    throw new BadRequestError("No order items provided");
  }

  const selectedPayment = paymentMethod || "cod";
  const orderId = generateOrderId();
  const orderNumber = 'ORD-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  let subtotal = 0;
  let maxDeliveryDays = 0;
  const validatedItems = [];

  // Begin transaction
  await orderRepository.beginTransaction();

  try {
    // 1. Validate items and lock rows using SELECT ... FOR UPDATE
    for (const item of orderItems) {
      const product = await orderRepository.lockProductForUpdate(item.product);
      if (!product) {
        throw new BadRequestError(`Product not found: ${item.product}`);
      }

      if (product.stock < item.quantity) {
        throw new AppError("Out of stock", 409);
      }

      validatedItems.push({
        product: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.img,
        color: item.color || "",
        size: item.size || "",
        seller_id: product.seller_id,
        current_stock: product.stock
      });

      subtotal += parseFloat(product.price) * item.quantity;
      if (product.delivery_days > maxDeliveryDays) {
        maxDeliveryDays = product.delivery_days;
      }
    }

    // 2. Coupon validation
    let discountAmount = 0;
    if (couponCode) {
      const coupon = await orderRepository.findActiveCouponByCode(couponCode);
      if (!coupon) {
        throw new BadRequestError("Invalid coupon code");
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        throw new BadRequestError("Coupon has expired");
      }
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        throw new BadRequestError("Coupon usage limit reached");
      }
      const minOrderVal = parseFloat(coupon.min_order || 0);
      if (subtotal < minOrderVal) {
        throw new BadRequestError(`Minimum order value of ₹${(minOrderVal / 100).toFixed(2)} required to use this coupon`);
      }

      const usageCheck = await orderRepository.findCouponUsage(userId, coupon.id);
      if (usageCheck) {
        throw new BadRequestError("You have already used this coupon");
      }

      discountAmount = coupon.type === "percent"
        ? Math.round((subtotal * parseFloat(coupon.discount)) / 100)
        : parseFloat(coupon.discount);

      const maxDisc = parseFloat(coupon.max_discount || 0);
      if (maxDisc > 0 && discountAmount > maxDisc) {
        discountAmount = maxDisc;
      }
    }

    // GST 18%
    const gstAmount = Math.round(parseFloat((subtotal * 0.18).toFixed(2)));
    // Shipping: free if subtotal > ₹999 (99900 paise), else ₹99 (9900 paise)
    const shippingCost = subtotal > 99900 ? 0 : 9900;
    let totalAmount = Math.max(0, subtotal + gstAmount + shippingCost - discountAmount);

    // Loyalty points
    let loyaltyDiscountRedeemed = 0;
    if (useLoyalty) {
      const userPoints = await orderRepository.getUserLoyaltyPoints(userId);
      const maxRedeemable = Math.min(userPoints, totalAmount);
      if (maxRedeemable > 0) {
        loyaltyDiscountRedeemed = maxRedeemable;
        discountAmount += loyaltyDiscountRedeemed;
        totalAmount = Math.max(0, totalAmount - loyaltyDiscountRedeemed);

        await orderRepository.deductLoyaltyPoints(userId, loyaltyDiscountRedeemed);
      }
    }

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + (maxDeliveryDays || 3));

    // Process payment abstraction
    const paymentResult = await processMockPayment({
      amount: totalAmount,
      method: selectedPayment,
      orderId
    });

    const paymentStatus = paymentResult.status === "paid" ? "paid" : "pending";

    // 3. Insert order
    const orderRow = await orderRepository.createOrder({
      userId,
      orderId,
      shippingAddress: JSON.stringify(shippingAddress),
      paymentMethod: selectedPayment,
      paymentStatus,
      subtotal: Math.round(subtotal),
      shippingCost: Math.round(shippingCost),
      discountAmount: Math.round(discountAmount),
      couponCode: couponCode || null,
      totalAmount: Math.round(totalAmount),
      estimatedDelivery,
      orderNumber
    });

    // 4. Order items, stock decrement, inventory logs
    for (const item of validatedItems) {
      await orderRepository.createOrderItem({
        orderId: orderRow.id,
        productId: item.product,
        name: item.name,
        price: Math.round(item.price),
        quantity: item.quantity,
        image: item.image,
        color: item.color,
        size: item.size,
        sellerId: item.seller_id
      });

      const updateStockRes = await orderRepository.decrementStock(item.product, item.quantity);
      if (updateStockRes.rowCount === 0) {
        throw new AppError("Out of stock", 409);
      }

      await orderRepository.createInventoryLog({
        productId: item.product,
        quantityChange: -item.quantity,
        quantityAfter: item.current_stock - item.quantity,
        note: `Order placed: ${orderNumber}`
      });
    }

    // 5. Create payment record
    await orderRepository.createPaymentRecord({
      orderId: orderRow.id,
      userId,
      amount: Math.round(totalAmount),
      method: selectedPayment,
      status: paymentResult.status === 'paid' ? 'success' : 'pending',
      gateway: paymentResult.gateway,
      gatewayPaymentId: paymentResult.transactionId || null
    });

    // 6. Handle coupon usage
    if (couponCode) {
      const coupon = await orderRepository.findActiveCouponByCode(couponCode);
      if (coupon) {
        await orderRepository.createCouponUsage(userId, coupon.id, orderRow.id);
        await orderRepository.incrementCouponUsedCount(coupon.id);
      }
    }

    // 7. Send notification
    await orderRepository.createUserNotification(userId, 'order_update', 'Order Placed', `Order ${orderNumber} placed successfully`);

    // 8. Idempotency Key
    if (idempotencyKey) {
      await orderRepository.createIdempotencyKey(idempotencyKey, orderRow.id);
      await orderRepository.cleanupIdempotencyKeys();
    }

    // Commit Transaction
    await orderRepository.commitTransaction();

    // Fetch the shipment row automatically created by trigger
    const shipmentRow = await orderRepository.findShipmentDetailsByOrderId(orderRow.id);
    if (shipmentRow) {
      await orderRepository.updateShipmentDelivery(shipmentRow.id, estimatedDelivery);
      await orderRepository.createShipmentEvent(shipmentRow.id, 'pending', 'Order placed successfully and awaiting pickup');
    }

    // Async emails
    (async () => {
      try {
        const sellerIds = [...new Set(validatedItems.map(i => i.seller_id))];
        for (const sId of sellerIds) {
          if (sId) {
            const vendorEmail = await orderRepository.getVendorEmail(sId);
            if (vendorEmail) {
              const vendorItems = validatedItems.filter(i => i.seller_id === sId);
              await sendVendorOrderNotificationEmail(vendorEmail, orderRow, vendorItems);
            }
          }
        }
        await sendOrderConfirmationEmail(userEmail, orderRow, validatedItems);
      } catch (emailErr) {
        console.error("Async email notification dispatch failed:", emailErr);
      }
    })();

    return {
      order: orderRow,
      shipment: shipmentRow ? {
        id: shipmentRow.id,
        tracking_number: shipmentRow.tracking_number,
        status: shipmentRow.status,
      } : null
    };

  } catch (error) {
    await orderRepository.rollbackTransaction();
    if (error.statusCode === 409 || error.message === "Out of stock") {
      throw new AppError("Out of stock", 409);
    }
    throw new BadRequestError(error.message || "Failed to create order");
  }
};

exports.getMyOrders = async (userId, page = 1, limit = 20) => {
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);
  const offset = (parsedPage - 1) * parsedLimit;

  const { orders: result, total } = await orderRepository.findUserOrders(userId, parsedLimit, offset);
  const orders = [];
  for (const order of result) {
    const items = await orderRepository.findOrderItems(order.id);
    orders.push({
      ...order,
      orderItems: items
    });
  }

  return {
    data: orders,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit)
    }
  };
};

exports.getOrder = async (orderId, userId, userRole) => {
  const order = await orderRepository.findOrderById(orderId);
  if (!order) throw new NotFoundError("Order not found");

  if (order.user_id.toString() !== userId && userRole !== "admin") {
    throw new ForbiddenError("Not authorized to view this order");
  }

  const items = await orderRepository.findOrderItemsDetailed(order.id);

  return {
    ...order,
    orderItems: items
  };
};

exports.cancelOrder = async (orderId, userId, userRole, reason) => {
  const order = await orderRepository.findOrderById(orderId);
  if (!order) throw new NotFoundError("Order not found");

  if (order.user_id.toString() !== userId && userRole !== "admin") {
    throw new ForbiddenError("Not authorized to cancel this order");
  }

  if (order.order_status !== "Processing" && order.order_status !== "Confirmed") {
    throw new BadRequestError("Order cannot be cancelled at this stage");
  }

  await orderRepository.updateOrderCancelStatus(orderId, reason);

  const items = await orderRepository.findOrderItems(orderId);
  for (const item of items) {
    await orderRepository.incrementStock(item.product_id, item.quantity);
  }

  await orderRepository.updateShipmentStatus(orderId, 'failed');

  return { success: true };
};

exports.requestReturn = async (orderId, userId, reason) => {
  const order = await orderRepository.findOrderById(orderId);
  if (!order) throw new NotFoundError("Order not found");

  if (order.user_id.toString() !== userId) {
    throw new ForbiddenError("Not authorized");
  }

  if (order.order_status !== "Delivered") {
    throw new BadRequestError("Only delivered orders can be returned");
  }

  if (order.return_status && order.return_status !== "none") {
    throw new BadRequestError(`Return already ${order.return_status}`);
  }

  const productsRes = await orderRepository.findReturnPolicyForProduct(orderId);
  let returnDays = 5;
  for (const row of productsRes) {
    let policy = row.return_policy;
    if (typeof policy === "string") {
      try { policy = JSON.parse(policy); } catch {}
    }
    if (policy && policy.returnDays !== undefined) {
      returnDays = Math.max(returnDays, parseInt(policy.returnDays, 10));
    }
  }

  const deliveredAt = new Date(order.delivered_at);
  const returnWindow = new Date(deliveredAt.getTime() + returnDays * 24 * 60 * 60 * 1000);
  if (new Date(returnWindow) < new Date()) {
    throw new BadRequestError("Return window has expired");
  }

  await orderRepository.updateOrderReturnStatus(orderId, 'requested', reason || "No reason provided");

  const adminId = await orderRepository.findFirstAdminId();
  if (adminId) {
    await orderRepository.createUserNotification(
      adminId,
      "order_update",
      "Return Requested",
      `Return requested for order ${order.order_number || orderId}`
    );
  }

  return { success: true };
};

exports.handleReturn = async (orderId, action) => {
  const order = await orderRepository.findOrderById(orderId);
  if (!order) throw new NotFoundError("Order not found");

  if (order.return_status !== "requested") {
    throw new BadRequestError("No pending return request for this order");
  }

  if (action === "approve") {
    await orderRepository.updateOrderReturnStatus(orderId, 'completed');
    const items = await orderRepository.findOrderItems(orderId);
    for (const item of items) {
      await orderRepository.incrementStock(item.product_id, item.quantity);
    }
  } else if (action === "reject") {
    await orderRepository.updateOrderReturnStatus(orderId, 'rejected');
  } else {
    throw new BadRequestError("Invalid action. Use 'approve' or 'reject'.");
  }

  return orderRepository.findOrderById(orderId);
};

exports.getAllOrders = async (page = 1, limit = 20) => {
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);
  const offset = (parsedPage - 1) * parsedLimit;

  const { orders: rows, total } = await orderRepository.findAllOrdersAdmin(parsedLimit, offset);
  const orders = rows.map(row => ({
    ...row,
    user: {
      email: row.email,
      firstName: row.full_name.split(' ')[0] || '',
      lastName: row.full_name.split(' ')[1] || ''
    }
  }));

  const totalRevenueRes = await orderRepository.getTotalRevenue();

  return {
    data: orders,
    totalRevenue: totalRevenueRes,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit)
    }
  };
};

exports.updateOrderStatus = async (orderId, status, note) => {
  const order = await orderRepository.findOrderById(orderId);
  if (!order) throw new NotFoundError("Order not found");

  if (order.order_status === "Delivered") {
    throw new BadRequestError("Order has already been delivered");
  }

  let updatesSqlPart = "";
  const params = [orderId, status];

  if (status === "Confirmed") {
    updatesSqlPart = `, confirmed_at = now()`;
  } else if (status === "Shipped") {
    updatesSqlPart = `, shipped_at = now()`;
  } else if (status === "Delivered") {
    updatesSqlPart = `, delivered_at = now(), payment_status = 'paid'`;
  }

  const updatedOrder = await orderRepository.updateOrderStatusOnly(orderId, status, updatesSqlPart, params);

  if (status === "Delivered" && order.order_status !== "Delivered") {
    const totalAmount = parseFloat(order.total_amount);
    await orderRepository.updateProfileStatsOnDelivery(order.user_id, totalAmount);
    await orderRepository.createUserNotification(
      order.user_id,
      'promotion',
      'Loyalty Points Earned',
      `You earned ${Math.floor(totalAmount / 10)} loyalty points from order ${order.order_number}!`
    );
  }

  // Sync shipment status
  const shipment = await orderRepository.findShipmentFullDetails(orderId);
  if (shipment) {
    let shipmentStatus = shipment.status;
    let eventStatus = "";
    switch (status) {
      case "Confirmed":
        shipmentStatus = "pickup_scheduled";
        eventStatus = "Pickup Scheduled";
        break;
      case "Shipped":
        shipmentStatus = "in_transit";
        eventStatus = "In Transit";
        break;
      case "Out for Delivery":
        shipmentStatus = "out_for_delivery";
        eventStatus = "Out for Delivery";
        break;
      case "Delivered":
        shipmentStatus = "delivered";
        eventStatus = "Delivered";
        break;
      case "Cancelled":
        shipmentStatus = "failed";
        eventStatus = "Cancelled";
        break;
    }
    if (eventStatus) {
      if (status === "Delivered") {
        await orderRepository.updateShipmentRaw(shipment.id, "status = $2, actual_delivery = now()", [shipment.id, shipmentStatus]);
      } else {
        await orderRepository.updateShipmentRaw(shipment.id, "status = $2", [shipment.id, shipmentStatus]);
      }
      await orderRepository.createShipmentEvent(shipment.id, eventStatus, note || `Shipment status updated to ${eventStatus}`);
    }
  }

  return updatedOrder;
};

exports.getShipmentByOrderId = async (orderId) => {
  const shipment = await orderRepository.findShipmentFullDetails(orderId);
  if (!shipment) throw new NotFoundError("Shipment not found");
  const events = await orderRepository.findShipmentEvents(shipment.id);
  return { shipment, events };
};

exports.updateShipment = async (shipmentId, updateData) => {
  const existingShipment = await orderRepository.findShipmentById(shipmentId);
  if (!existingShipment) throw new NotFoundError("Shipment not found");

  const { status, location, estimatedDelivery, actualDelivery, note } = updateData;
  const updates = [];
  const params = [shipmentId];
  let paramIndex = 2;

  if (status) {
    updates.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }
  if (location !== undefined) {
    updates.push(`current_location = $${paramIndex}`);
    params.push(location);
    paramIndex++;
  }
  if (estimatedDelivery !== undefined) {
    updates.push(`estimated_delivery = $${paramIndex}`);
    params.push(estimatedDelivery);
    paramIndex++;
  }
  if (actualDelivery !== undefined) {
    updates.push(`actual_delivery = $${paramIndex}`);
    params.push(actualDelivery);
    paramIndex++;
  }

  const updatesPart = updates.join(", ");
  const updated = await orderRepository.updateShipmentRaw(shipmentId, updatesPart, params);
  await orderRepository.createShipmentEvent(updated.id, status || updated.status, note || `Status updated to ${status || updated.status}`);

  return updated;
};

exports.trackByNumber = async (trackingNumber) => {
  const shipment = await orderRepository.findShipmentByTrackingNumber(trackingNumber);
  if (!shipment) throw new NotFoundError("Shipment not found");
  const events = await orderRepository.findShipmentEvents(shipment.id);
  return { shipment, events };
};

exports.createDeliverySlot = async (orderId, slotTime, slotDate) => {
  return orderRepository.createDeliverySlotRecord(orderId, slotDate || new Date(), slotTime);
};

exports.getDeliverySlots = async (orderId) => {
  return orderRepository.findDeliverySlots(orderId);
};
