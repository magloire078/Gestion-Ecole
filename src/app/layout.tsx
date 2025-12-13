
import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { MainLayout } from './main-layout';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-sans',
});

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
      <body className={`${ptSans.variable} font-sans antialiased`}>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}

    