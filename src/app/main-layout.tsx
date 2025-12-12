
'use client';

import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { ReactNode } from "react";
import { FirebaseClientProvider } from "@/firebase";

export function MainLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
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
