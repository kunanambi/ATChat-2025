
import { createClient } from '@supabase/supabase-js';

// Supabase project credentials provided by the user
const supabaseUrl = 'https://ojcmijnxciomeeipiidt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qY21pam54Y2lvbWVlaXBpaWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MjkxNjEsImV4cCI6MjA4MjMwNTE2MX0.p2eWHkFXOLwZrLzhCI8sGU7t1wFdk3anX_oZ7J3-9sc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
