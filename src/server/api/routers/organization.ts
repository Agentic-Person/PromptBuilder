import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const organizationRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('organizations')
      .select('*')
      .eq('id', ctx.user.org_id)
      .single();

    if (error) throw new TRPCError({ code: 'NOT_FOUND' });
    
    return data;
  }),

  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        settings: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can update organization' });
      }

      const { data, error } = await ctx.supabase
        .from('organizations')
        .update(input)
        .eq('id', ctx.user.org_id)
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      
      return data;
    }),

  getMembers: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('profiles')
      .select('id, email, role, created_at')
      .eq('org_id', ctx.user.org_id)
      .order('created_at', { ascending: true });

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    
    return data;
  }),

  inviteMember: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(['admin', 'member', 'viewer']).default('member'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can invite members' });
      }

      // TODO: Implement invite logic with Supabase Auth
      // For now, return a mock response
      return {
        success: true,
        message: `Invitation sent to ${input.email}`,
      };
    }),

  updateMemberRole: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: z.enum(['admin', 'member', 'viewer']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can update member roles' });
      }

      // Prevent removing the last admin
      if (input.userId === ctx.user.id && input.role !== 'admin') {
        const { count } = await ctx.supabase
          .from('users')
          .select('id', { count: 'exact' })
          .eq('org_id', ctx.user.org_id)
          .eq('role', 'admin');

        if (count === 1) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Cannot remove the last admin from organization' 
          });
        }
      }

      const { data, error } = await ctx.supabase
        .from('users')
        .update({ role: input.role })
        .eq('id', input.userId)
        .eq('org_id', ctx.user.org_id)
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      
      return data;
    }),

  removeMember: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can remove members' });
      }

      // Prevent self-removal
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot remove yourself from organization' });
      }

      const { error } = await ctx.supabase
        .from('users')
        .delete()
        .eq('id', input.userId)
        .eq('org_id', ctx.user.org_id);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      
      return { success: true };
    }),
});