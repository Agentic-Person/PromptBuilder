-- PromptBuilder Complete Database Schema
-- Execute this in Supabase SQL Editor: https://aynbiauvjdhgkvvhojzp.supabase.co/project/settings/database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table for multi-tenant architecture
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table with organization association
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompt chains for workflow management
CREATE TABLE prompt_chains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  config JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Execution tracking for analytics
CREATE TABLE prompt_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chain_id UUID REFERENCES prompt_chains(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  input_data JSONB,
  output_data JSONB,
  metrics JSONB,
  cost_data JSONB,
  error_details JSONB
);

-- Analytics aggregation tables
CREATE TABLE prompt_metrics_hourly (
  chain_id UUID REFERENCES prompt_chains(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  hour TIMESTAMP WITH TIME ZONE NOT NULL,
  executions INTEGER DEFAULT 0,
  total_cost DECIMAL DEFAULT 0,
  avg_latency_ms INTEGER,
  error_count INTEGER DEFAULT 0,
  success_rate DECIMAL DEFAULT 0,
  PRIMARY KEY (chain_id, hour)
);

-- Marketplace for prompt templates
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price DECIMAL DEFAULT 0,
  config JSONB NOT NULL,
  author_id UUID REFERENCES users(id),
  rating DECIMAL DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B testing framework
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  chain_id UUID REFERENCES prompt_chains(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  variants JSONB NOT NULL,
  status TEXT DEFAULT 'running' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  results JSONB
);

-- Organization credentials table for storing encrypted API keys
CREATE TABLE org_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('openai', 'anthropic', 'google', 'gmail', 'slack', 'twitter', 'linkedin')),
  credential_name TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, service)
);

-- Create indexes for performance
CREATE INDEX idx_prompt_chains_org_id ON prompt_chains(org_id);
CREATE INDEX idx_prompt_executions_chain_id ON prompt_executions(chain_id);
CREATE INDEX idx_prompt_executions_org_id ON prompt_executions(org_id);
CREATE INDEX idx_prompt_executions_started_at ON prompt_executions(started_at);
CREATE INDEX idx_prompt_metrics_hourly_hour ON prompt_metrics_hourly(hour);
CREATE INDEX idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_org_credentials_org_id ON org_credentials(org_id);
CREATE INDEX idx_org_credentials_service ON org_credentials(service);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_chains_updated_at BEFORE UPDATE ON prompt_chains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_templates_updated_at BEFORE UPDATE ON prompt_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_credentials_updated_at BEFORE UPDATE ON org_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_metrics_hourly ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_credentials ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can update their organization" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users policies
CREATE POLICY "Users can view members of their organization" ON users
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Organization admins can manage users" ON users
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Prompt chains policies
CREATE POLICY "Users can view their organization's prompt chains" ON prompt_chains
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create prompt chains for their organization" ON prompt_chains
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own prompt chains" ON prompt_chains
  FOR UPDATE USING (
    created_by = auth.uid() OR
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can delete their own prompt chains" ON prompt_chains
  FOR DELETE USING (
    created_by = auth.uid() OR
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Prompt executions policies
CREATE POLICY "Users can view their organization's executions" ON prompt_executions
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create executions for their organization" ON prompt_executions
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

-- Prompt metrics policies
CREATE POLICY "Users can view their organization's metrics" ON prompt_metrics_hourly
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
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
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create experiments for their organization" ON experiments
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization's experiments" ON experiments
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can delete experiments" ON experiments
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Credentials policies
CREATE POLICY "Users can view their org credentials" ON org_credentials
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage credentials" ON org_credentials
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert a sample organization and admin user for testing
INSERT INTO organizations (id, name, plan) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'PromptBuilder Demo', 'free');

-- Note: You'll need to create a user through Supabase Auth first, then update this with their actual auth.uid()
-- INSERT INTO users (id, org_id, email, role) 
-- VALUES (auth.uid(), '550e8400-e29b-41d4-a716-446655440000', 'your-email@example.com', 'admin');