
'use client';

import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { useState, useEffect } from "react";
import { FirebaseClientProvider, getFirebase } from "@/firebase";

const SCHOOL_NAME_KEY = 'schoolName';
const DEFAULT_TITLE = 'GèreEcole';

export function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const firebase = getFirebase();
  
  useEffect(() => {
    const updateTitle = () => {
      const savedName = localStorage.getItem(SCHOOL_NAME_KEY);
      const newTitle = savedName ? `${savedName} - Gestion Scolaire` : `${DEFAULT_TITLE} - Solution de gestion scolaire tout-en-un`;
      document.title = newTitle;
    };
    
    updateTitle(); // Set on initial load
    
    window.addEventListener('settings-updated', updateTitle);
    
    return () => {
      window.removeEventListener('settings-updated', updateTitle);
    };

  }, []);

  if (!firebase) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <p>Chargement...</p>
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
