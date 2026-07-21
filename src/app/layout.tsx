
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
import { GoogleAnalytics } from '@/components/google-analytics';

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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gereecole.com';
const APP_NAME = 'GèreEcole';
const DESCRIPTION =
    'La solution complète pour gérer les élèves, les notes, les paiements et la communication scolaire. Essai gratuit 30 jours.';

export const metadata: Metadata = {
    metadataBase: new URL(APP_URL),
    title: {
        default: `${APP_NAME} - Gestion scolaire simplifiée`,
        template: `%s | ${APP_NAME}`,
    },
    description: DESCRIPTION,
    keywords: [
        'gestion scolaire', 'logiciel école', 'administration scolaire', 'gestion établissement',
        'notes élèves', 'bulletins scolaires', 'frais scolarité', 'Afrique', 'Côte d\'Ivoire',
        'Sénégal', 'Cameroun', 'SaaS école', 'ERP scolaire',
    ],
    authors: [{ name: APP_NAME }],
    creator: APP_NAME,
    publisher: APP_NAME,
    robots: {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
    openGraph: {
        type: 'website',
        locale: 'fr_FR',
        url: APP_URL,
        siteName: APP_NAME,
        title: `${APP_NAME} - Gestion scolaire simplifiée`,
        description: DESCRIPTION,
        images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `${APP_NAME} - Plateforme de gestion scolaire` }],
    },
    twitter: {
        card: 'summary_large_image',
        title: `${APP_NAME} - Gestion scolaire simplifiée`,
        description: DESCRIPTION,
        images: ['/og-image.png'],
    },
    icons: {
        icon: [
            { url: '/favicon.ico', sizes: 'any' },
            { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
        ],
        apple: [{ url: '/favicon.png', sizes: '180x180', type: 'image/png' }],
    },
    manifest: '/site.webmanifest',
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
              <GoogleAnalytics />
            </SchoolProvider>
          </UserProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
