
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
    const sortedSubjects = useMemo(() => Object.keys(subjectAverages).sort((a,b) => subjectAverages[b].average - subjectAverages[a].average), [subjectAverages]);

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
                {gradesLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : sortedSubjects.length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                        {sortedSubjects.map(subject => {
                            const subjectData = subjectAverages[subject];
                            const subjectGrades = grades.filter(g => g.subject === subject);
                            return (
                                <AccordionItem value={subject} key={subject}>
                                    <AccordionTrigger>
                                        <div className="flex justify-between w-full items-center pr-4">
                                            <span className="font-semibold">{subject}</span>
                                            <div className="text-right">
                                                <div className="font-bold text-lg">{subjectData.average.toFixed(2)}</div>
                                                <div className="text-xs text-muted-foreground">Coeff. {subjectData.totalCoeffs}</div>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead className="text-right">Note</TableHead>
                                                    <TableHead className="text-right">Coeff.</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {subjectGrades.map(grade => (
                                                    <TableRow key={grade.id}>
                                                        <TableCell>{format(new Date(grade.date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                                                        <TableCell>{grade.type}</TableCell>
                                                        <TableCell className="text-right font-mono">{grade.grade}/20</TableCell>
                                                        <TableCell className="text-right font-mono">{grade.coefficient}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                ) : (
                    <div className="text-center text-muted-foreground py-8">Aucune note enregistrée pour cet élève.</div>
                )}
            </CardContent>
        </Card>
    );
}
