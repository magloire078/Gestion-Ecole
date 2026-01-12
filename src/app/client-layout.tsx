'use client';

import { ReactNode } from "react";
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/auth-context";
import { Suspense } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";


export function ClientLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
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
