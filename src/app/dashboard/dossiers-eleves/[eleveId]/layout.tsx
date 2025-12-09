

'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FileSignature, FileText, CalendarDays } from 'lucide-react';

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
          {/* This title is now contextual based on the page content below */}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/dossiers-eleves/${params.eleveId}/fiche`)}>
            <FileSignature className="mr-2 h-4 w-4" />
            Fiche de renseignements
          </Button>
          <Button variant="outline" onClick={() => router.push(`/dashboard/dossiers-eleves/${params.eleveId}/emploi-du-temps`)}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Emploi du Temps
          </Button>
          <Button onClick={() => router.push(`/dashboard/dossiers-eleves/${params.eleveId}/bulletin`)}>
            <FileText className="mr-2 h-4 w-4" />
            Voir le bulletin
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}



