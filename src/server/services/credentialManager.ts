import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { n8nClient } from './n8nClient';
import { TRPCError } from '@trpc/server';

export interface OrgCredential {
  id: string;
  org_id: string;
  service: 'openai' | 'anthropic' | 'google' | 'gmail' | 'slack' | 'twitter' | 'linkedin';
  credential_name: string;
  encrypted_key: string;
  created_at: string;
  updated_at: string;
}

export class CredentialManager {
  private supabase;
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-gcm';

  constructor() {
    this.supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_KEY
    );

    // Generate encryption key from environment variable or create a default one
    // In production, this should be a secure 32-byte key stored in env
    const keyString = env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    this.encryptionKey = Buffer.from(keyString, 'hex');
  }

  // Encrypt API keys before storage
  private async encryptCredential(apiKey: string): Promise<{ encrypted: string; iv: string; authTag: string }> {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  // Decrypt API keys when needed
  private async decryptCredential(encryptedData: string): Promise<string> {
    // Parse the stored format: encrypted:iv:authTag
    const [encrypted, ivHex, authTagHex] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async storeOrgCredential(orgId: string, service: string, apiKey: string) {
    try {
      // Encrypt the API key
      const { encrypted, iv, authTag } = await this.encryptCredential(apiKey);
      const encryptedData = `${encrypted}:${iv}:${authTag}`;
      
      const credentialName = `org_${orgId}_${service}`;
      
      // Store in Supabase
      const { data: credential, error } = await this.supabase
        .from('org_credentials')
        .upsert({
          org_id: orgId,
          service: service,
          encrypted_key: encryptedData,
          credential_name: credentialName,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'org_id,service'
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to store credential',
        });
      }
      
      // Create or update in n8n
      await this.createN8nCredential(orgId, service, apiKey);
      
      return { success: true, credentialId: credential.id };
    } catch (error) {
      console.error('Failed to store credential:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to store credential',
      });
    }
  }

  private async createN8nCredential(orgId: string, service: string, apiKey: string) {
    const credentialName = `org_${orgId}_${service}`;
    
    // Map service names to n8n credential types
    const credentialTypeMap: Record<string, { type: string; data: any }> = {
      openai: {
        type: 'openAiApi',
        data: { apiKey }
      },
      anthropic: {
        type: 'anthropicApi', 
        data: { apiKey }
      },
      google: {
        type: 'googleGenerativeAiApi',
        data: { apiKey }
      },
      gmail: {
        type: 'gmailOAuth2',
        data: {
          // Gmail OAuth requires more complex setup
          // This is a placeholder - would need actual OAuth flow
          clientId: 'placeholder',
          clientSecret: 'placeholder',
          accessToken: apiKey
        }
      },
      slack: {
        type: 'slackOAuth2',
        data: {
          accessToken: apiKey
        }
      },
      twitter: {
        type: 'twitterOAuth2',
        data: {
          accessToken: apiKey
        }
      },
      linkedin: {
        type: 'linkedInOAuth2',
        data: {
          accessToken: apiKey
        }
      }
    };

    const credentialConfig = credentialTypeMap[service];
    if (!credentialConfig) {
      console.warn(`Unknown service type: ${service}`);
      return;
    }

    try {
      // Check if credential already exists
      const existingCredentials = await n8nClient.listCredentials();
      const existing = existingCredentials.find(c => c.name === credentialName);
      
      if (existing && existing.id) {
        // Update existing credential
        await n8nClient.updateCredential(existing.id, {
          name: credentialName,
          type: credentialConfig.type,
          data: credentialConfig.data
        });
      } else {
        // Create new credential
        await n8nClient.createCredential({
          name: credentialName,
          type: credentialConfig.type,
          data: credentialConfig.data
        });
      }
    } catch (error) {
      console.error('Failed to create n8n credential:', error);
      // Don't throw here - credential storage in Supabase succeeded
      // n8n credential can be retried later
    }
  }

  async getOrgCredentials(orgId: string): Promise<Omit<OrgCredential, 'encrypted_key'>[]> {
    const { data, error } = await this.supabase
      .from('org_credentials')
      .select('id, org_id, service, credential_name, created_at, updated_at')
      .eq('org_id', orgId);

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch credentials',
      });
    }

    return data || [];
  }

  async deleteOrgCredential(orgId: string, service: string) {
    const credentialName = `org_${orgId}_${service}`;
    
    // Delete from Supabase
    const { error } = await this.supabase
      .from('org_credentials')
      .delete()
      .eq('org_id', orgId)
      .eq('service', service);

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete credential',
      });
    }

    // Delete from n8n
    try {
      const credentials = await n8nClient.listCredentials();
      const credential = credentials.find(c => c.name === credentialName);
      
      if (credential && credential.id) {
        await n8nClient.deleteCredential(credential.id);
      }
    } catch (error) {
      console.error('Failed to delete n8n credential:', error);
      // Don't throw - Supabase deletion succeeded
    }

    return { success: true };
  }

  // Test a credential by making a simple API call
  async testCredential(orgId: string, service: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { data } = await this.supabase
        .from('org_credentials')
        .select('encrypted_key')
        .eq('org_id', orgId)
        .eq('service', service)
        .single();

      if (!data) {
        return { success: false, message: 'Credential not found' };
      }

      const apiKey = await this.decryptCredential(data.encrypted_key);

      // Simple test calls for each service
      switch (service) {
        case 'openai':
          const openaiResponse = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          return { success: openaiResponse.ok, message: openaiResponse.ok ? 'Valid OpenAI key' : 'Invalid OpenAI key' };

        case 'anthropic':
          const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              messages: [{ role: 'user', content: 'Test' }],
              max_tokens: 1
            })
          });
          return { success: anthropicResponse.ok, message: anthropicResponse.ok ? 'Valid Anthropic key' : 'Invalid Anthropic key' };

        default:
          return { success: true, message: 'Credential stored (test not implemented for this service)' };
      }
    } catch (error) {
      console.error('Credential test failed:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Test failed' };
    }
  }
}

export const credentialManager = new CredentialManager();