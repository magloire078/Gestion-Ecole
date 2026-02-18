'use client';

import { AuthGuard } from "@/components/auth-guard";
import DashboardLayoutContent from "@/components/dashboard/dashboard-layout-content";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { Suspense } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <Suspense fallback={<LoadingScreen />}>
        <DashboardLayoutContent>
          {children}
        </DashboardLayoutContent>
      </Suspense>
    </AuthGuard>
  );
}
