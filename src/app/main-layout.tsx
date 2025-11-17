
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
  const firebase = getFirebase();
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const updateTitle = () => {
      const savedName = localStorage.getItem(SCHOOL_NAME_KEY);
      const newTitle = savedName ? `${savedName} - Gestion Scolaire` : DEFAULT_TITLE;
      document.title = newTitle;
    };
    
    updateTitle(); // Set on initial client load
    
    window.addEventListener('settings-updated', updateTitle);
    
    return () => {
      window.removeEventListener('settings-updated', updateTitle);
    };

  }, [isClient]);

  if (!firebase || !isClient) {
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
