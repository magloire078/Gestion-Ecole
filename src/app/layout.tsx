
import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { MainLayout } from './main-layout';
import Link from 'next/link';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
});

export const metadata: Metadata = {
  title: 'GèreEcole - Solution de gestion scolaire tout-en-un',
  description: 'GèreEcole est une solution complète pour la gestion des écoles.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={`${ptSans.variable} font-body antialiased`}>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
