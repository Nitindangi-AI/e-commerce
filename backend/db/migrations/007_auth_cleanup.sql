-- ============================================
-- Migration 007: Safe Role System Normalization
-- ============================================

-- 1. Sync any existing 'user' roles to 'customer' to avoid constraint failure
UPDATE public.profiles SET role = 'customer' WHERE role = 'user';

-- 2. Safely drop the old constraint if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 3. Add strict constraint allowing only customer, vendor, admin
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('customer', 'vendor', 'admin'));

-- 4. Recreate trigger function to read and map metadata roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  full_name TEXT;
  first_name TEXT;
  last_name TEXT;
  avatar_url TEXT;
BEGIN
  -- Extract from raw_user_meta_data
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
  first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  avatar_url := COALESCE(NEW.raw_user_meta_data->>'avatar_url', '');

  -- Map legacy role 'user' to 'customer'
  IF user_role = 'user' THEN
    user_role := 'customer';
  END IF;

  INSERT INTO public.profiles (id, email, phone, full_name, first_name, last_name, role, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.phone, ''),
    full_name,
    first_name,
    last_name,
    CASE WHEN user_role IN ('customer', 'vendor', 'admin') THEN user_role ELSE 'customer' END,
    avatar_url
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    first_name = CASE WHEN EXCLUDED.first_name <> '' THEN EXCLUDED.first_name ELSE public.profiles.first_name END,
    last_name = CASE WHEN EXCLUDED.last_name <> '' THEN EXCLUDED.last_name ELSE public.profiles.last_name END,
    role = EXCLUDED.role,
    avatar_url = CASE WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url ELSE public.profiles.avatar_url END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
