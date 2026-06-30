import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock other utilities
vi.mock("../../utils/generateOrderId", () => {
  return {
    default: () => "order-uuid-123",
  };
});

vi.mock("../../utils/paymentGateway", () => {
  return {
    processMockPayment: vi.fn(async () => ({
      status: "paid",
      gateway: "mock",
      transactionId: "txn_123",
    })),
  };
});

vi.mock("../../utils/email", () => {
  return {
    sendOrderConfirmationEmail: vi.fn(),
    sendVendorOrderNotificationEmail: vi.fn(),
  };
});

const orderRepository = require("../../src/repositories/orderRepository");
const orderService = require("../../src/services/orderService");
const { BadRequestError, NotFoundError, AppError, ForbiddenError } = require("../../src/middleware/errors");
const { processMockPayment } = require("../../utils/paymentGateway");

describe("orderService - createOrder & Price Calculation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    orderRepository.beginTransaction = vi.fn();
    orderRepository.commitTransaction = vi.fn();
    orderRepository.rollbackTransaction = vi.fn();
    orderRepository.lockProductForUpdate = vi.fn();
    orderRepository.findActiveCouponByCode = vi.fn();
    orderRepository.findCouponUsage = vi.fn();
    orderRepository.getUserLoyaltyPoints = vi.fn();
    orderRepository.deductLoyaltyPoints = vi.fn();
    orderRepository.createOrder = vi.fn();
    orderRepository.createOrderItem = vi.fn();
    orderRepository.decrementStock = vi.fn();
    orderRepository.createInventoryLog = vi.fn();
    orderRepository.createPaymentRecord = vi.fn();
    orderRepository.createCouponUsage = vi.fn();
    orderRepository.incrementCouponUsedCount = vi.fn();
    orderRepository.createUserNotification = vi.fn();
    orderRepository.createIdempotencyKey = vi.fn();
    orderRepository.cleanupIdempotencyKeys = vi.fn();
    orderRepository.findShipmentDetailsByOrderId = vi.fn();
    orderRepository.updateShipmentDelivery = vi.fn();
    orderRepository.createShipmentEvent = vi.fn();
    orderRepository.getVendorEmail = vi.fn();
    orderRepository.findOrderById = vi.fn();
    orderRepository.updateOrderStatusOnly = vi.fn();
    orderRepository.findShipmentFullDetails = vi.fn();
    orderRepository.updateShipmentRaw = vi.fn();
    orderRepository.findIdempotencyKey = vi.fn();
    orderRepository.findShipmentByOrderId = vi.fn();
  });

  it("should calculate correct order price totals without coupon", async () => {
    const orderData = {
      orderItems: [{ product: "p1", quantity: 1, color: "Black", size: "M" }],
      shippingAddress: { address: "123 Main St" },
      paymentMethod: "cod",
    };

    const mockProduct = {
      id: "p1",
      name: "Product 1",
      price: 50000,
      stock: 10,
      delivery_days: 3,
      seller_id: "seller1",
      img: "img.jpg",
    };

    orderRepository.lockProductForUpdate.mockResolvedValue(mockProduct);
    orderRepository.decrementStock.mockResolvedValue({ rowCount: 1 });
    orderRepository.createOrder.mockResolvedValue({ id: "order1", order_status: "Processing" });

    await orderService.createOrder("user1", "user@email.com", orderData, null);

    // Subtotal: 50000 paise
    // GST (18%): Math.round(50000 * 0.18) = 9000 paise
    // Shipping: subtotal is 50000 (<= 99900), so shippingCost is 9900 paise (₹99)
    // Discount: 0
    // Total: 50000 + 9000 + 9900 - 0 = 68900 paise (₹689.00)
    expect(orderRepository.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotal: 50000,
        shippingCost: 9900,
        discountAmount: 0,
        totalAmount: 68900,
      })
    );
  });

  it("should calculate correct order price totals with coupon (percent discount)", async () => {
    const orderData = {
      orderItems: [{ product: "p1", quantity: 2, color: "Black", size: "M" }],
      shippingAddress: { address: "123 Main St" },
      paymentMethod: "prepaid",
      couponCode: "SAVE10",
    };

    const mockProduct = {
      id: "p1",
      name: "Product 1",
      price: 50000,
      stock: 10,
      delivery_days: 3,
      seller_id: "seller1",
      img: "img.jpg",
    };

    const mockCoupon = {
      id: "coupon1",
      code: "SAVE10",
      type: "percent",
      discount: 10,
      min_order: 20000,
      usage_limit: 100,
      used_count: 0,
    };

    orderRepository.lockProductForUpdate.mockResolvedValue(mockProduct);
    orderRepository.findActiveCouponByCode.mockResolvedValue(mockCoupon);
    orderRepository.findCouponUsage.mockResolvedValue(null);
    orderRepository.decrementStock.mockResolvedValue({ rowCount: 1 });
    orderRepository.createOrder.mockResolvedValue({ id: "order1", order_status: "Processing" });

    await orderService.createOrder("user1", "user@email.com", orderData, null);

    // Subtotal: 100000 paise
    // Coupon Discount: 10% of 100000 = 10000 paise
    // GST (18%): Math.round(100000 * 0.18) = 18000 paise
    // Shipping: subtotal is 100000 (> 99900), so shippingCost is 0 paise
    // Total Amount: subtotal + GST + shippingCost - discount = 100000 + 18000 + 0 - 10000 = 108000 paise
    expect(orderRepository.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotal: 100000,
        shippingCost: 0,
        discountAmount: 10000,
        totalAmount: 108000,
      })
    );
  });

  it("should throw BadRequestError if idempotency key is not a valid UUID", async () => {
    const orderData = {
      orderItems: [{ product: "p1", quantity: 1 }],
      shippingAddress: { address: "123 Main St" },
    };
    await expect(orderService.createOrder("user1", "user@email.com", orderData, "invalid-uuid")).rejects.toThrow(
      new BadRequestError("Invalid X-Idempotency-Key format. Expected UUID.")
    );
  });

  it("should return existing order details if idempotency key already exists", async () => {
    const orderData = {
      orderItems: [{ product: "p1", quantity: 1 }],
      shippingAddress: { address: "123 Main St" },
    };
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    orderRepository.findIdempotencyKey.mockResolvedValue({ order_id: "existing_order_id" });
    orderRepository.findOrderById.mockResolvedValue({ id: "existing_order_id", order_number: "ORD-EXISTING" });
    orderRepository.findShipmentByOrderId.mockResolvedValue({ id: "s1", tracking_number: "TRK1", status: "pending" });

    const res = await orderService.createOrder("user1", "user@email.com", orderData, validUuid);
    expect(res.isDuplicate).toBe(true);
    expect(res.order.id).toBe("existing_order_id");
  });

  it("should redeem loyalty points if useLoyalty is true", async () => {
    const orderData = {
      orderItems: [{ product: "p1", quantity: 1 }],
      shippingAddress: { address: "123 Main St" },
      paymentMethod: "cod",
      useLoyalty: true,
    };
    const mockProduct = {
      id: "p1",
      name: "Product 1",
      price: 50000,
      stock: 10,
      delivery_days: 3,
      seller_id: "seller1",
      img: "img.jpg",
    };
    orderRepository.lockProductForUpdate.mockResolvedValue(mockProduct);
    orderRepository.decrementStock.mockResolvedValue({ rowCount: 1 });
    orderRepository.getUserLoyaltyPoints.mockResolvedValue(2000);
    orderRepository.createOrder.mockResolvedValue({ id: "order1", order_status: "Processing" });

    await orderService.createOrder("user1", "user@email.com", orderData, null);

    expect(orderRepository.deductLoyaltyPoints).toHaveBeenCalledWith("user1", 2000);
    expect(orderRepository.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        discountAmount: 2000,
        totalAmount: 66900,
      })
    );
  });
});

