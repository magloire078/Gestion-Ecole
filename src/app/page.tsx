import { Suspense } from 'react';
import HomePageContent from './home-page-content';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <HomePageContent />
    </Suspense>
  );
}
