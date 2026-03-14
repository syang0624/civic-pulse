import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';

export async function getAdminUser(): Promise<{ id: string } | null> {
  const user = await getAuthUser();
  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const email = authUser?.email?.toLowerCase();
  if (!email || !adminEmails.includes(email)) {
    return null;
  }

  if (!profile?.id) {
    return null;
  }

  return { id: profile.id };
}
