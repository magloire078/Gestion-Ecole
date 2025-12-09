'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FileSignature, FileText, CalendarDays } from 'lucide-react';

export default function StudentDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { studentId: string };
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          {/* Le titre sera dans la page elle-même pour attendre les données de l'élève */}
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => router.push(`/dashboard/students/${params.studentId}/sheet`)}>
            <FileSignature className="mr-2 h-4 w-4" />
            Fiche de renseignements
          </Button>
           <Button variant="outline" onClick={() => router.push(`/dashboard/students/${params.studentId}/timetable`)}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Emploi du temps
          </Button>
          <Button onClick={() => router.push(`/dashboard/students/${params.studentId}/report`)}>
            <FileText className="mr-2 h-4 w-4" />
            Bulletin de notes
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}
