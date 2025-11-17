
'use client';

import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { useState, useEffect, ReactNode } from "react";
import { FirebaseClientProvider, getFirebase } from "@/firebase";
import { FirebaseContextValue } from "@/firebase/provider";

export function MainLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [firebase, setFirebase] = useState<FirebaseContextValue | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after the initial render.
    setIsClient(true);
    setFirebase(getFirebase());
  }, []);
  
  if (!isClient || !firebase) {
    // During server-side rendering and initial client-side render before useEffect runs,
    // show a consistent loading state to prevent hydration mismatches.
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="text-center">
                <p className="text-lg font-semibold">Chargement...</p>
            </div>
        </div>
    );
  }

  return (
    <FirebaseClientProvider value={{ firebaseApp: firebase.app, auth: firebase.auth, firestore: firebase.firestore }}>
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
