'use client';

import dynamic from 'next/dynamic';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';

const OnboardingPageClient = dynamic(
  () => import('./onboarding-page-client'),
  {
    ssr: false,
    loading: () => <LoadingScreen />,
  }
);

export default function OnboardingPage() {
    const { hasSchool, loading } = useUser();
    const router = useRouter();

    if (!loading && hasSchool) {
        router.replace('/dashboard');
        return <LoadingScreen />;
    }
    
    if(loading) {
        return <LoadingScreen />;
    }

  return <OnboardingPageClient />;
}
