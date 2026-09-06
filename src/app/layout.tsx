
import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { UserProvider } from '@/providers/user-provider';
import { SchoolProvider } from '@/providers/school-provider';
import { ServiceWorkerRegister } from '@/components/service-worker-register';
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
  themeColor: '#0C365A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'GèreEcole - Gestion scolaire simplifiée',
  description: 'La solution complète pour gérer les élèves, les notes, les paiements et la communication scolaire.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GèreEcole',
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
              <ServiceWorkerRegister />
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
