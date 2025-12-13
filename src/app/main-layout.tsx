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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null; 
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
