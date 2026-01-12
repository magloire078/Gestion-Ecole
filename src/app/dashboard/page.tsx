
'use client';

import dynamic from 'next/dynamic';
import { LoadingScreen } from '@/components/ui/loading-screen';

const DashboardPageContent = dynamic(
  () => import('@/components/dashboard-content'),
  {
    ssr: false,
    loading: () => <LoadingScreen />,
  }
);

export default function DashboardPage() {
  return <DashboardPageContent />;
}
