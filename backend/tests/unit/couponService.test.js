import { describe, it, expect, vi, beforeEach } from "vitest";

const couponRepository = require("../../src/repositories/couponRepository");
const couponService = require("../../src/services/couponService");
const { BadRequestError, NotFoundError } = require("../../src/middleware/errors");

describe("couponService - validateCoupon", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    couponRepository.findActiveByCode = vi.fn();
    couponRepository.findUsage = vi.fn();
    couponRepository.findAllActive = vi.fn();
    couponRepository.findAll = vi.fn();
    couponRepository.create = vi.fn();
    couponRepository.findById = vi.fn();
    couponRepository.update = vi.fn();
    couponRepository.delete = vi.fn();
  });

  it("should throw BadRequestError if coupon code is not provided", async () => {
    await expect(couponService.validateCoupon("user1", "", 10000)).rejects.toThrow(
      new BadRequestError("Coupon code is required")
    );
  });

  it("should throw BadRequestError if coupon is not found or inactive", async () => {
    couponRepository.findActiveByCode.mockResolvedValue(null);

    await expect(couponService.validateCoupon("user1", "INVALID", 10000)).rejects.toThrow(
      new BadRequestError("Coupon not found or inactive")
    );
    expect(couponRepository.findActiveByCode).toHaveBeenCalledWith("INVALID");
  });

  it("should throw BadRequestError if coupon has expired", async () => {
    const expiredCoupon = {
      id: "coupon1",
      code: "EXPIRED",
      is_active: true,
      expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    };
    couponRepository.findActiveByCode.mockResolvedValue(expiredCoupon);

    await expect(couponService.validateCoupon("user1", "EXPIRED", 10000)).rejects.toThrow(
      new BadRequestError("Coupon has expired")
    );
  });

  it("should throw BadRequestError if coupon usage limit is reached", async () => {
    const limitedCoupon = {
      id: "coupon1",
      code: "LIMIT",
      is_active: true,
      usage_limit: 10,
      used_count: 10,
    };
    couponRepository.findActiveByCode.mockResolvedValue(limitedCoupon);

    await expect(couponService.validateCoupon("user1", "LIMIT", 10000)).rejects.toThrow(
      new BadRequestError("Coupon usage limit reached")
    );
  });

  it("should throw BadRequestError if minimum order value is not met", async () => {
    const coupon = {
      id: "coupon1",
      code: "MINORDER",
      is_active: true,
      min_order: 5000, // ₹50.00
    };
    couponRepository.findActiveByCode.mockResolvedValue(coupon);

    await expect(couponService.validateCoupon("user1", "MINORDER", 4000)).rejects.toThrow(
      new BadRequestError("Minimum order value of ₹50.00 required to use this coupon")
    );
  });

  it("should throw BadRequestError if user has already used the coupon", async () => {
    const coupon = {
      id: "coupon1",
      code: "ALREADYUSED",
      is_active: true,
      min_order: 0,
    };
    couponRepository.findActiveByCode.mockResolvedValue(coupon);
    couponRepository.findUsage.mockResolvedValue({ id: "usage1" });

    await expect(couponService.validateCoupon("user1", "ALREADYUSED", 10000)).rejects.toThrow(
      new BadRequestError("You have already used this coupon")
    );
    expect(couponRepository.findUsage).toHaveBeenCalledWith("user1", "coupon1");
  });

  it("should correctly calculate percent discount", async () => {
    const coupon = {
      id: "coupon1",
      code: "DISCOUNT10",
      is_active: true,
      type: "percent",
      discount: 10,
      description: "Get 10% off",
    };
    couponRepository.findActiveByCode.mockResolvedValue(coupon);
    couponRepository.findUsage.mockResolvedValue(null);

    const result = await couponService.validateCoupon("user1", "DISCOUNT10", 10000); // ₹100.00
    expect(result).toEqual({
      valid: true,
      discount_amount: 1000, // 10% of 10000 is 1000
      discount_type: "percent",
      message: "Get 10% off",
    });
  });

  it("should enforce max discount limit on percent discount", async () => {
    const coupon = {
      id: "coupon1",
      code: "DISCOUNT50",
      is_active: true,
      type: "percent",
      discount: 50,
      max_discount: 1500, // ₹15.00 max discount
      description: "Get 50% off",
    };
    couponRepository.findActiveByCode.mockResolvedValue(coupon);
    couponRepository.findUsage.mockResolvedValue(null);

    const result = await couponService.validateCoupon("user1", "DISCOUNT50", 10000); // ₹100.00
    expect(result).toEqual({
      valid: true,
      discount_amount: 1500, // 50% of 10000 is 5000, capped at 1500
      discount_type: "percent",
      message: "Get 50% off",
    });
  });

  it("should correctly calculate flat discount", async () => {
    const coupon = {
      id: "coupon1",
      code: "FLAT15",
      is_active: true,
      type: "flat",
      discount: 1500, // ₹15.00 flat discount
    };
    couponRepository.findActiveByCode.mockResolvedValue(coupon);
    couponRepository.findUsage.mockResolvedValue(null);

    const result = await couponService.validateCoupon("user1", "FLAT15", 10000);
    expect(result).toEqual({
      valid: true,
      discount_amount: 1500,
      discount_type: "flat",
      message: "Coupon applied successfully",
    });
  });
});

