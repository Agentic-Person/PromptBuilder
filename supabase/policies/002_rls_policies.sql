-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_metrics_hourly ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;

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