describe("orderService - Stock Decrement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderRepository.beginTransaction = vi.fn();
    orderRepository.commitTransaction = vi.fn();
    orderRepository.rollbackTransaction = vi.fn();
    orderRepository.lockProductForUpdate = vi.fn();
    orderRepository.decrementStock = vi.fn();
    orderRepository.createOrder = vi.fn();
    orderRepository.createOrderItem = vi.fn();
    orderRepository.createInventoryLog = vi.fn();
    orderRepository.createPaymentRecord = vi.fn();
    orderRepository.createUserNotification = vi.fn();
    orderRepository.findShipmentDetailsByOrderId = vi.fn();
    orderRepository.updateShipmentDelivery = vi.fn();
    orderRepository.createShipmentEvent = vi.fn();
  });

  it("should fail order creation when product is out of stock", async () => {
    const orderData = {
      orderItems: [{ product: "p1", quantity: 5 }],
      shippingAddress: { address: "123 Main St" },
    };

    const mockProduct = {
      id: "p1",
      name: "Product 1",
      price: 50000,
      stock: 3, // Insufficient stock!
    };

    orderRepository.lockProductForUpdate.mockResolvedValue(mockProduct);

    await expect(orderService.createOrder("user1", "user@email.com", orderData, null)).rejects.toThrow(
      new AppError("Out of stock", 409)
    );
    expect(orderRepository.rollbackTransaction).toHaveBeenCalled();
  });

  it("should fail order creation when stock decrement fails (concurrent issue)", async () => {
    const orderData = {
      orderItems: [{ product: "p1", quantity: 2 }],
      shippingAddress: { address: "123 Main St" },
    };

    const mockProduct = {
      id: "p1",
      name: "Product 1",
      price: 50000,
      stock: 5,
    };

    orderRepository.lockProductForUpdate.mockResolvedValue(mockProduct);
    orderRepository.createOrder.mockResolvedValue({ id: "order1", order_status: "Processing" });
    orderRepository.decrementStock.mockResolvedValue({ rowCount: 0 });

    await expect(orderService.createOrder("user1", "user@email.com", orderData, null)).rejects.toThrow(
      new AppError("Out of stock", 409)
    );
    expect(orderRepository.rollbackTransaction).toHaveBeenCalled();
  });

  it("should successfully decrement stock when stock is sufficient", async () => {
    const orderData = {
      orderItems: [{ product: "p1", quantity: 2 }],
      shippingAddress: { address: "123 Main St" },
    };

    const mockProduct = {
      id: "p1",
      name: "Product 1",
      price: 50000,
      stock: 5,
    };

    orderRepository.lockProductForUpdate.mockResolvedValue(mockProduct);
    orderRepository.decrementStock.mockResolvedValue({ rowCount: 1 });
    orderRepository.createOrder.mockResolvedValue({ id: "order1", order_status: "Processing" });

    await orderService.createOrder("user1", "user@email.com", orderData, null);

    expect(orderRepository.decrementStock).toHaveBeenCalledWith("p1", 2);
    expect(orderRepository.commitTransaction).toHaveBeenCalled();
  });
});

