'use client';

import { notFound, useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, collection, query, type DocumentReference, type DocumentData } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useCallback, useEffect } from 'react';
import { isWithinInterval, parseISO } from 'date-fns';
import { ReportCard } from '@/components/report-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { staff as Staff, student as Student, gradeEntry as GradeEntry } from '@/lib/data-types';
import { ReportCardService, ClassSubjectStats } from '@/services/report-card-service';

interface StudentWithClass extends Student {
    classId?: string;
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


function StudentReportContent({ eleveId, schoolId, schoolData }: { eleveId: string, schoolId: string, schoolData: any }) {
    const firestore = useFirestore();
    const [selectedPeriodName, setSelectedPeriodName] = useState<string>(schoolData?.academicPeriods?.[0]?.name || '');
    const [classStats, setClassStats] = useState<Record<string, ClassSubjectStats> | undefined>();
    const [studentRank, setStudentRank] = useState<{ rank: number, total: number } | undefined>();
    const [isStatsLoading, setIsStatsLoading] = useState(false);

    const reportCardService = useMemo(() => new ReportCardService(firestore), [firestore]);

    const studentRef = useMemo(() =>
        doc(firestore, `ecoles/${schoolId}/eleves/${eleveId}`) as DocumentReference<StudentWithClass, DocumentData>
        , [firestore, schoolId, eleveId]);
    const { data: studentData, loading: studentLoading } = useDoc<StudentWithClass>(studentRef);

    const gradesQuery = useMemo(() =>
        query(collection(firestore, `ecoles/${schoolId}/eleves/${eleveId}/notes`))
        , [firestore, schoolId, eleveId]);

    const teachersQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/personnel`)), [firestore, schoolId]);

    const { data: gradesData, loading: gradesLoading } = useCollection(gradesQuery);
    const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);

    const student = useMemo(() => studentData ? { ...studentData, id: eleveId } as StudentWithClass : null, [studentData, eleveId]);
    const teachers = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Staff & { id: string })) || [], [teachersData]);

    const academicPeriods = schoolData?.academicPeriods || [];
    const selectedPeriod = academicPeriods.find((p: any) => p.name === selectedPeriodName);

    const filteredGrades = useMemo(() => {
        const allGrades = gradesData?.map(d => ({ id: d.id, ...d.data() } as GradeEntry)) || [];
        if (!selectedPeriod) return allGrades;

        return allGrades.filter(grade => {
            if (!grade.date) return false;
            try {
                const gradeDate = parseISO(grade.date);
                const start = parseISO(selectedPeriod.startDate);
                const end = parseISO(selectedPeriod.endDate);
                return isWithinInterval(gradeDate, { start, end });
            } catch (e) {
                return false;
            }
        });
    }, [gradesData, selectedPeriod]);

    const fetchClassStats = useCallback(async () => {
        if (!studentData?.classId || !selectedPeriod) return;

        setIsStatsLoading(true);
        try {
            const stats = await reportCardService.getClassStatistics(
                schoolId,
                studentData.classId,
                selectedPeriod.startDate,
                selectedPeriod.endDate
            );
            setClassStats(stats.classStats);
            if (stats.studentRanks[eleveId]) {
                setStudentRank({
                    rank: stats.studentRanks[eleveId].rank,
                    total: stats.totalStudents
                });
            }
        } catch (error) {
            console.error("Error fetching class stats:", error);
        } finally {
            setIsStatsLoading(false);
        }
    }, [studentData?.classId, selectedPeriod, schoolId, eleveId, reportCardService]);

    useEffect(() => {
        fetchClassStats();
    }, [fetchClassStats]);

    const isLoading = studentLoading || gradesLoading || teachersLoading || isStatsLoading;

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
        currentAcademicYear: schoolData?.currentAcademicYear
    };

    const reportStudent = {
        ...student,
        name: `${student.firstName} ${student.lastName}`
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">Bulletin de {reportStudent.name}</h1>
                    <p className="text-muted-foreground">Aperçu des résultats scolaires pour la période sélectionnée.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Période :</span>
                    <Select value={selectedPeriodName} onValueChange={setSelectedPeriodName}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Sélectionner une période" />
                        </SelectTrigger>
                        <SelectContent>
                            {academicPeriods.length > 0 ? (
                                academicPeriods.map((period: any) => (
                                    <SelectItem key={period.name} value={period.name}>
                                        {period.name}
                                    </SelectItem>
                                ))
                            ) : (
                                <SelectItem value="default" disabled>Aucune période définie</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <ReportCard
                student={reportStudent}
                school={schoolInfo}
                grades={filteredGrades}
                teachers={teachers}
                periodName={selectedPeriodName || "Période en cours"}
                classStats={classStats}
                rank={studentRank?.rank}
                totalStudents={studentRank?.total}
            />
        </div>
    );
}

function StudentReportClientInner() {
    const searchParams = useSearchParams();
    const eleveId = searchParams.get('id') as string;
    const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();

    if (schoolLoading) {
        return <StudentReportPageSkeleton />;
    }

    if (!schoolId || !schoolData) {
        return <div>École non trouvée. Vérifiez votre association à une école.</div>;
    }

    if (!eleveId) {
        return <div>ID de l&apos;élève manquant dans l&apos;URL.</div>;
    }

    return <StudentReportContent eleveId={eleveId} schoolId={schoolId} schoolData={schoolData} />
}

export default function StudentReportClient() {
    return (
        <Suspense fallback={<StudentReportPageSkeleton />}>
            <StudentReportClientInner />
        </Suspense>
    );
}
