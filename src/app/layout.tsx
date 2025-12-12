import type { Metadata, Viewport } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { MainLayout } from './main-layout';

const ptSans = PT_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '700'],
  variable: '--font-sans',
  display: 'swap', // Amélioration du chargement de la police
});

export const metadata: Metadata = {
  title: {
    default: 'GèreEcole - Solution de gestion scolaire tout-en-un',
    template: '%s | GèreEcole',
  },
  description: 'GèreEcole est une solution complète et moderne pour la gestion administrative et pédagogique des établissements scolaires.',
  keywords: ['gestion scolaire', 'administration école', 'logiciel éducation', 'école numérique', 'gestion pédagogique'],
  authors: [{ name: 'GèreEcole' }],
  creator: 'GèreEcole',
  publisher: 'GèreEcole',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // metadataBase: new URL('https://www.gereschool.com'), // Remplacez par votre URL
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://www.gereschool.com',
    title: 'GèreEcole - Solution de gestion scolaire tout-en-un',
    description: 'Solution complète pour la gestion des écoles',
    siteName: 'GèreEcole',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GèreEcole - Tableau de bord de gestion scolaire',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GèreEcole - Solution de gestion scolaire tout-en-un',
    description: 'Solution complète pour la gestion des écoles',
    images: ['/twitter-image.png'],
    creator: '@gereschool',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      // { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      // { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    // apple: [
    //   { url: '/apple-touch-icon.png', sizes: '180x180' },
    // ],
    shortcut: ['/favicon.ico'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#3F51B5',
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="fr" 
      suppressHydrationWarning
      className="scroll-smooth"
    >
      <head />
      <body className={`
        ${ptSans.variable} 
        font-sans 
        antialiased
        transition-colors 
        duration-200
        min-h-screen
      `}>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
