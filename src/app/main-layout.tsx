'use client';

import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { ReactNode } from "react";
import { FirebaseClientProvider } from "@/firebase";
import { useHydrationFix } from "@/hooks/use-hydration-fix";

export function MainLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  
  const isMounted = useHydrationFix();

  if (!isMounted) {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="text-center">
                <p className="text-lg font-semibold">Chargement...</p>
            </div>
        </div>
    );
  }

  return (
    <FirebaseClientProvider>
      <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
      >
          {children}
          <Toaster />
      </ThemeProvider>
    </FirebaseClientProvider>
  );
}
