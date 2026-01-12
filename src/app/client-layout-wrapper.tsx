'use client';

import { Suspense } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <FirebaseClientProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </FirebaseClientProvider>
      </ThemeProvider>
    </Suspense>
  );
}
