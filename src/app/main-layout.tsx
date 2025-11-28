
'use client';

import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { ReactNode } from "react";
import { FirebaseClientProvider, getFirebase } from "@/firebase";
import { FirebaseContextValue } from "@/firebase/provider";

export function MainLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  
  const firebaseContext = getFirebase();

  if (!firebaseContext) {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="text-center">
                <p className="text-lg font-semibold">Chargement...</p>
            </div>
        </div>
    );
  }

  return (
    <FirebaseClientProvider value={firebaseContext}>
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
