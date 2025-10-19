import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

export const createServerClient = () => {
  return createServerSupabaseClient<Database>({
    cookies,
  });
};