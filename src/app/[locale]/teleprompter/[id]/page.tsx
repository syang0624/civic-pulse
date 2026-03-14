import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/backend/lib/supabase/server';
import { getAuthUser } from '@/backend/lib/auth';
import { TeleprompterView } from '@/frontend/components/teleprompter/teleprompter-view';

interface PageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export default async function TeleprompterPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await getAuthUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const supabase = await createClient();
  const { data: generation, error } = await supabase
    .from('generations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !generation) {
    notFound();
  }

  if (generation.profile_id !== user.id) {
    notFound();
  }

  const content = generation.edited_text?.trim() || generation.output_text || '';
  
  const inputParams = generation.input_params as Record<string, unknown>;
  const topic = typeof inputParams?.topic === 'string' ? inputParams.topic : null;
  const inputTitle = typeof inputParams?.title === 'string' ? inputParams.title : null;
  const title = topic || inputTitle || 'Teleprompter';

  return (
    <TeleprompterView 
      content={content} 
      title={title} 
    />
  );
}
