'use client';
// Ce layout est maintenant un simple "pass-through".
// La logique d'authentification et de mise en page est gérée dans `page.tsx`
// pour assurer un rendu entièrement côté client et éviter les erreurs d'hydratation.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
