import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://woxppudwpiacjfaphvmj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndveHBwdWR3cGlhY2pmYXBodm1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTg4NTU0NSwiZXhwIjoyMDgxNDYxNTQ1fQ.FeTeraubWWAGLVMbpZFMVNc8HwhPHV_o3I22a_9TqhY";
export const supabase = createClient(supabaseUrl, supabaseKey);