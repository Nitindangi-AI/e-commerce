-- ============================================
-- Migration 006: Fix registration blocker (first_name / last_name defaults and trigger)
-- ============================================

-- 1. Alter profiles table to add column-level defaults for first_name and last_name
ALTER TABLE public.profiles ALTER COLUMN first_name SET DEFAULT '';
ALTER TABLE public.profiles ALTER COLUMN last_name SET DEFAULT '';

-- 2. Update the handle_new_user trigger function to explicitly insert first_name and last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, first_name, last_name)
  VALUES (NEW.id, '', '', 'customer', '', '')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
