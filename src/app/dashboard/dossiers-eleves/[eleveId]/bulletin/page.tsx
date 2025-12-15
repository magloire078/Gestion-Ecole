
'use client';

import { notFound, useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, collection, query, where } from 'firebase/firestore';
import { ReportCard } from '@/components/report-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { staff as Staff, student as Student, gradeEntry as GradeEntry } from '@/lib/data-types';

interface StudentWithClass extends Student {
    classId?: string;
}

export default function StudentReportPage() {
  const params = useParams();
  const eleveId = params.eleveId as string;
  const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();

  if (schoolLoading) {
    return <StudentReportPageSkeleton />;
  }
  
  if (!schoolId || !schoolData) {
      return <div>École non trouvée.</div>;
  }

  return <StudentReportContent eleveId={eleveId} schoolId={schoolId} schoolData={schoolData} />
}

interface StudentReportContentProps {
    eleveId: string;
    schoolId: string;
    schoolData: any;
}

function StudentReportContent({ eleveId, schoolId, schoolData }: StudentReportContentProps) {
  const firestore = useFirestore();
  
  const studentRef = useMemoFirebase(() => 
    doc(firestore, `ecoles/${schoolId}/eleves/${eleveId}`)
  , [firestore, schoolId, eleveId]);
  const { data: studentData, loading: studentLoading } = useDoc<StudentWithClass>(studentRef);

  const gradesQuery = useMemoFirebase(() =>
    query(collection(firestore, `ecoles/${schoolId}/eleves/${eleveId}/notes`))
  , [firestore, schoolId, eleveId]);
  
  const teachersQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/personnel`), where('role', '==', 'enseignant')), [firestore, schoolId]);

  const { data: gradesData, loading: gradesLoading } = useCollection(gradesQuery);
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);

  const student = useMemo(() => studentData ? { ...studentData, id: eleveId } as StudentWithClass : null, [studentData, eleveId]);
  const grades = useMemo(() => gradesData?.map(d => ({ id: d.id, ...d.data() } as GradeEntry)) || [], [gradesData]);
  const teachers = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Staff & { id: string })) || [], [teachersData]);

  const isLoading = studentLoading || gradesLoading || teachersLoading;
  
  if (isLoading) {
    return <StudentReportPageSkeleton />;
  }

  if (!student) {
    notFound();
  }

  const schoolInfo = {
      name: schoolData?.name || 'Votre École',
      directorName: (schoolData?.directorFirstName || '') + ' ' + (schoolData?.directorLastName || ''),
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


function StudentReportPageSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-[70vh] w-full max-w-4xl mx-auto" />
        </div>
    );
}