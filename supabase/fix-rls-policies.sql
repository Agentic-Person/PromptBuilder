-- Fix RLS policies to avoid infinite recursion
-- Run this in Supabase SQL Editor

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Organization admins can update their organization" ON organizations;
DROP POLICY IF EXISTS "Users can view members of their organization" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Organization admins can manage users" ON profiles;
DROP POLICY IF EXISTS "Users can view their organization's prompt chains" ON prompt_chains;
DROP POLICY IF EXISTS "Users can create prompt chains for their organization" ON prompt_chains;
DROP POLICY IF EXISTS "Users can update their own prompt chains" ON prompt_chains;
DROP POLICY IF EXISTS "Users can delete their own prompt chains" ON prompt_chains;
DROP POLICY IF EXISTS "Users can view their organization's executions" ON prompt_executions;
DROP POLICY IF EXISTS "Users can create executions for their organization" ON prompt_executions;
DROP POLICY IF EXISTS "Users can view their organization's metrics" ON prompt_metrics_hourly;
DROP POLICY IF EXISTS "Users can view their organization's experiments" ON experiments;
DROP POLICY IF EXISTS "Users can create experiments for their organization" ON experiments;
DROP POLICY IF EXISTS "Users can update their organization's experiments" ON experiments;
DROP POLICY IF EXISTS "Organization admins can delete experiments" ON experiments;
DROP POLICY IF EXISTS "Users can view their org credentials" ON org_credentials;
DROP POLICY IF EXISTS "Org admins can manage credentials" ON org_credentials;

-- Profiles policies (no recursion - use auth.uid() directly)
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can view members of their organization" ON profiles
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Organization admins can manage users" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND org_id = profiles.org_id
    )
  );

-- Organizations policies (use auth.uid() directly)
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Organization admins can update their organization" ON organizations
  FOR UPDATE USING (
    id = (SELECT org_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Prompt chains policies
CREATE POLICY "Users can view their organization's prompt chains" ON prompt_chains
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create prompt chains for their organization" ON prompt_chains
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their own prompt chains" ON prompt_chains
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND org_id = prompt_chains.org_id
    )
  );

CREATE POLICY "Users can delete their own prompt chains" ON prompt_chains
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND org_id = prompt_chains.org_id
    )
  );

-- Prompt executions policies
CREATE POLICY "Users can view their organization's executions" ON prompt_executions
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create executions for their organization" ON prompt_executions
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Prompt metrics policies
CREATE POLICY "Users can view their organization's metrics" ON prompt_metrics_hourly
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Prompt templates policies (marketplace)
CREATE POLICY "Anyone can view published templates" ON prompt_templates
  FOR SELECT USING (true);

CREATE POLICY "Users can create templates" ON prompt_templates
  FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update their own templates" ON prompt_templates
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own templates" ON prompt_templates
  FOR DELETE USING (author_id = auth.uid());

-- Experiments policies
CREATE POLICY "Users can view their organization's experiments" ON experiments
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create experiments for their organization" ON experiments
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their organization's experiments" ON experiments
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Organization admins can delete experiments" ON experiments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND org_id = experiments.org_id
    )
  );

-- Credentials policies
CREATE POLICY "Users can view their org credentials" ON org_credentials
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Org admins can manage credentials" ON org_credentials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND org_id = org_credentials.org_id
    )
  );