describe("orderService - Order Status Transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderRepository.findOrderById = vi.fn();
    orderRepository.updateOrderStatusOnly = vi.fn();
    orderRepository.findShipmentFullDetails = vi.fn();
    orderRepository.updateProfileStatsOnDelivery = vi.fn();
    orderRepository.createUserNotification = vi.fn();
    orderRepository.updateShipmentRaw = vi.fn();
    orderRepository.createShipmentEvent = vi.fn();
  });

  it("should successfully update status for a valid transition", async () => {
    const order = { id: "order1", order_status: "Pending", user_id: "user1" };
    orderRepository.findOrderById.mockResolvedValue(order);
    orderRepository.updateOrderStatusOnly.mockResolvedValue({ ...order, order_status: "Confirmed" });
    orderRepository.findShipmentFullDetails.mockResolvedValue(null);

    const result = await orderService.updateOrderStatus("order1", "Confirmed", "Valid transition note");

    expect(result.order_status).toBe("Confirmed");
    expect(orderRepository.updateOrderStatusOnly).toHaveBeenCalledWith("order1", "Confirmed", ", confirmed_at = now()", ["order1", "Confirmed"]);
  });

  it("should handle transition to Delivered status correctly", async () => {
    const order = { id: "order1", order_status: "Shipped", user_id: "user1", total_amount: "50000", order_number: "ORD-1" };
    const shipment = { id: "shipment1", status: "in_transit" };
    orderRepository.findOrderById.mockResolvedValue(order);
    orderRepository.updateOrderStatusOnly.mockResolvedValue({ ...order, order_status: "Delivered" });
    orderRepository.findShipmentFullDetails.mockResolvedValue(shipment);

    const result = await orderService.updateOrderStatus("order1", "Delivered", "Delivered note");

    expect(result.order_status).toBe("Delivered");
    expect(orderRepository.updateProfileStatsOnDelivery).toHaveBeenCalledWith("user1", 50000);
    expect(orderRepository.updateShipmentRaw).toHaveBeenCalledWith("shipment1", "status = $2, actual_delivery = now()", ["shipment1", "delivered"]);
    expect(orderRepository.createShipmentEvent).toHaveBeenCalledWith("shipment1", "Delivered", "Delivered note");
  });

  it("should throw BadRequestError when trying to update an already Delivered order", async () => {
    const order = { id: "order1", order_status: "Delivered", user_id: "user1" };
    orderRepository.findOrderById.mockResolvedValue(order);

    await expect(orderService.updateOrderStatus("order1", "Pending", "Note")).rejects.toThrow(
      new BadRequestError("Order has already been delivered")
    );
    expect(orderRepository.updateOrderStatusOnly).not.toHaveBeenCalled();
  });
});

