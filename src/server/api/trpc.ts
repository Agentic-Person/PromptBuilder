import { initTRPC, TRPCError } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;
  
  // Get user from session
  const authHeader = req.headers.authorization;
  let user = null;
  
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser } } = await supabase.auth.getUser(token);
    
    if (authUser) {
      const { data } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('id', authUser.id)
        .single();
      
      user = data;
    }
  }

  return {
    supabase,
    user,
    req,
    res,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: undefined,
});

export const createTRPCRouter = t.router;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);