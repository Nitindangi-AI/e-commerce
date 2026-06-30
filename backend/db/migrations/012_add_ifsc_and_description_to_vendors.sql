-- ============================================
-- Migration 012: Add IFSC and Description to Vendors
-- ============================================

ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS ifsc_code TEXT DEFAULT '';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS store_description TEXT DEFAULT '';
