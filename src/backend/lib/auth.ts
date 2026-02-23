import { createClient } from '@/backend/lib/supabase/server';

export async function getAuthUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }
  return data.user;
}
