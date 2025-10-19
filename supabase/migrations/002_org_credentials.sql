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
CREATE INDEX idx_org_credentials_org_id ON org_credentials(org_id);
CREATE INDEX idx_org_credentials_service ON org_credentials(service);

-- Apply updated_at trigger
CREATE TRIGGER update_org_credentials_updated_at BEFORE UPDATE ON org_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE org_credentials ENABLE ROW LEVEL SECURITY;

-- Only allow users to access credentials from their own organization
CREATE POLICY "Users can view their org credentials" ON org_credentials
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

-- Only allow org admins to insert/update/delete credentials
CREATE POLICY "Org admins can manage credentials" ON org_credentials
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );