'use client';

import dynamic from 'next/dynamic';
import { LoadingScreen } from '@/components/ui/loading-screen';

const OnboardingPageClient = dynamic(
  () => import('./onboarding-page-client'),
  {
    ssr: false,
    loading: () => <LoadingScreen />,
  }
);

export default function OnboardingPage() {
  return <OnboardingPageClient />;
}
