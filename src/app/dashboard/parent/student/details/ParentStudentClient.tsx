'use client';

import React, { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams, notFound } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, User, BookUser, Wallet, Shield, CalendarDays, Star, UserX } from 'lucide-react';
import { useDoc, useFirestore } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, type DocumentReference, type DocumentData } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { student as Student } from '@/lib/data-types';
import { SafeImage } from '@/components/ui/safe-image';
import { GradesTab } from '@/components/students/grades-tab';
import { InfoTab } from '@/components/students/info-tab';
import { AbsencesTab } from '@/components/students/absences-tab';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ParentDisciplineTab } from '@/components/parent/parent-discipline-tab';
import { ParentTimetableTab } from '@/components/parent/parent-timetable-tab';
import { ParentPaymentsTab } from '@/components/parent/parent-payments-tab';
import { AnimatedHighlight } from '@/components/ui/animated-highlight';
import { Badge } from '@/components/ui/badge';

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

    const studentRef = useMemo(() => (schoolId && studentId) ? doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`) as DocumentReference<Student, DocumentData> : null, [firestore, schoolId, studentId]);
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
        <div className="space-y-8 pb-10">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-full hover:bg-slate-100">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour au portail
                </Button>
            </div>

            <div className="relative w-full overflow-hidden rounded-[2.5rem] shadow-2xl border border-white/20 bg-slate-900">
                <AnimatedHighlight className="h-2 opacity-50" />
                <div className="absolute inset-0 bg-gradient-to-br from-[#0C365A] via-blue-900/40 to-indigo-900/20 z-10" />
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px] z-0" />
                <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] z-0" />

                <div className="relative z-20 p-8 md:p-12 flex flex-col md:flex-row items-center md:items-end gap-8">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full scale-90 group-hover:scale-110 transition-transform duration-500" />
                        <Avatar className="h-40 w-40 md:h-48 md:w-48 border-4 border-white shadow-2xl rounded-[2rem] relative z-10">
                            <SafeImage src={student.photoUrl} alt={studentFullName} className="object-cover" />
                            <AvatarFallback className="text-5xl font-black bg-blue-100 text-blue-700">{fallback}</AvatarFallback>
                        </Avatar>
                        <Badge className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-blue-500 text-white border-blue-400 shadow-xl rounded-full font-bold">
                            {student.class}
                        </Badge>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-4">
                        <div className="space-y-1">
                            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-2xl">
                                {student.firstName} <span className="text-blue-200">{student.lastName}</span>
                            </h1>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                                <Badge variant="outline" className="bg-white/5 border-white/10 text-blue-100 backdrop-blur-md px-3 py-1">
                                    <BookUser className="h-4 w-4 mr-2" />
                                    Matricule: {student.matricule || 'N/A'}
                                </Badge>
                                <Badge variant="outline" className="bg-white/5 border-white/10 text-blue-100 backdrop-blur-md px-3 py-1">
                                    <Shield className="h-4 w-4 mr-2" />
                                    Statut: Actif
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Tabs defaultValue={initialTab} className="w-full">
                <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b -mx-6 px-6 py-2 mb-6">
                    <TabsList className="h-14 w-full justify-start gap-2 bg-transparent overflow-x-auto no-scrollbar">
                        <TabsTrigger value="grades" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 h-10 px-6 rounded-xl font-bold transition-all">
                            <Star className="h-4 w-4 mr-2" /> Résultats
                        </TabsTrigger>
                        <TabsTrigger value="absences" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 h-10 px-6 rounded-xl font-bold transition-all">
                            <UserX className="h-4 w-4 mr-2" /> Absences
                        </TabsTrigger>
                        <TabsTrigger value="discipline" className="data-[state=active]:bg-rose-50 data-[state=active]:text-rose-700 h-10 px-6 rounded-xl font-bold transition-all">
                            <Shield className="h-4 w-4 mr-2" /> Discipline
                        </TabsTrigger>
                        <TabsTrigger value="timetable" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 h-10 px-6 rounded-xl font-bold transition-all">
                            <CalendarDays className="h-4 w-4 mr-2" /> Horaire
                        </TabsTrigger>
                        <TabsTrigger value="payments" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 h-10 px-6 rounded-xl font-bold transition-all">
                            <Wallet className="h-4 w-4 mr-2" /> Finances
                        </TabsTrigger>
                        <TabsTrigger value="info" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 h-10 px-6 rounded-xl font-bold transition-all">
                            <User className="h-4 w-4 mr-2" /> Profil
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="px-1">
                    <TabsContent value="grades" className="mt-0 focus-visible:ring-0">
                        <GradesTab schoolId={schoolId} studentId={studentId} />
                    </TabsContent>
                    <TabsContent value="absences" className="mt-0 focus-visible:ring-0">
                        <AbsencesTab schoolId={schoolId} studentId={studentId} />
                    </TabsContent>
                    <TabsContent value="discipline" className="mt-0 focus-visible:ring-0">
                        <ParentDisciplineTab schoolId={schoolId} studentId={studentId} />
                    </TabsContent>
                    <TabsContent value="timetable" className="mt-0 focus-visible:ring-0">
                        <ParentTimetableTab schoolId={schoolId} student={student} />
                    </TabsContent>
                    <TabsContent value="payments" className="mt-0 focus-visible:ring-0">
                        <ParentPaymentsTab student={student} />
                    </TabsContent>
                    <TabsContent value="info" className="mt-0 focus-visible:ring-0">
                        <InfoTab student={student} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

function PageContent() {
    const searchParams = useSearchParams();
    const studentId = searchParams.get('id') as string;
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const initialTab = searchParams.get('tab') || 'grades';

    if (schoolLoading) {
        return <ParentStudentProfileSkeleton />;
    }

    if (!schoolId) {
        return <p>Erreur: Aucune école n'est associée à votre compte.</p>;
    }

    if (!studentId) {
        return <p>Erreur: ID de l'élève manquant.</p>;
    }

    return (
        <ParentStudentProfileContent studentId={studentId} schoolId={schoolId} initialTab={initialTab} />
    );
}

export default function ParentStudentClient() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <PageContent />
        </Suspense>
    );
}
