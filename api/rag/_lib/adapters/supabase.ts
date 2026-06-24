import { createClient } from '@supabase/supabase-js';

import { ragEnv } from '../env.js';

export function createSupabaseServiceClient() {
  return createClient(ragEnv.supabaseUrl(), ragEnv.supabaseServiceKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