describe("couponService - other methods", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    couponRepository.findActiveByCode = vi.fn();
    couponRepository.findUsage = vi.fn();
    couponRepository.findAllActive = vi.fn();
    couponRepository.findAll = vi.fn();
    couponRepository.create = vi.fn();
    couponRepository.findById = vi.fn();
    couponRepository.update = vi.fn();
    couponRepository.delete = vi.fn();
  });

  it("should return public active coupons", async () => {
    const activeCoupons = [{ id: "c1", code: "C1" }];
    couponRepository.findAllActive.mockResolvedValue(activeCoupons);

    const result = await couponService.getCouponsPublic();
    expect(result).toEqual(activeCoupons);
    expect(couponRepository.findAllActive).toHaveBeenCalled();
  });

  it("should return all coupons for admin", async () => {
    const allCoupons = [{ id: "c1", code: "C1" }, { id: "c2", code: "C2" }];
    couponRepository.findAll.mockResolvedValue(allCoupons);

    const result = await couponService.getCouponsAdmin();
    expect(result).toEqual(allCoupons);
    expect(couponRepository.findAll).toHaveBeenCalled();
  });

  it("should create coupon with normalized data", async () => {
    const inputData = {
      code: "TESTCOUPON",
      discount: "15",
      type: "percent",
      min_order: "2000",
      max_discount: "500",
      description: "Test description",
      expires_at: "2026-12-31",
      usage_limit: "50",
    };
    const createdCoupon = { id: "new1", ...inputData };
    couponRepository.create.mockResolvedValue(createdCoupon);

    const result = await couponService.createCoupon(inputData);
    expect(result).toEqual(createdCoupon);
    expect(couponRepository.create).toHaveBeenCalledWith({
      code: "TESTCOUPON",
      discount: 15,
      type: "percent",
      minOrderValue: 2000,
      maxDiscount: 500,
      description: "Test description",
      expiresAt: "2026-12-31",
      usageLimit: 50,
    });
  });

  it("should update an existing coupon", async () => {
    const existing = { id: "c1", code: "C1" };
    const updates = { discount: 20 };
    couponRepository.findById.mockResolvedValue(existing);
    couponRepository.update.mockResolvedValue({ ...existing, ...updates });

    const result = await couponService.updateCoupon("c1", updates);
    expect(result).toEqual({ id: "c1", code: "C1", discount: 20 });
    expect(couponRepository.findById).toHaveBeenCalledWith("c1");
    expect(couponRepository.update).toHaveBeenCalledWith("c1", updates);
  });

  it("should throw NotFoundError if updating non-existing coupon", async () => {
    couponRepository.findById.mockResolvedValue(null);

    await expect(couponService.updateCoupon("invalid", { discount: 20 })).rejects.toThrow(
      new NotFoundError("Coupon not found")
    );
  });

  it("should delete a coupon", async () => {
    couponRepository.delete.mockResolvedValue({ id: "c1" });

    const result = await couponService.deleteCoupon("c1");
    expect(result).toEqual({ id: "c1" });
    expect(couponRepository.delete).toHaveBeenCalledWith("c1");
  });

  it("should throw NotFoundError if deleting non-existing coupon", async () => {
    couponRepository.delete.mockResolvedValue(null);

    await expect(couponService.deleteCoupon("invalid")).rejects.toThrow(
      new NotFoundError("Coupon not found")
    );
  });
});
