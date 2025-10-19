import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { credentialManager } from '@/server/services/credentialManager';

const serviceSchema = z.enum(['openai', 'anthropic', 'google', 'gmail', 'slack', 'twitter', 'linkedin']);

export const credentialsRouter = createTRPCRouter({
  // Store a new credential or update existing one
  store: protectedProcedure
    .input(z.object({
      service: serviceSchema,
      apiKey: z.string().min(1, 'API key is required')
    }))
    .mutation(async ({ ctx, input }) => {
      // Only admins can manage credentials
      if (ctx.user.role !== 'admin') {
        throw new Error('Only administrators can manage credentials');
      }

      const result = await credentialManager.storeOrgCredential(
        ctx.user.org_id,
        input.service,
        input.apiKey
      );
      
      return result;
    }),
    
  // List all credentials for the organization (without decrypted keys)
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const credentials = await credentialManager.getOrgCredentials(ctx.user.org_id);
      
      return credentials.map(cred => ({
        id: cred.id,
        service: cred.service,
        createdAt: cred.created_at,
        updatedAt: cred.updated_at,
        isConfigured: true
      }));
    }),
    
  // Delete a credential
  delete: protectedProcedure
    .input(z.object({
      service: serviceSchema
    }))
    .mutation(async ({ ctx, input }) => {
      // Only admins can delete credentials
      if (ctx.user.role !== 'admin') {
        throw new Error('Only administrators can manage credentials');
      }

      const result = await credentialManager.deleteOrgCredential(
        ctx.user.org_id,
        input.service
      );
      
      return result;
    }),
    
  // Test a credential
  test: protectedProcedure
    .input(z.object({
      service: serviceSchema
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await credentialManager.testCredential(
        ctx.user.org_id,
        input.service
      );
      
      return result;
    }),
    
  // Check which services have credentials configured
  status: protectedProcedure
    .query(async ({ ctx }) => {
      const credentials = await credentialManager.getOrgCredentials(ctx.user.org_id);
      
      const services = ['openai', 'anthropic', 'google', 'gmail', 'slack', 'twitter', 'linkedin'] as const;
      
      return services.reduce((acc, service) => {
        acc[service] = credentials.some(cred => cred.service === service);
        return acc;
      }, {} as Record<string, boolean>);
    })
});