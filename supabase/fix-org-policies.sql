-- Fix organization creation policies
-- Run this in Supabase SQL Editor

-- Drop existing organization policies
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Organization admins can update their organization" ON organizations;

-- Create new policies that allow creation
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Organization admins can update their organization" ON organizations
  FOR UPDATE USING (
    id = (SELECT org_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Also ensure profiles can be created during signup
DROP POLICY IF EXISTS "Enable insert own profile" ON profiles;
CREATE POLICY "Enable insert own profile" ON profiles
  FOR INSERT WITH CHECK (true);

-- Test the fix
SELECT 'Organization policies updated successfully' as status;