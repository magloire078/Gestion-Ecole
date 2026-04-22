
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import React from 'react';
import type { gradeEntry as GradeEntry } from '@/lib/data-types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
    TrendingUp, 
    TrendingDown, 
    MinusCircle 
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

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

    const averages: Record<string, { average: number, totalCoeffs: number }> = {};
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

const getGradeColor = (grade: number) => {
    if (grade >= 15) return 'text-emerald-600';
    if (grade >= 10) return 'text-amber-600';
    return 'text-destructive';
};

const getBadgeVariant = (grade: number) => {
    if (grade >= 15) return 'secondary';
    if (grade >= 10) return 'outline';
    return 'destructive';
};

const SubjectProgressBar = ({ average }: { average: number }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const percentage = (average / 20) * 100;

    React.useEffect(() => {
        if (ref.current) {
            ref.current.style.width = `${percentage}%`;
        }
    }, [percentage]);

    return (
        <div className="w-full max-w-[200px] h-2 bg-slate-100/50 rounded-full overflow-hidden border border-slate-200/30 backdrop-blur-sm">
            <div 
                ref={ref}
                className={cn("h-full transition-all duration-1000 ease-out", 
                    average >= 15 ? "bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : 
                    average >= 10 ? "bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]" : 
                    "bg-gradient-to-r from-rose-400 to-red-600 shadow-[0_0_10px_rgba(244,63,94,0.3)]")
                }
            />
        </div>
    );
};

const getProgressionIndicator = (currentGrade: GradeEntry, allGrades: GradeEntry[]) => {
    const studentGrades = allGrades
      .filter(g => g.subject === currentGrade.subject)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const currentIndex = studentGrades.findIndex(g => g.id === currentGrade.id);
    if (currentIndex <= 0) return null;

    const previousGrade = studentGrades[currentIndex - 1];
    const diff = currentGrade.grade - previousGrade.grade;

    if (diff > 0) return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] bg-emerald-50/50 px-2 py-0.5 rounded-full border border-emerald-100 shadow-sm backdrop-blur-sm">
              <TrendingUp className="h-3 w-3" />
              +{diff.toFixed(1)}
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-none rounded-lg text-[10px]">
            Progression : +{diff.toFixed(1)} par rapport au {format(new Date(previousGrade.date), 'dd/MM')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    if (diff < 0) return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-rose-600 font-bold text-[10px] bg-rose-50/50 px-2 py-0.5 rounded-full border border-rose-100 shadow-sm backdrop-blur-sm">
              <TrendingDown className="h-3 w-3" />
              {diff.toFixed(1)}
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-none rounded-lg text-[10px]">
            Régression : {diff.toFixed(1)} par rapport au {format(new Date(previousGrade.date), 'dd/MM')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    return (
      <div className="flex items-center gap-1 text-slate-400 font-bold text-[10px] bg-slate-50/50 px-2 py-0.5 rounded-full border border-slate-100 backdrop-blur-sm">
        <MinusCircle className="h-3 w-3" />
        STABLE
      </div>
    );
};

export function GradesTab({ schoolId, studentId }: GradesTabProps) {
    const firestore = useFirestore();

    const gradesQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/eleves/${studentId}/notes`), orderBy('date', 'desc')), [firestore, schoolId, studentId]);
    const { data: gradesData, loading: gradesLoading } = useCollection(gradesQuery);

    const grades: GradeEntry[] = useMemo(() => gradesData?.map(d => ({ id: d.id, ...d.data() } as GradeEntry)) || [], [gradesData]);

    const { subjectAverages, generalAverage } = useMemo(() => calculateAverages(grades), [grades]);
    const sortedSubjects = useMemo(() => Object.keys(subjectAverages).sort((a, b) => subjectAverages[b].average - subjectAverages[a].average), [subjectAverages]);

    return (
        <Card className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden border-t-white/80 animate-in fade-in duration-700">
            <CardHeader className="pb-6 border-b border-white/40">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">Résultats Scolaires</CardTitle>
                        <CardDescription className="text-slate-500 font-medium">Analyse détaillée des performances académiques.</CardDescription>
                    </div>
                    <div className="text-right bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-white/60 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Moyenne Générale</p>
                        <div className="flex items-center gap-3">
                            <p className={cn("text-4xl font-black tracking-tighter", getGradeColor(generalAverage))}>
                                {generalAverage !== null ? generalAverage.toFixed(2) : 'N/A'}
                            </p>
                            <Badge variant={getBadgeVariant(generalAverage)} className="rounded-full px-3 py-1 font-black text-[10px] uppercase tracking-wider shadow-sm">
                                {generalAverage >= 10 ? 'Admis' : 'Ajourné'}
                            </Badge>
                        </div>
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
                                <AccordionItem value={subject} key={subject} className="border-b border-white/20 last:border-0">
                                    <AccordionTrigger className="hover:no-underline py-6 px-4 rounded-2xl hover:bg-white/30 transition-all duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 w-full items-center gap-4 pr-4">
                                            <div className="flex flex-col items-start gap-2">
                                                <span className="font-black text-lg text-slate-700 tracking-tight">{subject}</span>
                                                <SubjectProgressBar average={subjectData.average} />
                                            </div>
                                            <div className="flex justify-between md:justify-end items-center gap-8">
                                                <div className="text-right">
                                                    <div className={cn("font-black text-3xl tracking-tighter", getGradeColor(subjectData.average))}>
                                                        {subjectData.average.toFixed(2)}
                                                    </div>
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        Coeff. {subjectData.totalCoeffs}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                        <div className="bg-white/20 rounded-2xl border border-white/30 overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-white/30">
                                                    <TableRow className="hover:bg-transparent border-b border-white/20">
                                                        <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Date</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Type</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Note /20</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Tendance</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-right pr-6">Coeff.</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {subjectGrades.map(grade => (
                                                        <TableRow key={grade.id} className="hover:bg-white/40 transition-colors border-b border-white/10 last:border-0">
                                                            <TableCell className="text-xs font-medium text-slate-600">{format(new Date(grade.date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                                                            <TableCell>
                                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100/50 px-2 py-0.5 rounded border border-slate-200/50">
                                                                    {grade.type}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-center font-black">
                                                                <span className={cn("text-base", getGradeColor(grade.grade))}>{grade.grade.toFixed(1)}</span>
                                                                <span className="text-[10px] text-muted-foreground/50 font-medium"> / 20</span>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="flex justify-center">
                                                                    {getProgressionIndicator(grade, grades)}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right pr-6 font-mono font-black text-slate-500">{grade.coefficient}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
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
