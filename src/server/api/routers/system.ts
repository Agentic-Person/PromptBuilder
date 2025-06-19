import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc';
import { n8nClient } from '../../services/n8nClient';

export const systemRouter = createTRPCRouter({
  // Health check endpoint
  health: publicProcedure.query(async () => {
    const checks = {
      api: 'ok',
      database: 'ok',
      n8n: 'unknown',
    };

    try {
      // Check n8n health
      const n8nHealth = await n8nClient.healthCheck();
      checks.n8n = n8nHealth.status;
    } catch (error) {
      checks.n8n = 'error';
    }

    const allHealthy = Object.values(checks).every(status => status === 'ok');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };
  }),

  // Get system configuration (for debugging)
  config: protectedProcedure.query(async ({ ctx }) => {
    // Only allow admins to see config
    if (ctx.user.role !== 'admin') {
      return { message: 'Unauthorized' };
    }

    return {
      environment: process.env.NODE_ENV,
      n8n: {
        configured: !!process.env.N8N_BASE_URL,
        baseUrl: process.env.N8N_BASE_URL || 'Not configured',
      },
      supabase: {
        configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      },
      llmProviders: {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
      },
    };
  }),

  // Test n8n connection
  testN8nConnection: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    try {
      const health = await n8nClient.healthCheck();
      const workflows = await n8nClient.listWorkflows();
      
      return {
        connected: true,
        status: health.status,
        workflowCount: workflows.length,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),
});