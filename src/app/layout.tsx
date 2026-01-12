import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClientLayoutWrapper } from './client-layout-wrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GèreEcole - Gestion scolaire simplifiée',
  description: 'La solution complète pour gérer les élèves, les notes, les paiements et la communication scolaire.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <ClientLayoutWrapper>
          {children}
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}
