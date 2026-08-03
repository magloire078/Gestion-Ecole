
import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { UserProvider } from '@/providers/user-provider';
import { SchoolProvider } from '@/providers/school-provider';
import { MobileBridge } from '@/components/mobile-bridge';
import { Toaster } from '@/components/ui/toaster';
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-outfit',
});

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://gerecole.com'),
  title: {
    default: 'GèreEcole — Gestion scolaire simplifiée pour l\'Afrique de l\'Ouest',
    template: '%s — GèreEcole',
  },
  description: 'Logiciel SaaS de gestion scolaire pour les écoles primaires et secondaires d\'Afrique de l\'Ouest. Élèves, notes, paiements (Mobile Money + cartes), bulletins PDF, portail parents. Essai gratuit.',
  keywords: ['gestion scolaire', 'logiciel école', 'SaaS éducation', 'Afrique de l\'Ouest', 'Côte d\'Ivoire', 'Sénégal', 'paiement mobile money écoles', 'bulletins notes', 'portail parents'],
  authors: [{ name: 'GèreEcole' }],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: '/',
    siteName: 'GèreEcole',
    title: 'GèreEcole — Gestion scolaire simplifiée pour l\'Afrique de l\'Ouest',
    description: 'Élèves, notes, paiements Mobile Money, bulletins PDF, portail parents — tout-en-un. Essai gratuit.',
    images: [
      { url: '/og-image.png', width: 1200, height: 630, alt: 'GèreEcole — SaaS de gestion scolaire' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GèreEcole — Gestion scolaire simplifiée',
    description: 'Solution tout-en-un pour les écoles d\'Afrique de l\'Ouest. Essai gratuit.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [
      { url: '/favicon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  // Root Layout Component
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans`}>
        <FirebaseClientProvider>
          <UserProvider>
            <SchoolProvider>
              <MobileBridge />
              {children}
              <Toaster />
              <Analytics />
              <SpeedInsights />
            </SchoolProvider>
          </UserProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
