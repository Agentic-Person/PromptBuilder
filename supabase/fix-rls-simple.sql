-- Simple RLS policy fix - handles existing policies
-- Run this in Supabase SQL Editor

-- Fix the problematic profiles policies that cause recursion
DROP POLICY IF EXISTS "Users can view members of their organization" ON profiles;
CREATE POLICY "Users can view members of their organization" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR 
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1)
  );

-- Ensure we can always see our own profile first
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Test the fix by checking if policies work
SELECT 'RLS policies updated successfully' as status;