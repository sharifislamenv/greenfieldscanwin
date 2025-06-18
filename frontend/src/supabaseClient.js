//D:\MyProjects\greenfield-scanwin\frontend\src\supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_KEY || 'your-anon-key';

// Create and export Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Optional: Add realtime functionality
export const setupRealtime = (table, event, callback) => {
  return supabase
    .channel('custom-channel')
    .on('postgres_changes', { event, schema: 'public', table }, callback)
    .subscribe();
};