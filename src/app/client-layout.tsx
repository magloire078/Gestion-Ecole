'use client';

import { ReactNode, Suspense } from "react";
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { Toaster } from "@/components/ui/toaster";
import { LoadingScreen } from "@/components/ui/loading-screen";


export function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
      >
        <FirebaseClientProvider>
          <Suspense fallback={<LoadingScreen />}>
            {children}
          </Suspense>
          <Toaster />
        </FirebaseClientProvider>
      </ThemeProvider>
  );
}
    