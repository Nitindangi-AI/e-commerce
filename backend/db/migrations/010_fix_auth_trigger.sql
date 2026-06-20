-- ============================================
-- Migration 010: Fix public.handle_new_user trigger function
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  full_name TEXT;
  first_name TEXT;
  last_name TEXT;
  avatar_url TEXT;
  phone_val TEXT;
BEGIN
  -- Extract from NEW.profile or NEW.metadata in InsForge schema
  user_role := COALESCE(NEW.profile->>'role', NEW.metadata->>'role', 'customer');
  full_name := COALESCE(NEW.profile->>'full_name', NEW.profile->>'name', NEW.metadata->>'full_name', '');
  first_name := COALESCE(NEW.profile->>'first_name', NEW.metadata->>'first_name', '');
  last_name := COALESCE(NEW.profile->>'last_name', NEW.metadata->>'last_name', '');
  avatar_url := COALESCE(NEW.profile->>'avatar_url', NEW.metadata->>'avatar_url', '');
  phone_val := COALESCE(NEW.profile->>'phone', NEW.metadata->>'phone', '');

  -- Map legacy role 'user' to 'customer'
  IF user_role = 'user' THEN
    user_role := 'customer';
  END IF;

  INSERT INTO public.profiles (id, email, phone, full_name, first_name, last_name, role, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    phone_val,
    full_name,
    first_name,
    last_name,
    CASE WHEN user_role IN ('customer', 'vendor', 'admin') THEN user_role ELSE 'customer' END,
    avatar_url
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE public.profiles.phone END,
    full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    first_name = CASE WHEN EXCLUDED.first_name <> '' THEN EXCLUDED.first_name ELSE public.profiles.first_name END,
    last_name = CASE WHEN EXCLUDED.last_name <> '' THEN EXCLUDED.last_name ELSE public.profiles.last_name END,
    role = EXCLUDED.role,
    avatar_url = CASE WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url ELSE public.profiles.avatar_url END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
