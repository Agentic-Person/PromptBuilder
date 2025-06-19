import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

const metricsQuerySchema = z.object({
  chainId: z.string().uuid().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
});

export const analyticsRouter = createTRPCRouter({
  getMetrics: protectedProcedure
    .input(metricsQuerySchema)
    .query(async ({ ctx, input }) => {
      const { chainId, startDate, endDate } = input;
      
      let query = ctx.supabase
        .from('prompt_executions')
        .select('*')
        .eq('org_id', ctx.user.org_id);

      if (chainId) {
        query = query.eq('chain_id', chainId);
      }

      if (startDate) {
        query = query.gte('started_at', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('started_at', endDate.toISOString());
      }

      const { data: executions, error } = await query;

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      // Calculate metrics
      const metrics = {
        totalExecutions: executions.length,
        successRate: executions.filter(e => e.status === 'completed').length / executions.length * 100,
        totalCost: executions.reduce((sum, e) => sum + (e.cost_data?.total || 0), 0),
        averageLatency: executions.reduce((sum, e) => sum + (e.metrics?.latency || 0), 0) / executions.length,
        executionsByStatus: executions.reduce((acc, e) => {
          acc[e.status] = (acc[e.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };

      return metrics;
    }),

  getExecutionHistory: protectedProcedure
    .input(
      z.object({
        chainId: z.string().uuid().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('prompt_executions')
        .select('*, prompt_chains(name)')
        .eq('org_id', ctx.user.org_id)
        .order('started_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (input.chainId) {
        query = query.eq('chain_id', input.chainId);
      }

      const { data, error } = await query;

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      return data;
    }),

  getCostAnalysis: protectedProcedure
    .input(
      z.object({
        period: z.enum(['day', 'week', 'month']).default('week'),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      let startDate = new Date();

      switch (input.period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      const { data: executions, error } = await ctx.supabase
        .from('prompt_executions')
        .select('cost_data, started_at, chain_id')
        .eq('org_id', ctx.user.org_id)
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: true });

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      // Group by day
      const costByDay = executions.reduce((acc, e) => {
        const day = new Date(e.started_at).toISOString().split('T')[0];
        if (!acc[day]) acc[day] = 0;
        acc[day] += e.cost_data?.total || 0;
        return acc;
      }, {} as Record<string, number>);

      // Group by chain
      const costByChain = executions.reduce((acc, e) => {
        if (!acc[e.chain_id]) acc[e.chain_id] = 0;
        acc[e.chain_id] += e.cost_data?.total || 0;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalCost: executions.reduce((sum, e) => sum + (e.cost_data?.total || 0), 0),
        costByDay,
        costByChain,
      };
    }),
});