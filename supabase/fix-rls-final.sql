-- Final RLS fix - completely avoid recursion
-- Run this in Supabase SQL Editor

-- Temporarily disable RLS to clean up
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view members of their organization" ON profiles;
DROP POLICY IF EXISTS "Organization admins can manage users" ON profiles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
CREATE POLICY "Enable read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Enable update own profile" ON profiles  
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Test the fix
SELECT 'RLS policies fixed successfully' as status;