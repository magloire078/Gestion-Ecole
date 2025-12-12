
'use client';

import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { ReactNode, useState, useEffect } from "react";
import { FirebaseClientProvider } from "@/firebase";

export function MainLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <>
      {isClient ? (
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
      ) : null}
    </>
  );
}
