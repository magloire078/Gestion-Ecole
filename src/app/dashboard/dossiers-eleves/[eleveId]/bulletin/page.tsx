'use client';

import { notFound, useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, collection, query } from 'firebase/firestore';
import { ReportCard } from '@/components/report-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { teacher as Teacher, student as Student } from '@/lib/data-types';

interface Grade {
  id: string;
  subject: string;
  grade: number;
  coefficient: number;
}

interface StudentWithClass extends Student {
    classId?: string;
}

export default function StudentReportPage() {
  const params = useParams();
  const studentId = params.eleveId as string;
  const firestore = useFirestore();
  const { schoolData, loading: schoolLoading, schoolId } = useSchoolData();

  // --- Data Fetching ---
  const studentRef = useMemoFirebase(() => 
    (schoolId && studentId) ? doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`) : null
  , [firestore, schoolId, studentId]);

  const gradesQuery = useMemoFirebase(() =>
    (schoolId && studentId) ? query(collection(firestore, `ecoles/${schoolId}/eleves/${studentId}/notes`)) : null
  , [firestore, schoolId, studentId]);
  
  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/enseignants`) : null, [firestore, schoolId]);


  const { data: studentData, loading: studentLoading } = useDoc<StudentWithClass>(studentRef);
  const { data: gradesData, loading: gradesLoading } = useCollection<Grade>(gradesQuery);
  const { data: teachersData, loading: teachersLoading } = useCollection<Teacher & { id: string }>(teachersQuery);

  const student = studentData;
  const grades = useMemo(() => gradesData?.map(d => ({ id: d.id, ...d.data() })) || [], [gradesData]);
  const teachers = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() })) || [], [teachersData]);

  const isLoading = schoolLoading || studentLoading || gradesLoading || teachersLoading;
  
  if (isLoading) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-[70vh] w-full" />
        </div>
    );
  }

  if (!student) {
    notFound();
  }

  const schoolInfo = {
      name: schoolData?.name || 'Votre École',
      directorName: schoolData?.directorFirstName + ' ' + schoolData?.directorLastName,
      address: schoolData?.address,
      phone: schoolData?.phone,
      website: schoolData?.website,
      mainLogoUrl: schoolData?.mainLogoUrl,
  };

  const reportStudent = {
      ...student,
      name: `${student.firstName} ${student.lastName}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Bulletin de {reportStudent.name}</h1>
        <p className="text-muted-foreground">Aperçu des résultats scolaires de l'élève pour le trimestre en cours.</p>
      </div>
      <ReportCard 
        student={reportStudent}
        school={schoolInfo}
        grades={grades}
        teachers={teachers}
      />
    </div>
  );
}
