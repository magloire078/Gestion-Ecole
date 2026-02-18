
'use client';

import { Suspense, useMemo } from 'react';
import { notFound, useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, User, BookUser, Wallet, Shield, CalendarDays } from 'lucide-react';
import React from 'react';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, collection, query, orderBy, type DocumentReference, type DocumentData } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { student as Student, payment as Payment } from '@/lib/data-types';
import { GradesTab } from '@/components/students/grades-tab';
import { InfoTab } from '@/components/students/info-tab';
import { AbsencesTab } from '@/components/students/absences-tab';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ParentDisciplineTab } from '@/components/parent/parent-discipline-tab';
import { ParentTimetableTab } from '@/components/parent/parent-timetable-tab';
import { ParentPaymentsTab } from '@/components/parent/parent-payments-tab';

function ParentStudentProfileSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-32" />
            <div className="flex items-center gap-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
}

function ParentStudentProfileContent({ studentId, schoolId, initialTab }: { studentId: string, schoolId: string, initialTab: string }) {
    const router = useRouter();
    const firestore = useFirestore();

    const studentRef = useMemo(() => doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`) as DocumentReference<Student>, [firestore, schoolId, studentId]);
    const { data: studentData, loading: studentLoading } = useDoc<Student>(studentRef);
    const student = useMemo(() => studentData ? { ...studentData, id: studentId } as Student & { id: string } : null, [studentData, studentId]);

    if (studentLoading) {
        return <ParentStudentProfileSkeleton />;
    }

    if (!student) {
        notFound();
    }

    const studentFullName = student ? `${student.firstName} ${student.lastName}` : '';
    const fallback = studentFullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <div className="space-y-6">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
            </Button>
            <div className="flex items-center gap-4">
                <Avatar className="h-24 w-24 border">
                    <AvatarImage src={student.photoURL || undefined} alt={studentFullName} />
                    <AvatarFallback className="text-3xl">{fallback}</AvatarFallback>
                </Avatar>
                <div>
                    <h1 className="text-3xl font-bold">{studentFullName}</h1>
                    <p className="text-lg text-muted-foreground flex items-center gap-2">
                        <BookUser className="h-5 w-5" />
                        <span>Classe: <strong>{student.class}</strong></span>
                    </p>
                </div>
            </div>

            <Tabs defaultValue={initialTab} className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="grades">Résultats</TabsTrigger>
                    <TabsTrigger value="absences">Absences</TabsTrigger>
                    <TabsTrigger value="discipline">Discipline</TabsTrigger>
                    <TabsTrigger value="timetable">Emploi du temps</TabsTrigger>
                    <TabsTrigger value="payments">Paiements</TabsTrigger>
                    <TabsTrigger value="info">Informations</TabsTrigger>
                </TabsList>
                <TabsContent value="grades" className="mt-6">
                    <GradesTab schoolId={schoolId} studentId={studentId} />
                </TabsContent>
                <TabsContent value="absences" className="mt-6">
                    <AbsencesTab schoolId={schoolId} studentId={studentId} />
                </TabsContent>
                <TabsContent value="discipline" className="mt-6">
                    <ParentDisciplineTab schoolId={schoolId} studentId={studentId} />
                </TabsContent>
                <TabsContent value="timetable" className="mt-6">
                    <ParentTimetableTab schoolId={schoolId} student={student} />
                </TabsContent>
                <TabsContent value="payments" className="mt-6">
                    <ParentPaymentsTab student={student} />
                </TabsContent>
                <TabsContent value="info" className="mt-6">
                    <InfoTab student={student} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function PageContent() {
    const params = useParams();
    const studentId = params.studentId as string;
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') || 'grades';

    if (schoolLoading) {
        return <ParentStudentProfileSkeleton />;
    }

    if (!schoolId) {
        return <p>Erreur: Aucune école n&apos;est associée à votre compte.</p>;
    }

    if (!studentId) {
        return <p>Erreur: ID de l&apos;élève manquant.</p>;
    }

    return <ParentStudentProfileContent studentId={studentId} schoolId={schoolId} initialTab={initialTab} />;
}

export default function ParentStudentPage() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <PageContent />
        </Suspense>
    );
}
