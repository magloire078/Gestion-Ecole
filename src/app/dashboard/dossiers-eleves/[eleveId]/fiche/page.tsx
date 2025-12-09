
'use client';

import { notFound, useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentInfoSheet } from '@/components/student-info-sheet';
import type { student as Student } from '@/lib/data-types';

export default function StudentSheetPage() {
  const params = useParams();
  const studentId = params.eleveId as string;
  const firestore = useFirestore();
  const { schoolData, schoolId, loading: schoolLoading } = useSchoolData();

  const studentRef = useMemoFirebase(() => 
    (schoolId && studentId) ? doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`) : null
  , [firestore, schoolId, studentId]);

  const { data: studentData, loading: studentLoading } = useDoc<Student>(studentRef);

  const isLoading = schoolLoading || studentLoading;

  if (isLoading) {
    return (
        <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-[70vh] w-full max-w-4xl mx-auto" />
        </div>
    );
  }

  if (!studentData) {
    notFound();
  }

  const schoolInfo = {
      name: schoolData?.name || 'Votre École',
      address: schoolData?.address,
      phone: schoolData?.phone,
      website: schoolData?.website,
      mainLogoUrl: schoolData?.mainLogoUrl,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Fiche de renseignements de {studentData.firstName} {studentData.lastName}</h1>
        <p className="text-muted-foreground">Cliquez sur le bouton ci-dessous pour imprimer la fiche.</p>
      </div>
      <StudentInfoSheet 
        student={studentData as Student}
        school={schoolInfo}
      />
    </div>
  );
}

