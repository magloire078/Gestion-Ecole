'use client';

import { AuthGuard } from "@/components/auth-guard";

import { Suspense } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <Suspense fallback={<LoadingScreen />}>
        {children}
      </Suspense>
    </AuthGuard>
  );
}
