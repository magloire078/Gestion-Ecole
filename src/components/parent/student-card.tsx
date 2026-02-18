'use client';

import { useDoc, useFirestore } from '@/firebase';
import { doc, collection, query, orderBy, limit, where, type DocumentReference, type DocumentData } from 'firebase/firestore';
import { Card, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import type { student as Student, gradeEntry as GradeEntry, absence as Absence } from '@/lib/data-types';
import { ChevronRight, TrendingUp, Wallet, UserX, Star, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';
import { useCollection } from '@/firebase';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

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

    const studentRef = useMemo(() => doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`) as DocumentReference<Student, DocumentData>, [firestore, schoolId, studentId]);
    const { data: student, loading: studentLoading } = useDoc<Student>(studentRef);

    const gradesQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/eleves/${studentId}/notes`)), [firestore, schoolId, studentId]);
    const { data: gradesData, loading: gradesLoading } = useCollection(gradesQuery);

    const absencesQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/eleves/${studentId}/absences`), orderBy('date', 'desc'), limit(30)), [firestore, schoolId, studentId]);
    const { data: absencesData, loading: absencesLoading } = useCollection(absencesQuery);

    const studentAbsences = useMemo(() => absencesData?.length || 0, [absencesData]);

    const grades = useMemo(() => gradesData?.map(d => d.data() as GradeEntry) || [], [gradesData]);
    const generalAverage = useMemo(() => calculateGeneralAverage(grades), [grades]);

    const loading = studentLoading || gradesLoading || absencesLoading;

    if (loading) {
        return (
            <Card className="overflow-hidden border-primary/5">
                <div className="p-6 flex flex-row items-center gap-6">
                    <Skeleton className="h-20 w-20 rounded-2xl" />
                    <div className="flex-1 space-y-3">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-32" />
                        <div className="flex gap-4 pt-2">
                            <Skeleton className="h-8 w-24 rounded-full" />
                            <Skeleton className="h-8 w-24 rounded-full" />
                        </div>
                    </div>
                </div>
            </Card>
        );
    }

    if (!student) return null;

    const studentFullName = `${student.firstName} ${student.lastName}`;
    const fallback = studentFullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const isPaymentUpToDate = (student.amountDue || 0) <= 0;

    return (
        <Link href={`/dashboard/parent/student/details?id=${studentId}`}>
            <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-primary/5 hover:border-primary/20 rounded-3xl">
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="p-6">
                    <div className="flex flex-row items-start justify-between gap-4 mb-6">
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <Avatar className="h-20 w-20 rounded-2xl border-2 border-white shadow-lg ring-4 ring-blue-50/50">
                                    <AvatarImage src={student.photoURL || undefined} alt={studentFullName} className="object-cover" />
                                    <AvatarFallback className="text-2xl font-bold bg-blue-100 text-blue-700">{fallback}</AvatarFallback>
                                </Avatar>
                                {generalAverage >= 15 && (
                                    <div className="absolute -top-2 -right-2 bg-amber-400 text-white p-1 rounded-lg shadow-md">
                                        <Star className="h-4 w-4 fill-white" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="font-extrabold text-xl text-slate-800 tracking-tight">{studentFullName}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold">
                                        {student.class}
                                    </Badge>
                                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                                    <p className="text-sm font-medium text-slate-500">Matricule: {student.matricule || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl group-hover:bg-blue-50 transition-colors">
                            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-500" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Performance Section */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                                    Moyenne Générale
                                </p>
                                <span className="text-sm font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                    {generalAverage.toFixed(2)}/20
                                </span>
                            </div>
                            <Progress value={generalAverage * 5} className="h-2 bg-slate-100" />
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-wrap gap-3 items-center">
                            <Badge variant="outline" className={`py-1.5 px-3 rounded-xl border-dashed flex items-center gap-2 font-bold ${isPaymentUpToDate ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                {isPaymentUpToDate ? <CheckCircle2 className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                                {isPaymentUpToDate ? 'Scolarité Payée' : `Solde: ${(student.amountDue || 0).toLocaleString('fr-FR')} FCFA`}
                            </Badge>

                            <Badge variant="outline" className={`py-1.5 px-3 rounded-xl border-dashed flex items-center gap-2 font-bold ${studentAbsences > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}>
                                <UserX className="h-4 w-4" />
                                {studentAbsences === 0 ? 'Aucune absence' : `${studentAbsences} absence(s)`}
                            </Badge>
                        </div>
                    </div>
                </div>
            </Card>
        </Link>
    )
}
