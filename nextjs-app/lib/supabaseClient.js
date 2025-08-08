import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase Project URL and Publishable (anon) key
const supabaseUrl = 'https://xreiokflgmmpfehptddr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZWlva2ZsZ21tcGZlaHB0ZGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NzUzODcsImV4cCI6MjA3MDE1MTM4N30.QgSq7oFq9vPB_t6wLPP61e9p3vQNVwFS80k9We89uGY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
