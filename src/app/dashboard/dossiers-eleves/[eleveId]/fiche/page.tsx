
'use client';

import { notFound, useParams } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, type DocumentReference, type DocumentData } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentInfoSheet } from '@/components/student-info-sheet';
import type { student as Student } from '@/lib/data-types';
import { useMemo } from 'react';

export default function StudentSheetPage() {
  const params = useParams();
  const eleveId = params.eleveId as string;
  const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();

  if (schoolLoading) {
    return <StudentSheetPageSkeleton />;
  }

  if (!schoolId) {
    return <div>École non trouvée.</div>;
  }

  if (!schoolData) {
    return <div>Données de l&apos;école non chargées.</div>
  }

  return <StudentSheetContent eleveId={eleveId} schoolId={schoolId} schoolData={schoolData} />;
}

interface StudentSheetContentProps {
  eleveId: string;
  schoolId: string;
  schoolData: any;
}

function StudentSheetContent({ eleveId, schoolId, schoolData }: StudentSheetContentProps) {
  const firestore = useFirestore();
  const studentRef = useMemo(() =>
    doc(firestore, `ecoles/${schoolId}/eleves/${eleveId}`) as DocumentReference<Student, DocumentData>
    , [firestore, schoolId, eleveId]);

  const { data: studentData, loading: studentLoading } = useDoc<Student>(studentRef);

  if (studentLoading) {
    return <StudentSheetPageSkeleton />;
  }

  if (!studentData) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Fiche de renseignements de {studentData.firstName} {studentData.lastName}</h1>
        <p className="text-muted-foreground">Cliquez sur le bouton ci-dessous pour imprimer la fiche.</p>
      </div>
      <StudentInfoSheet
        student={studentData as Student}
        school={schoolData}
      />
    </div>
  );
}

function StudentSheetPageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-[70vh] w-full max-w-4xl mx-auto" />
    </div>
  );
}
