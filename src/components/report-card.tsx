
'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Bot, Printer, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { staff as Staff, student as Student, class_type as Class } from '@/lib/data-types';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, type DocumentReference, type DocumentData } from 'firebase/firestore';
import { generateReportCardComment } from '@/ai/flows/generate-report-card-comment';


// --- Interfaces ---
interface StudentWithClass extends Student {
    classId?: string;
    name: string;
}

interface School {
    name: string;
    directorName?: string;
    address?: string;
    phone?: string;
    website?: string;
    mainLogoUrl?: string;
    currentAcademicYear?: string;
}

interface Grade {
    subject: string;
    grade: number;
    coefficient: number;
}

interface SubjectReport {
    subject: string;
    teacherName: string;
    average: number;
    classMin: number;
    classMax: number;
    classAverage: number;
    appreciation: string;
}

// --- Helper Functions ---
const getMention = (average: number): string => {
    if (average >= 18) return "Excellent";
    if (average >= 16) return "Très Bien";
    if (average >= 14) return "Bien";
    if (average >= 12) return "Assez Bien";
    if (average >= 10) return "Passable";
    return "Insuffisant";
};


// --- ReportCard Component Props ---
interface ReportCardProps {
    student: StudentWithClass;
    school: School;
    grades: Grade[];
    teachers: (Staff & { id: string })[];
}

