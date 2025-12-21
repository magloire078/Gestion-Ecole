
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import React from 'react';
import type { gradeEntry as GradeEntry } from '@/lib/data-types';

interface GradesTabProps {
    schoolId: string;
    studentId: string;
}

const calculateAverages = (grades: GradeEntry[]) => {
    const gradesBySubject: Record<string, { totalPoints: number; totalCoeffs: number }> = {};
    grades.forEach(g => {
        if (!gradesBySubject[g.subject]) {
            gradesBySubject[g.subject] = { totalPoints: 0, totalCoeffs: 0 };
        }
        gradesBySubject[g.subject].totalPoints += g.grade * g.coefficient;
        gradesBySubject[g.subject].totalCoeffs += g.coefficient;
    });
    
    const averages: Record<string, {average: number, totalCoeffs: number}> = {};
    let totalPoints = 0;
    let totalCoeffs = 0;

    for (const subject in gradesBySubject) {
        const { totalPoints: subjectTotalPoints, totalCoeffs: subjectTotalCoeffs } = gradesBySubject[subject];
        if (subjectTotalCoeffs > 0) {
            const average = subjectTotalPoints / subjectTotalCoeffs;
            averages[subject] = { average, totalCoeffs: subjectTotalCoeffs };
            totalPoints += subjectTotalPoints;
            totalCoeffs += subjectTotalCoeffs;
        }
    }
    const generalAverage = totalCoeffs > 0 ? totalPoints / totalCoeffs : 0;
    return { subjectAverages: averages, generalAverage };
};

export function GradesTab({ schoolId, studentId }: GradesTabProps) {
    const firestore = useFirestore();

    const gradesQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/eleves/${studentId}/notes`), orderBy('date', 'desc')), [firestore, schoolId, studentId]);
    const { data: gradesData, loading: gradesLoading } = useCollection(gradesQuery);

    const grades: GradeEntry[] = useMemo(() => gradesData?.map(d => ({ id: d.id, ...d.data() } as GradeEntry)) || [], [gradesData]);
    
    const { subjectAverages, generalAverage } = useMemo(() => calculateAverages(grades), [grades]);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Résultats Scolaires</CardTitle>
                        <CardDescription>Notes et moyenne générale de l'élève.</CardDescription>
                    </div>
                     <div className="text-right">
                        <p className="text-sm text-muted-foreground">Moyenne Générale</p>
                        <p className="text-3xl font-bold text-primary">{generalAverage !== null ? generalAverage.toFixed(2) : 'N/A'}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Matière</TableHead>
                        <TableHead className="text-right">Coeff.</TableHead>
                        <TableHead className="text-right">Moyenne</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {gradesLoading ? (
                             <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                        ) : Object.keys(subjectAverages).length > 0 ? Object.entries(subjectAverages).map(([subject, subjectData]) => {
                            const subjectGrades = grades.filter(g => g.subject === subject);
                            return (
                                <React.Fragment key={subject}>
                                    <TableRow>
                                        <TableCell className="font-medium">{subject}</TableCell>
                                        <TableCell className="text-right font-mono">{subjectData.totalCoeffs}</TableCell>
                                        <TableCell className="text-right font-mono text-lg">{subjectData.average.toFixed(2)}</TableCell>
                                    </TableRow>
                                    {subjectGrades.map(grade => (
                                        <TableRow key={grade.id} className="bg-muted/50">
                                            <TableCell className="py-1 text-xs pl-8 text-muted-foreground">{format(new Date(grade.date), 'd MMM', { locale: fr }) }</TableCell>
                                            <TableCell className="py-1 text-xs text-right text-muted-foreground">x{grade.coefficient}</TableCell>
                                            <TableCell className="py-1 text-xs text-right text-muted-foreground">{grade.grade}/20</TableCell>
                                        </TableRow>
                                    ))}
                                </React.Fragment>
                            );
                        }) : (
                            <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Aucune note enregistrée pour cet élève.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
