import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

// ponytail: placeholder host lets the app boot before a live Supabase project exists; swap in real env values once one is created.
export const supabase = createClient(
  environment.supabaseUrl || 'https://placeholder.supabase.co',
  environment.supabaseAnonKey || 'placeholder-anon-key',
);
