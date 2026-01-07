'use client';

import { ReactNode } from "react";
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from "@/firebase";
import { Toaster } from "@/components/ui/toaster";


export function MainLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
    >
      <FirebaseClientProvider>
        {children}
        <Toaster />
      </FirebaseClientProvider>
    </ThemeProvider>
  );
}
