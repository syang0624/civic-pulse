'use server';

import { createClient } from '@/backend/lib/supabase/server';
import { createAdminClient } from '@/backend/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

export type AuthState = {
  error: string | null;
  success?: boolean;
};

export async function login(
  prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();

  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || !email.trim()) {
    return { error: 'Email is required' };
  }
  if (typeof password !== 'string' || !password) {
    return { error: 'Password is required' };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const locale = await getLocale();
  redirect(`/${locale}/dashboard`);
}

export async function signup(
  prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();

  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || !email.trim()) {
    return { error: 'Email is required' };
  }
  if (typeof password !== 'string' || !password) {
    return { error: 'Password is required' };
  }

  // Block admin@ prefix emails from signup — admin accounts are pre-provisioned only
  if (email.trim().toLowerCase().startsWith('admin@')) {
    return { error: 'This email prefix is reserved and cannot be used for signup.' };
  }

  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    if (createError.message.includes('already been registered')) {
      return { error: 'Email already registered' };
    }
    return { error: createError.message };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: signInError.message };
  }

  const locale = await getLocale();
  redirect(`/${locale}/onboarding`);
}
