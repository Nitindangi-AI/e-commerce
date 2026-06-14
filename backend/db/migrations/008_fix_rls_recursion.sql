-- Drop the recursive policy that causes stack depth limit exceeded errors
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
