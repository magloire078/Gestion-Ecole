
'use client';

import { notFound, useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { staff as Teacher } from '@/lib/data-types';
import { TeacherInfoSheet } from '@/components/teacher-info-sheet';

export default function TeacherSheetPage() {
  const params = useParams();
  const teacherId = params.enseignantId as string;
  const firestore = useFirestore();
  const { schoolData, schoolId, loading: schoolLoading } = useSchoolData();

  const teacherRef = useMemoFirebase(() => 
    (schoolId && teacherId) ? doc(firestore, `ecoles/${schoolId}/personnel/${teacherId}`) : null
  , [firestore, schoolId, teacherId]);

  const { data: teacherData, loading: teacherLoading } = useDoc<Teacher>(teacherRef);

  const isLoading = schoolLoading || teacherLoading;

  if (isLoading) {
    return (
        <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-[70vh] w-full max-w-4xl mx-auto" />
        </div>
    );
  }

  if (!teacherData || teacherData.schoolId !== schoolId) {
    notFound();
  }
  
  const teacherWithId = { ...teacherData, id: teacherId };

  const schoolInfo = {
      name: schoolData?.name || 'Votre École',
      address: schoolData?.address,
      phone: schoolData?.phone,
      website: schoolData?.website,
      mainLogoUrl: schoolData?.mainLogoUrl,
      directorFirstName: schoolData?.directorFirstName,
      directorLastName: schoolData?.directorLastName,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Fiche de renseignements de {teacherData.firstName} {teacherData.lastName}</h1>
        <p className="text-muted-foreground">Cliquez sur le bouton ci-dessous pour imprimer la fiche.</p>
      </div>
      <TeacherInfoSheet 
        teacher={teacherWithId as Teacher & { id: string }}
        school={schoolInfo}
      />
    </div>
  );
}
