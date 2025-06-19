import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

const createPromptChainSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  config: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
  }),
});

const executePromptSchema = z.object({
  chainId: z.string().uuid(),
  input: z.record(z.any()),
});

export const promptChainsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('prompt_chains')
      .select('*')
      .eq('org_id', ctx.user.org_id)
      .order('created_at', { ascending: false });

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    
    return data;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('prompt_chains')
        .select('*')
        .eq('id', input.id)
        .eq('org_id', ctx.user.org_id)
        .single();

      if (error) throw new TRPCError({ code: 'NOT_FOUND' });
      
      return data;
    }),

  create: protectedProcedure
    .input(createPromptChainSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('prompt_chains')
        .insert({
          ...input,
          org_id: ctx.user.org_id,
          created_by: ctx.user.id,
        })
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      
      return data;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: createPromptChainSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('prompt_chains')
        .update(input.data)
        .eq('id', input.id)
        .eq('org_id', ctx.user.org_id)
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      
      return data;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('prompt_chains')
        .delete()
        .eq('id', input.id)
        .eq('org_id', ctx.user.org_id);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      
      return { success: true };
    }),

  execute: protectedProcedure
    .input(executePromptSchema)
    .mutation(async ({ ctx, input }) => {
      // Import the workflow executor
      const { workflowExecutor } = await import('../../services/workflowExecutor');
      
      // Execute the workflow using n8n
      const result = await workflowExecutor.executeWorkflow({
        chainId: input.chainId,
        orgId: ctx.user.org_id,
        userId: ctx.user.id,
        inputData: input.input,
      });

      return result;
    }),

  // Get execution status
  getExecutionStatus: protectedProcedure
    .input(z.object({ executionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { workflowExecutor } = await import('../../services/workflowExecutor');
      
      return workflowExecutor.getExecutionStatus(input.executionId);
    }),
});