
'use client';

import { Suspense } from 'react';
import { notFound, useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, User, BookUser, Wallet, Shield, CalendarDays } from 'lucide-react';
import React, { useMemo } from 'react';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { student as Student, payment as Payment } from '@/lib/data-types';
import { SafeImage } from '@/components/ui/safe-image';
import { GradesTab } from '@/components/students/grades-tab';
import { InfoTab } from '@/components/students/info-tab';
import { AbsencesTab } from '@/components/students/absences-tab';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Separator } from '@/components/ui/separator';
import { TuitionStatusBadge } from '@/components/tuition-status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ParentDisciplineTab } from '@/components/parent/parent-discipline-tab';
import { ParentTimetableTab } from '@/components/parent/parent-timetable-tab';

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

const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    return `${value.toLocaleString('fr-FR')} CFA`;
};


function ParentPaymentsTab({ student }: { student: Student & { id: string } }) {
    const { schoolId } = useSchoolData();
    const firestore = useFirestore();

    const paymentsQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/eleves/${student.id}/paiements`), orderBy('date', 'desc')), [firestore, schoolId, student.id]);
    const { data: paymentHistoryData, loading: paymentsLoading } = useCollection(paymentsQuery);
    const paymentHistory: (Payment & {id:string})[] = useMemo(() => paymentHistoryData?.map(d => ({ id: d.id, ...d.data() } as Payment & {id:string})) || [], [paymentHistoryData]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /><span>Scolarité</span></CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Frais de scolarité:</span><span className="font-semibold">{formatCurrency(student.tuitionFee)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Remise:</span><span className="font-semibold text-emerald-600">{`-${formatCurrency(student.discountAmount)}`}</span></div>
                    <Separator />
                    <div className="flex justify-between items-center font-bold"><span>Total à payer:</span><span>{formatCurrency((student.tuitionFee || 0) - (student.discountAmount || 0))}</span></div>
                    <Separator />
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Statut:</span><TuitionStatusBadge status={student.tuitionStatus ?? 'Partiel'}/></div>
                    <div className="flex justify-between items-center text-lg"><span className="font-bold">Solde dû:</span><span className="font-bold text-primary">{formatCurrency(student.amountDue)}</span></div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle>Historique des Paiements</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {paymentsLoading ? (
                                <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                            ) : paymentHistory.length > 0 ? (
                                paymentHistory.map(payment => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{format(new Date(payment.date), 'd MMMM yyyy', {locale: fr})}</TableCell>
                                        <TableCell>{payment.description}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(payment.amount)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={3} className="text-center h-24">Aucun paiement enregistré.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}


function ParentStudentProfileContent({ studentId, schoolId, initialTab }: { studentId: string, schoolId: string, initialTab: string }) {
    const router = useRouter();
    const firestore = useFirestore();

    const studentRef = useMemo(() => doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`), [firestore, schoolId, studentId]);
    const { data: studentData, loading: studentLoading } = useDoc<Student & {id:string}>(studentRef);
    const student = studentData;

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
                    <SafeImage src={student.photoUrl} alt={studentFullName} />
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
      return <p>Erreur: Aucune école n'est associée à votre compte.</p>;
    }
    
    if (!studentId) {
      return <p>Erreur: ID de l'élève manquant.</p>;
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
