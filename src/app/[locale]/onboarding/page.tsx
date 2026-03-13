import { OnboardingWizard } from '@/frontend/components/onboarding/onboarding-wizard';
import { getAuthUser } from '@/backend/lib/auth';
import { redirect } from 'next/navigation';

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getAuthUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="bg-background text-foreground">
      <OnboardingWizard />
    </div>
  );
}
