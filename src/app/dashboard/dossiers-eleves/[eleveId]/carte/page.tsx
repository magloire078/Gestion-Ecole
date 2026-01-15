
'use client';

import { notFound, useParams } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentIdCard } from '@/components/student-id-card';
import type { student as Student } from '@/lib/data-types';
import { useMemo } from 'react';

export default function StudentIdCardPage() {
  const params = useParams();
  const eleveId = params.eleveId as string;
  const { schoolData, loading: schoolLoading } = useSchoolData();

  if (schoolLoading) {
    return <StudentIdCardPageSkeleton />;
  }

  if (!schoolData) {
    return <div>Données de l'école non chargées.</div>
  }

  return <StudentCardContent eleveId={eleveId} schoolId={schoolData.id} schoolData={schoolData} />;
}

interface StudentCardContentProps {
    eleveId: string;
    schoolId: string;
    schoolData: any;
}

function StudentCardContent({ eleveId, schoolId, schoolData }: StudentCardContentProps) {
  const firestore = useFirestore();
  const studentRef = useMemo(() => 
    doc(firestore, `ecoles/${schoolId}/eleves/${eleveId}`)
  , [firestore, schoolId, eleveId]);

  const { data: studentData, loading: studentLoading } = useDoc<Student>(studentRef);

  if (studentLoading) {
    return <StudentIdCardPageSkeleton />;
  }

  if (!studentData) {
    notFound();
  }

  const studentWithId = { ...studentData, id: eleveId };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Carte d'étudiant de {studentData.firstName} {studentData.lastName}</h1>
        <p className="text-muted-foreground">Voici la carte numérique de l'élève. Elle peut être utilisée pour diverses interactions au sein de l'école.</p>
      </div>
      <StudentIdCard 
        student={studentWithId as Student}
        school={schoolData}
      />
    </div>
  );
}

function StudentIdCardPageSkeleton() {
    return (
        <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <div className="max-w-md mx-auto">
                <Skeleton className="h-96 w-full" />
            </div>
        </div>
    );
}
