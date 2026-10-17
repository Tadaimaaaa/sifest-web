import 'server-only';
import { createClient } from '@supabase/supabase-js';

const defaultAnonKey = 'sb_publishable_oqTxtR39oWOy8sgYSAgWdA_b4NPQ0Rb';
const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isKnownBadKey = rawServiceKey?.startsWith('sb_secret_3k_');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ihpgoxdgdhxnnpppasab.supabase.co';
const supabaseKey = (!rawServiceKey || isKnownBadKey)
  ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultAnonKey)
  : rawServiceKey;

// Create a single supabase client for interacting with your database
export const supabaseServer = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  }
});

