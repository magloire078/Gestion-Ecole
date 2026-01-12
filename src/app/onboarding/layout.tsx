'use client';

import { FirebaseClientProvider } from "@/firebase";
import { AuthGuard } from "@/components/auth-guard";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseClientProvider>
        <AuthGuard>
            {children}
        </AuthGuard>
    </FirebaseClientProvider>
  );
}
