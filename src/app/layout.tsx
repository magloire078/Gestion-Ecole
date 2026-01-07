
import type { Metadata } from 'next';
import './globals.css';
import { MainLayout } from './main-layout';

export const metadata: Metadata = {
  title: 'GèreEcole',
  description: 'Solution de gestion scolaire',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
