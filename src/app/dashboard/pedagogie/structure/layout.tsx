
'use client';

// Ce layout n'est plus nécessaire car la navigation par onglets a été supprimée.
// On garde un layout simple pour encapsuler les enfants.

export default function StructureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
