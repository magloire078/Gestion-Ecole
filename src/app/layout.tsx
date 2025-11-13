
'use client';

import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import './globals.css';
import { useState, useEffect } from "react";
import { FirebaseClientProvider, getFirebase } from "@/firebase";

const SCHOOL_NAME_KEY = 'schoolName';
const DEFAULT_TITLE = 'GèreEcole';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.Node;
}>) {
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const firebase = getFirebase();
  
  useEffect(() => {
    const updateTitle = () => {
      const savedName = localStorage.getItem(SCHOOL_NAME_KEY);
      const newTitle = savedName ? `${savedName} - Gestion Scolaire` : `${DEFAULT_TITLE} - Solution de gestion scolaire tout-en-un`;
      setTitle(newTitle);
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
      <html lang="en" suppressHydrationWarning>
        <head>
          <title>{title}</title>
        </head>
        <body className="font-body antialiased">
          {/* You can show a loading spinner here */}
        </body>
      </html>
    )
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
         <title>{title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
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
      </body>
    </html>
  );
}
