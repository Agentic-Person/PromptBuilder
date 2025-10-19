import { initTRPC, TRPCError } from '@trpc/server';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

export const createTRPCContext = async (opts: { req: any; res: any }) => {
  const { req, res } = opts;
  
  // Create Supabase client for server-side
  const supabase = createServerSupabaseClient<Database>({ req, res });
  
  // Get the current session
  const { data: { session } } = await supabase.auth.getSession();
  
  let user = null;
  
  if (session?.user) {
    // Get the user record with organization info
    const { data } = await supabase
      .from('profiles')
      .select(`
        *,
        organizations (
          id,
          name,
          plan,
          settings
        )
      `)
      .eq('id', session.user.id)
      .single();
    
    user = data;
  }

  return {
    supabase,
    user,
    session,
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