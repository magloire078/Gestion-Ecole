'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FileSignature, FileText } from 'lucide-react';

export default function StudentDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { eleveId: string };
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-semibold md:text-2xl">Fiche d'Information de l'Élève</h1>
          <p className="text-muted-foreground">Vue détaillée du profil, des notes et des informations de l'élève.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/eleves/${params.eleveId}/fiche`)}>
            <FileSignature className="mr-2 h-4 w-4" />
            Fiche de renseignements
          </Button>
          <Button onClick={() => router.push(`/dashboard/eleves/${params.eleveId}/bulletin`)}>
            <FileText className="mr-2 h-4 w-4" />
            Voir le bulletin
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}
