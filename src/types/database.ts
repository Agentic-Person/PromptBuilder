export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          plan: string;
          settings: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          plan?: string;
          settings?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          plan?: string;
          settings?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          org_id: string | null;
          email: string;
          role: 'admin' | 'member' | 'viewer';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          email: string;
          role?: 'admin' | 'member' | 'viewer';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          email?: string;
          role?: 'admin' | 'member' | 'viewer';
          created_at?: string;
          updated_at?: string;
        };
      };
      prompt_chains: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          description: string | null;
          version: number;
          status: 'draft' | 'active' | 'archived';
          config: any;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          description?: string | null;
          version?: number;
          status?: 'draft' | 'active' | 'archived';
          config: any;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          description?: string | null;
          version?: number;
          status?: 'draft' | 'active' | 'archived';
          config?: any;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      org_credentials: {
        Row: {
          id: string;
          org_id: string;
          service: 'openai' | 'anthropic' | 'google' | 'gmail' | 'slack' | 'twitter' | 'linkedin';
          credential_name: string;
          encrypted_key: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          service: 'openai' | 'anthropic' | 'google' | 'gmail' | 'slack' | 'twitter' | 'linkedin';
          credential_name: string;
          encrypted_key: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          service?: 'openai' | 'anthropic' | 'google' | 'gmail' | 'slack' | 'twitter' | 'linkedin';
          credential_name?: string;
          encrypted_key?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}