describe("orderService - other functions for coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderRepository.findUserOrders = vi.fn();
    orderRepository.findOrderItems = vi.fn();
    orderRepository.findOrderById = vi.fn();
    orderRepository.findOrderItemsDetailed = vi.fn();
    orderRepository.updateOrderCancelStatus = vi.fn();
    orderRepository.incrementStock = vi.fn();
    orderRepository.updateShipmentStatus = vi.fn();
    orderRepository.findReturnPolicyForProduct = vi.fn();
    orderRepository.updateOrderReturnStatus = vi.fn();
    orderRepository.findFirstAdminId = vi.fn();
    orderRepository.createUserNotification = vi.fn();
    orderRepository.findAllOrdersAdmin = vi.fn();
    orderRepository.getTotalRevenue = vi.fn();
    orderRepository.findShipmentFullDetails = vi.fn();
    orderRepository.findShipmentEvents = vi.fn();
    orderRepository.findShipmentById = vi.fn();
    orderRepository.updateShipmentRaw = vi.fn();
    orderRepository.createShipmentEvent = vi.fn();
    orderRepository.findShipmentByTrackingNumber = vi.fn();
    orderRepository.createDeliverySlotRecord = vi.fn();
    orderRepository.findDeliverySlots = vi.fn();
  });

  it("getMyOrders should get paginated orders with items", async () => {
    orderRepository.findUserOrders.mockResolvedValue({ orders: [{ id: "o1" }], total: 1 });
    orderRepository.findOrderItems.mockResolvedValue([{ id: "item1" }]);

    const res = await orderService.getMyOrders("user1", 1, 20);
    expect(res.data).toEqual([{ id: "o1", orderItems: [{ id: "item1" }] }]);
    expect(res.pagination.total).toBe(1);
  });

  it("getOrder should throw NotFoundError if order does not exist", async () => {
    orderRepository.findOrderById.mockResolvedValue(null);
    await expect(orderService.getOrder("invalid", "user1", "customer")).rejects.toThrow(NotFoundError);
  });

  it("getOrder should throw ForbiddenError if user is not authorized", async () => {
    orderRepository.findOrderById.mockResolvedValue({ id: "o1", user_id: "other_user" });
    await expect(orderService.getOrder("o1", "user1", "customer")).rejects.toThrow(ForbiddenError);
  });

  it("getOrder should succeed if authorized", async () => {
    orderRepository.findOrderById.mockResolvedValue({ id: "o1", user_id: "user1" });
    orderRepository.findOrderItemsDetailed.mockResolvedValue([{ id: "item1" }]);

    const res = await orderService.getOrder("o1", "user1", "customer");
    expect(res.orderItems).toEqual([{ id: "item1" }]);
  });

  it("cancelOrder should throw error if not processing or confirmed", async () => {
    orderRepository.findOrderById.mockResolvedValue({ id: "o1", user_id: "user1", order_status: "Shipped" });
    await expect(orderService.cancelOrder("o1", "user1", "customer", "change mind")).rejects.toThrow(BadRequestError);
  });

  it("cancelOrder should succeed and restore stock if valid", async () => {
    orderRepository.findOrderById.mockResolvedValue({ id: "o1", user_id: "user1", order_status: "Processing" });
    orderRepository.findOrderItems.mockResolvedValue([{ product_id: "p1", quantity: 2 }]);

    const res = await orderService.cancelOrder("o1", "user1", "customer", "change mind");
    expect(res.success).toBe(true);
    expect(orderRepository.incrementStock).toHaveBeenCalledWith("p1", 2);
    expect(orderRepository.updateShipmentStatus).toHaveBeenCalledWith("o1", "failed");
  });

  it("requestReturn should throw error if not delivered", async () => {
    orderRepository.findOrderById.mockResolvedValue({ id: "o1", user_id: "user1", order_status: "Processing" });
    await expect(orderService.requestReturn("o1", "user1", "reason")).rejects.toThrow(BadRequestError);
  });

  it("requestReturn should succeed if within window", async () => {
    const deliveredAt = new Date().toISOString();
    orderRepository.findOrderById.mockResolvedValue({
      id: "o1",
      user_id: "user1",
      order_status: "Delivered",
      delivered_at: deliveredAt,
      return_status: "none"
    });
    orderRepository.findReturnPolicyForProduct.mockResolvedValue([{ return_policy: { returnDays: 10 } }]);
    orderRepository.findFirstAdminId.mockResolvedValue("admin1");

    const res = await orderService.requestReturn("o1", "user1", "defect");
    expect(res.success).toBe(true);
    expect(orderRepository.updateOrderReturnStatus).toHaveBeenCalledWith("o1", "requested", "defect");
  });

  it("handleReturn should approve and restore stock", async () => {
    orderRepository.findOrderById.mockResolvedValue({ id: "o1", return_status: "requested" });
    orderRepository.findOrderItems.mockResolvedValue([{ product_id: "p1", quantity: 2 }]);

    await orderService.handleReturn("o1", "approve");
    expect(orderRepository.updateOrderReturnStatus).toHaveBeenCalledWith("o1", "completed");
    expect(orderRepository.incrementStock).toHaveBeenCalledWith("p1", 2);
  });

  it("getAllOrders should get orders and total revenue for admin", async () => {
    orderRepository.findAllOrdersAdmin.mockResolvedValue({ orders: [{ id: "o1", email: "a@b.com", full_name: "John Doe" }], total: 1 });
    orderRepository.getTotalRevenue.mockResolvedValue(10000);

    const res = await orderService.getAllOrders(1, 20);
    expect(res.totalRevenue).toBe(10000);
    expect(res.data[0].user.firstName).toBe("John");
  });

  it("getShipmentByOrderId should get shipment and events", async () => {
    orderRepository.findShipmentFullDetails.mockResolvedValue({ id: "s1" });
    orderRepository.findShipmentEvents.mockResolvedValue([{ id: "e1" }]);

    const res = await orderService.getShipmentByOrderId("o1");
    expect(res.shipment).toEqual({ id: "s1" });
    expect(res.events).toEqual([{ id: "e1" }]);
  });

  it("updateShipment should update estimatedDelivery and actualDelivery", async () => {
    orderRepository.findShipmentById.mockResolvedValue({ id: "s1" });
    orderRepository.updateShipmentRaw.mockResolvedValue({ id: "s1", status: "delivered" });

    const res = await orderService.updateShipment("s1", {
      status: "delivered",
      location: "Home",
      estimatedDelivery: "2026-06-29",
      actualDelivery: "2026-06-28",
    });
    expect(res.status).toBe("delivered");
    expect(orderRepository.updateShipmentRaw).toHaveBeenCalledWith(
      "s1",
      expect.stringContaining("estimated_delivery"),
      expect.any(Array)
    );
  });

  it("trackByNumber should get shipment and events by tracking number", async () => {
    orderRepository.findShipmentByTrackingNumber.mockResolvedValue({ id: "s1" });
    orderRepository.findShipmentEvents.mockResolvedValue([{ id: "e1" }]);

    const res = await orderService.trackByNumber("TRK123");
    expect(res.shipment).toEqual({ id: "s1" });
    expect(res.events).toEqual([{ id: "e1" }]);
  });

  it("trackByNumber should throw NotFoundError if shipment is not found", async () => {
    orderRepository.findShipmentByTrackingNumber.mockResolvedValue(null);
    await expect(orderService.trackByNumber("INVALID")).rejects.toThrow(NotFoundError);
  });

  it("createDeliverySlot and getDeliverySlots should work", async () => {
    orderRepository.createDeliverySlotRecord.mockResolvedValue({ id: "slot1" });
    orderRepository.findDeliverySlots.mockResolvedValue([{ id: "slot1" }]);

    const res1 = await orderService.createDeliverySlot("o1", "10-12", "2026-06-28");
    const res2 = await orderService.getDeliverySlots("o1");

    expect(res1).toEqual({ id: "slot1" });
    expect(res2).toEqual([{ id: "slot1" }]);
  });
});
