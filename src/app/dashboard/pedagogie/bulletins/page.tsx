'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useSchoolData } from "@/hooks/use-school-data";
import { useCollection, useFirestore } from "@/firebase";
import { collection } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown, Calculator, Loader2, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReportCardService, ReportCardData } from "@/services/report-card-service";
import type { student as Student, class_type as Class } from "@/lib/data-types";

export default function BulletinsPage() {
    const firestore = useFirestore();
    const { schoolId, schoolName, schoolData, digitalSignatureUrl } = useSchoolData();
    const { toast } = useToast();

    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [selectedPeriodName, setSelectedPeriodName] = useState<string>('');
    const [isCalculating, setIsCalculating] = useState(false);
    const [averages, setAverages] = useState<Record<string, { average: number; totalCoef: number }>>({});

    const studentsQuery = useMemo(() => schoolId ? collection(firestore, `ecoles/${schoolId}/eleves`) : null, [firestore, schoolId]);
    const classesQuery = useMemo(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);

    const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
    const { data: classesData, loading: classesLoading } = useCollection(classesQuery);

    const students: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);
    const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

    const filteredStudents = useMemo(() => {
        if (selectedClass === 'all') return [];
        return students.filter(s => s.classId === selectedClass);
    }, [students, selectedClass]);

    const academicPeriods = schoolData?.academicPeriods || [];
    const selectedPeriod = academicPeriods.find((p: any) => p.name === selectedPeriodName);

    // Initialiser la période par défaut
    useMemo(() => {
        if (academicPeriods.length > 0 && !selectedPeriodName) {
            setSelectedPeriodName(academicPeriods[0].name);
        }
    }, [academicPeriods]);

    const handleCalculateAverages = async () => {
        if (!schoolId || selectedClass === 'all' || !selectedPeriod) return;

        setIsCalculating(true);
        const reportService = new ReportCardService(firestore);
        const newAverages: Record<string, { average: number; totalCoef: number }> = {};

        try {
            for (const student of filteredStudents) {
                if (!student.id) continue;
                const subjectAvgs = await reportService.calculateStudentAverages(
                    schoolId,
                    student.id,
                    selectedPeriod.startDate,
                    selectedPeriod.endDate
                );
                const stats = reportService.calculateGeneralAverage(subjectAvgs);
                newAverages[student.id] = stats;
            }
            setAverages(newAverages);
            toast({ title: "Calcul terminé", description: `Les moyennes pour ${selectedPeriodName} ont été calculées.` });
        } catch (error) {
            console.error("Calculation failed:", error);
            toast({ variant: 'destructive', title: "Erreur", description: "Échec du calcul des moyennes." });
        } finally {
            setIsCalculating(false);
        }
    };

    const handleGeneratePDF = async (student: Student) => {
        if (!schoolId || !schoolName || !selectedPeriod) return;

        const reportService = new ReportCardService(firestore);
        const className = classes.find((c: Class) => c.id === selectedClass)?.name || "N/A";

        try {
            if (!student.id) return;
            const subjectAvgs = await reportService.calculateStudentAverages(
                schoolId,
                student.id,
                selectedPeriod.startDate,
                selectedPeriod.endDate
            );
            const stats = reportService.calculateGeneralAverage(subjectAvgs);

            const reportData: ReportCardData = {
                studentId: student.id,
                studentName: `${student.firstName} ${student.lastName}`,
                className: className,
                schoolYear: schoolData?.currentAcademicYear || "2023-2024",
                term: selectedPeriodName,
                subjectAverages: subjectAvgs,
                generalAverage: stats.average,
                totalCoefficients: stats.totalCoef
            };

            reportService.generatePDF(reportData, schoolName, digitalSignatureUrl);
            toast({ title: "Bulletin généré", description: `Le bulletin de ${student.firstName} (${selectedPeriodName}) est prêt.` });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast({ variant: 'destructive', title: "Erreur", description: "Impossible de générer le PDF." });
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">Gestion des Bulletins</h1>
                    <p className="text-muted-foreground">Calculez les moyennes et générez les bulletins officiels par période.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Configuration du Calcul</CardTitle>
                    <CardDescription>Choisissez la classe et la période académique pour recalculer les moyennes.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">Classe</label>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choisir une classe" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Choisir une classe...</SelectItem>
                                {classes.map((cls: Class) => (
                                    <SelectItem key={cls.id} value={cls.id!}>{cls.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">Période Académique</label>
                        <Select value={selectedPeriodName} onValueChange={setSelectedPeriodName}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choisir une période" />
                            </SelectTrigger>
                            <SelectContent>
                                {academicPeriods.map((p: any) => (
                                    <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                                ))}
                                {academicPeriods.length === 0 && (
                                    <SelectItem value="none" disabled>Aucune période configurée</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-end">
                        <Button
                            className="w-full md:w-auto"
                            onClick={handleCalculateAverages}
                            disabled={selectedClass === 'all' || !selectedPeriodName || isCalculating}
                        >
                            {isCalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                            Calculer les moyennes
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {selectedClass !== 'all' && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle>Liste des Élèves</CardTitle>
                            <CardDescription>{filteredStudents.length} élèves trouvés dans cette classe.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Élève</TableHead>
                                    <TableHead className="text-center">Moyenne Générale</TableHead>
                                    <TableHead className="text-center">Total Coef.</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentsLoading ? (
                                    [...Array(3)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredStudents.length > 0 ? (
                                    filteredStudents.map((student: Student) => (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-medium">
                                                {student.firstName} {student.lastName}
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-primary">
                                                {student.id && averages[student.id]?.average ? `${averages[student.id].average} / 20` : '--'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {student.id && averages[student.id]?.totalCoef || '--'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleGeneratePDF(student)}
                                                >
                                                    <FileDown className="mr-2 h-4 w-4" />
                                                    PDF
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                            Aucun élève dans cette classe.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
