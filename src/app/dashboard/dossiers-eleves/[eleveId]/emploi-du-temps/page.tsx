
'use client';

import { notFound, useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, collection, query, where } from 'firebase/firestore';
import { PrintableTimetable } from '@/components/printable-timetable';
import { Skeleton } from '@/components/ui/skeleton';
import type { staff as Staff, student as Student } from '@/lib/data-types';

interface TimetableEntry {
  id: string;
  classId: string;
  teacherId: string;
  subject: string;
  day: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi';
  startTime: string;
  endTime: string;
}

export default function StudentTimetablePage() {
  const params = useParams();
  const eleveId = params.eleveId as string;
  const { schoolId, schoolName, loading: schoolLoading } = useSchoolData();

  if (schoolLoading) {
    return <StudentTimetablePageSkeleton />;
  }

  if (!schoolId) {
      return <div>École non trouvée.</div>;
  }
  
  return <StudentTimetableContent eleveId={eleveId} schoolId={schoolId} schoolName={schoolName} />;
}

interface StudentTimetableContentProps {
    eleveId: string;
    schoolId: string;
    schoolName: string | undefined;
}

function StudentTimetableContent({ eleveId, schoolId, schoolName }: StudentTimetableContentProps) {
  const firestore = useFirestore();

  const studentRef = useMemoFirebase(() => 
    doc(firestore, `ecoles/${schoolId}/eleves/${eleveId}`)
  , [firestore, schoolId, eleveId]);

  const { data: studentData, loading: studentLoading } = useDoc<Student>(studentRef);
  const student = studentData;
  const classId = student?.classId;

  const timetableQuery = useMemoFirebase(() =>
    (classId) ? query(collection(firestore, `ecoles/${schoolId}/emploi_du_temps`), where('classId', '==', classId)) : null
  , [firestore, schoolId, classId]);

  const teachersQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/personnel`), where('role', '==', 'Enseignant')), [firestore, schoolId]);

  const { data: timetableData, loading: timetableLoading } = useCollection<TimetableEntry>(timetableQuery);
  const { data: teachersData, loading: teachersLoading } = useCollection<Staff & { id: string }>(teachersQuery);

  const timetableEntries = useMemo(() => timetableData?.map(d => ({ id: d.id, ...d.data() })) || [], [timetableData]);
  const teachers = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() })) || [], [teachersData]);

  const isLoading = studentLoading || timetableLoading || teachersLoading;

  if (isLoading) {
    return <StudentTimetablePageSkeleton />;
  }

  if (!student) {
    notFound();
  }

  const schoolInfo = {
      name: schoolName || 'Votre École',
  };
  
  const timetableStudent = {
      ...student,
      name: `${student.firstName} ${student.lastName}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Emploi du Temps de {timetableStudent.name}</h1>
        <p className="text-muted-foreground">Classe: {student.class}. Cliquez sur le bouton ci-dessous pour imprimer.</p>
      </div>
      <PrintableTimetable 
        student={timetableStudent}
        school={schoolInfo}
        timetableEntries={timetableEntries}
        teachers={teachers}
      />
    </div>
  );
}

function StudentTimetablePageSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-[70vh] w-full" />
        </div>
    );
}