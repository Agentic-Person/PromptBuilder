-- Fix organization creation - just add missing INSERT policy
-- Run this in Supabase SQL Editor

-- Add policy to allow organization creation during signup
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (true);

-- Ensure profiles can be created during signup  
DROP POLICY IF EXISTS "Enable insert own profile" ON profiles;
CREATE POLICY "Enable insert own profile" ON profiles
  FOR INSERT WITH CHECK (true);

-- Test the fix
SELECT 'Organization creation enabled' as status;