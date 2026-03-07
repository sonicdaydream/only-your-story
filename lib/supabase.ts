import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SharedStory {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  last_read_at: string | null;
  read_count: number;
}