export const ReportCard: React.FC<ReportCardProps> = ({ student, school, grades, teachers }) => {
    const { toast } = useToast();
    const printRef = useRef<HTMLDivElement>(null);
    const firestore = useFirestore();
    const { user } = useUser();
    const canManageGrades = !!user?.profile?.permissions?.manageGrades;

    const [councilComment, setCouncilComment] = useState("Excellent trimestre. Élève sérieux et motivé qui a fourni un travail de qualité. Les résultats sont très satisfaisants. Félicitations du conseil de classe.");
    const [isGeneratingCouncilComment, setIsGeneratingCouncilComment] = useState(false);

    const [subjectAppreciations, setSubjectAppreciations] = useState<Record<string, { text: string, isGenerating: boolean }>>({});


    // Fetch the student's class to get the mainTeacherId
    const classRef = useMemo(() =>
        (student.schoolId && student.classId) ? doc(firestore, `ecoles/${student.schoolId}/classes/${student.classId}`) as DocumentReference<Class, DocumentData> : null
        , [firestore, student.schoolId, student.classId]);
    const { data: classData } = useDoc<Class>(classRef);

    // Get the main teacher for the class
    const mainTeacher = useMemo(() => {
        if (!classData?.mainTeacherId || !teachers) return null;
        return teachers.find(t => t.id === classData.mainTeacherId) || null;
    }, [classData, teachers]);

    const { subjectReports, generalAverage, totalCoefficients } = useMemo(() => {
        const reports: SubjectReport[] = [];

        const gradesBySubject: Record<string, { totalPoints: number; totalCoeffs: number }> = {};
        grades.forEach(g => {
            if (!gradesBySubject[g.subject]) {
                gradesBySubject[g.subject] = { totalPoints: 0, totalCoeffs: 0 };
            }
            gradesBySubject[g.subject].totalPoints += g.grade * g.coefficient;
            gradesBySubject[g.subject].totalCoeffs += g.coefficient;
        });

        const subjects = Object.keys(gradesBySubject);
        const studentCycle = student.cycle;
        const isPrimaryOrMaternelle = studentCycle === "Maternelle" || studentCycle === "Enseignement Primaire";

        subjects.forEach(subject => {
            const { totalPoints, totalCoeffs } = gradesBySubject[subject];
            const studentAverage = totalCoeffs > 0 ? totalPoints / totalCoeffs : 0;

            let teacherName = 'N/A';
            if (isPrimaryOrMaternelle && mainTeacher) {
                teacherName = `${mainTeacher.firstName} ${mainTeacher.lastName}`;
            } else {
                const subjectTeacher = teachers.find(t => t.subject === subject);
                if (subjectTeacher) {
                    teacherName = `${subjectTeacher.firstName} ${subjectTeacher.lastName}`;
                } else if (mainTeacher) {
                    // Fallback to main teacher if no subject teacher is found
                    teacherName = `${mainTeacher.firstName} ${mainTeacher.lastName}`;
                }
            }

            reports.push({
                subject,
                teacherName: teacherName,
                average: studentAverage,
                // Mock data for class stats as we don't have them yet
                classMin: studentAverage > 2 ? studentAverage - 1.5 : studentAverage * 0.8,
                classMax: studentAverage < 19 ? studentAverage + 1.2 : 20,
                classAverage: studentAverage < 19.5 ? studentAverage + 0.5 : 20,
                appreciation: subjectAppreciations[subject]?.text || ''
            });
        });

        reports.sort((a, b) => b.average - a.average);

        let totalWeightedPoints = 0;
        let totalAllCoeffs = 0;

        Object.keys(gradesBySubject).forEach(subject => {
            const { totalPoints, totalCoeffs } = gradesBySubject[subject];
            if (totalCoeffs > 0) {
                totalWeightedPoints += totalPoints;
                totalAllCoeffs += totalCoeffs;
            }
        });

        const finalAverage = totalAllCoeffs > 0 ? totalWeightedPoints / totalAllCoeffs : 0;

        return { subjectReports: reports, generalAverage: finalAverage, totalCoefficients: totalAllCoeffs };
    }, [grades, teachers, mainTeacher, student.cycle, subjectAppreciations]);

    const handleGenerateComment = async (subject?: string, teacherName?: string, average?: number) => {
        if (subject && teacherName && average !== undefined) {
            setSubjectAppreciations(prev => ({ ...prev, [subject]: { text: '', isGenerating: true } }));
            try {
                const comment = await generateReportCardComment({
                    subject,
                    teacherName,
                    average,
                    studentName: student.name,
                });
                setSubjectAppreciations(prev => ({ ...prev, [subject]: { text: comment, isGenerating: false } }));
            } catch (e) {
                console.error("AI comment generation failed:", e);
                toast({ variant: 'destructive', title: "Erreur de l'IA", description: "La génération de commentaire a échoué." });
                setSubjectAppreciations(prev => ({ ...prev, [subject]: { text: '', isGenerating: false } }));
            }
        } else {
            toast({ title: "Fonctionnalité en développement", description: "La génération du commentaire général sera bientôt disponible." });
        }
    };

    const handlePrint = () => {
        const printContent = printRef.current?.innerHTML;
        if (printContent) {
            const printWindow = window.open('', '', 'height=800,width=1200');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Bulletin de Notes</title>');
                // Inclure les styles pour l'impression
                const styles = Array.from(document.styleSheets)
                    .map(s => s.href ? `<link rel="stylesheet" href="${s.href}" media="print">` : '')
                    .join('');
                printWindow.document.write(styles);
                printWindow.document.write('</head><body>');
                printWindow.document.write(printContent);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => { // Donner le temps de charger les styles
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
        }
    };


    return (
        <Card className="report-card font-serif">
            <CardContent className="p-4 sm:p-6">
                <div ref={printRef} className="print:text-black">
                    {/* Header */}
                    <div className="flex justify-between items-start pb-4 border-b-2 border-black mb-6">
                        <div className="flex items-center gap-4">
                            {school.mainLogoUrl && <AvatarImage src={school.mainLogoUrl || undefined} alt={school.name} width={80} height={80} className="object-contain" />}
                            <div>
                                <h2 className="text-2xl font-bold uppercase">{school.name || "Nom de l'école"}</h2>
                                <p className="text-xs text-muted-foreground">{school.address || "Adresse de l'école"}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p>Année scolaire: {school.currentAcademicYear || `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`}</p>
                            <h1 className="text-lg font-bold">BULLETIN DE NOTES</h1>
                            <p>PREMIER TRIMESTRE</p>
                        </div>
                    </div>

                    {/* Student Info */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-sm space-y-1">
                            <p><span className="font-semibold">Élève :</span> {student.name}</p>
                            <p><span className="font-semibold">Classe :</span> {student.class || 'N/A'}</p>
                            <p><span className="font-semibold">Matricule :</span> {student.matricule || 'N/A'}</p>
                        </div>
                        <Avatar className="h-20 w-20 border-2 border-black/10">
                            <AvatarImage src={student.photoUrl || undefined} alt={student.name} data-ai-hint="student portrait" />
                            <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </div>

                    {/* Grades Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-y-2 border-black">
                                <tr className="text-left">
                                    <th className="p-2 font-bold">MATIÈRES</th>
                                    <th className="p-2 text-center font-bold">COEFF.</th>
                                    <th className="p-2 text-center font-bold">MOY. ÉLÈVE</th>
                                    <th className="p-2 text-center font-bold hidden sm:table-cell">MOY. CLASSE</th>
                                    <th className="p-2 font-bold">APPRÉCIATIONS DES PROFESSEURS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {subjectReports.map((report) => {
                                    const totalCoeffs = grades.filter(g => g.subject === report.subject).reduce((sum, g) => sum + g.coefficient, 0);
                                    const isGenerating = subjectAppreciations[report.subject]?.isGenerating;
                                    return (
                                        <tr key={report.subject} className="print-break-inside-avoid">
                                            <TableCell className="p-2">
                                                <p className="font-semibold">{report.subject}</p>
                                                <p className="text-xs text-muted-foreground">{report.teacherName}</p>
                                            </TableCell>
                                            <td className="p-2 text-center font-mono">{totalCoeffs}</td>
                                            <td className="p-2 text-center font-mono font-bold text-base">{report.average.toFixed(2)}</td>
                                            <td className="p-2 text-center font-mono hidden sm:table-cell">{report.classAverage.toFixed(2)}</td>
                                            <td className="p-2 text-xs italic">
                                                <div className="flex items-start gap-1">
                                                    <span className="flex-1">{report.appreciation}</span>
                                                    {canManageGrades && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5 no-print"
                                                            onClick={() => handleGenerateComment(report.subject, report.teacherName, report.average)}
                                                            disabled={isGenerating}
                                                        >
                                                            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-muted/50 rounded-md space-y-2">
                            <div className="flex justify-between items-center text-base">
                                <span className="font-bold">MOYENNE GÉNÉRALE TRIMESTRIELLE :</span>
                                <span className="text-xl font-bold text-primary">{generalAverage.toFixed(2)} / 20</span>
                            </div>
                            <div className="flex justify-between items-center text-base">
                                <span className="font-bold">TOTAL COEFFICIENTS :</span>
                                <span className="text-xl font-bold">{totalCoefficients}</span>
                            </div>
                            <div className="text-center pt-2">
                                <p className="font-bold text-lg">{getMention(generalAverage)}</p>
                            </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-md">
                            <div className="flex justify-between items-start">
                                <p className="font-bold mb-1">APPRÉCIATION DU CONSEIL DE CLASSE</p>
                                {canManageGrades && (
                                    <Button variant="ghost" size="sm" onClick={() => handleGenerateComment()} disabled={isGeneratingCouncilComment} className="no-print">
                                        {isGeneratingCouncilComment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                                        {isGeneratingCouncilComment ? "Génération..." : "Générer"}
                                    </Button>
                                )}
                            </div>
                            <p className="italic text-sm">{councilComment}</p>
                        </div>
                    </div>

                    {/* Footer with signatures */}
                    <div className="mt-16 grid grid-cols-2 gap-8 text-center text-sm print-break-inside-avoid">
                        <div>
                            <p className="font-bold">Le Professeur Principal</p>
                            <div className="mt-16 border-t border-black w-48 mx-auto"></div>
                            <p>{mainTeacher ? `${mainTeacher.firstName} ${mainTeacher.lastName}` : ''}</p>
                        </div>
                        <div>
                            <p className="font-bold">Le Directeur</p>
                            <div className="mt-16 border-t border-black w-48 mx-auto"></div>
                            <p>{school.directorName}</p>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end no-print">
                    <Button onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimer le Bulletin
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
