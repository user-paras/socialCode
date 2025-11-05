import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string;
  latitude: number;
  longitude: number;
  status: 'unresolved' | 'resolved';
  user_id: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  role: 'user' | 'admin';
  created_at: string;
}
