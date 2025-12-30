
'use client';

import { notFound, useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { staff as Teacher, school as SchoolInfoType } from '@/lib/data-types';
import { TeacherInfoSheet } from '@/components/teacher-info-sheet';

function TeacherSheetPageSkeleton() {
    return (
        <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-[70vh] w-full max-w-4xl mx-auto" />
        </div>
    );
}

export default function StaffSheetPage() {
  const params = useParams();
  const staffId = params.staffId as string;
  const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();

  const staffRef = useMemoFirebase(() =>
    (schoolId && staffId) ? doc(firestore, `ecoles/${schoolId}/personnel/${staffId}`) : null
  , [firestore, schoolId, staffId]);

  const { data: staffData, loading: staffLoading } = useDoc<Teacher>(staffRef);

  const isLoading = schoolLoading || staffLoading;

  if (isLoading) {
    return <TeacherSheetPageSkeleton />;
  }

  if (!staffData || !schoolData) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Fiche d'information de {staffData.firstName} {staffData.lastName}</h1>
        <p className="text-muted-foreground">Aperçu des informations administratives du membre du personnel.</p>
      </div>
      <TeacherInfoSheet 
        teacher={staffData as Teacher & { id: string }} 
        school={schoolData as SchoolInfoType}
      />
    </div>
  );
}
