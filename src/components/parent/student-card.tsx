
'use client';

import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, limit, where } from 'firebase/firestore';
import { Card, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import type { student as Student, gradeEntry as GradeEntry, absence as Absence } from '@/lib/data-types';
import { SafeImage } from '../ui/safe-image';
import { ChevronRight, TrendingUp, Wallet, UserX } from 'lucide-react';
import { useMemo } from 'react';

interface ParentStudentCardProps {
    schoolId: string;
    studentId: string;
}

const calculateGeneralAverage = (grades: GradeEntry[]) => {
    if (!grades || grades.length === 0) return 0;
    
    const totalPoints = grades.reduce((acc, grade) => acc + (grade.grade * grade.coefficient), 0);
    const totalCoeffs = grades.reduce((acc, grade) => acc + grade.coefficient, 0);

    return totalCoeffs > 0 ? totalPoints / totalCoeffs : 0;
};


export function ParentStudentCard({ schoolId, studentId }: ParentStudentCardProps) {
    const firestore = useFirestore();

    const studentRef = useMemoFirebase(() => doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`), [firestore, schoolId, studentId]);
    const { data: student, loading: studentLoading } = useDoc<Student>(studentRef);

    const gradesQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/eleves/${studentId}/notes`)), [firestore, schoolId, studentId]);
    const { data: gradesData, loading: gradesLoading } = useCollection(gradesQuery);
    
    const absencesQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/absences`), where('studentId', '==', studentId), orderBy('date', 'desc'), limit(30)), [firestore, schoolId, studentId]);
    const { data: absencesData, loading: absencesLoading } = useCollection(absencesQuery);
    
    const studentAbsences = useMemo(() => absencesData?.length || 0, [absencesData]);

    const grades = useMemo(() => gradesData?.map(d => d.data() as GradeEntry) || [], [gradesData]);
    const generalAverage = useMemo(() => calculateGeneralAverage(grades), [grades]);
    
    const loading = studentLoading || gradesLoading || absencesLoading;
    
    if (loading) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-24" />
                        <div className="flex gap-4 pt-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" /></div>
                    </div>
                </CardHeader>
            </Card>
        );
    }
    
    if (!student) {
        return (
             <Card className="border-destructive">
                <CardHeader>
                    <p className="text-destructive">Impossible de charger les informations pour l'élève ID: {studentId}</p>
                </CardHeader>
            </Card>
        );
    }
    
    const studentFullName = `${student.firstName} ${student.lastName}`;
    const fallback = studentFullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <Link href={`/dashboard/dossiers-eleves/${studentId}`}>
            <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <Avatar className="h-16 w-16">
                            <SafeImage src={student.photoUrl} alt={studentFullName} />
                            <AvatarFallback className="text-xl">{fallback}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-bold text-lg">{studentFullName}</p>
                            <p className="text-sm text-muted-foreground">{student.class}</p>
                            <div className="flex items-center gap-4 text-sm mt-2 text-muted-foreground">
                               <div className="flex items-center" title="Moyenne générale">
                                    <TrendingUp className="h-4 w-4 mr-1 text-blue-500" />
                                    <span className="font-semibold">{generalAverage.toFixed(2)}</span>
                               </div>
                               <div className="flex items-center" title="Solde scolarité">
                                    <Wallet className="h-4 w-4 mr-1 text-red-500" />
                                    <span className="font-semibold">{(student.amountDue || 0).toLocaleString('fr-FR')}</span>
                               </div>
                               <div className="flex items-center" title="Absences (30 derniers jours)">
                                    <UserX className="h-4 w-4 mr-1 text-amber-500" />
                                    <span className="font-semibold">{studentAbsences}</span>
                               </div>
                            </div>
                        </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
            </Card>
        </Link>
    )
}
