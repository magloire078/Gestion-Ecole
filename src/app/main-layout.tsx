
'use client';

import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { useState, useEffect } from "react";
import { FirebaseClientProvider, getFirebase } from "@/firebase";

const SCHOOL_NAME_KEY = 'schoolName';
const DEFAULT_TITLE = 'GèreEcole - Solution de gestion scolaire tout-en-un';

export function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [firebase, setFirebase] = useState<ReturnType<typeof getFirebase>>(null);

  useEffect(() => {
    // Initialize Firebase on the client
    setFirebase(getFirebase());
    
    // Title update logic
    const updateTitle = () => {
      const savedName = localStorage.getItem(SCHOOL_NAME_KEY);
      document.title = savedName ? `${savedName} - Gestion Scolaire` : DEFAULT_TITLE;
    };
    
    updateTitle();
    window.addEventListener('settings-updated', updateTitle);
    
    return () => {
      window.removeEventListener('settings-updated', updateTitle);
    };

  }, []);

  if (!firebase) {
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
