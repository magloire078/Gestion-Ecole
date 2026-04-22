
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
import { motion, AnimatePresence } from 'framer-motion';


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

export interface ClassSubjectStats {
    subject: string;
    classAverage: number;
    minGrade: number;
    maxGrade: number;
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
    periodName?: string;
    classStats?: Record<string, ClassSubjectStats>;
    rank?: number;
    totalStudents?: number;
}

export const ReportCard: React.FC<ReportCardProps> = ({
    student,
    school,
    grades,
    teachers,
    periodName = "PREMIER TRIMESTRE",
    classStats,
    rank,
    totalStudents
}) => {
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

            const stats = classStats?.[subject];

            reports.push({
                subject,
                teacherName: teacherName,
                average: studentAverage,
                classMin: stats?.minGrade ?? (studentAverage > 2 ? studentAverage - 1.5 : studentAverage * 0.8),
                classMax: stats?.maxGrade ?? (studentAverage < 19 ? studentAverage + 1.2 : 20),
                classAverage: stats?.classAverage ?? (studentAverage < 19.5 ? studentAverage + 0.5 : 20),
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
    }, [grades, teachers, mainTeacher, student.cycle, subjectAppreciations, classStats]);

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
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="report-card font-sans bg-white/40 backdrop-blur-xl border border-white/60 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden border-t-white/80">
                <CardContent className="p-4 sm:p-10">
                    <div ref={printRef} className="print:text-black print:font-serif">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start pb-8 border-b-2 border-slate-900/10 mb-8 gap-6">
                            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                                {school.mainLogoUrl && (
                                    <motion.img
                                        whileHover={{ scale: 1.05, rotate: 2 }}
                                        src={school.mainLogoUrl}
                                        alt={school.name}
                                        className="h-24 w-24 object-contain drop-shadow-xl"
                                    />
                                )}
                                <div>
                                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-tight">{school.name || "Nom de l'école"}</h2>
                                    <p className="text-sm text-slate-500 font-medium tracking-wide">{school.address || "Adresse de l'école"}</p>
                                </div>
                            </div>
                            <div className="text-center sm:text-right space-y-1">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 inline-block mb-2">Session Académique</p>
                                <p className="text-sm font-bold text-slate-700">{school.currentAcademicYear || `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`}</p>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tighter">BULLETIN DE NOTES</h1>
                                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{periodName.toUpperCase()}</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest text-center mb-8 opacity-50">Document confidentiel généré par le système GèreEcole</p>

                        {/* Student Info Box */}
                        <div className="bg-slate-900/5 rounded-[2rem] p-8 mb-10 border border-white/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-indigo-500/20 transition-all duration-700" />
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-8 relative z-10">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Élève</p>
                                        <p className="text-xl font-black text-slate-800 tracking-tight">{student.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</p>
                                        <p className="text-xl font-black text-indigo-600 tracking-tight">{student.class || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matricule</p>
                                        <p className="text-sm font-bold text-slate-700 tracking-widest font-mono">{student.matricule || 'N/A'}</p>
                                    </div>
                                    {rank && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Performance</p>
                                            <div className="flex items-baseline gap-2">
                                                <p className="text-2xl font-black text-emerald-600 tracking-tighter">
                                                    {rank}<span className="text-sm font-bold ml-0.5">{rank === 1 ? 'er' : 'ème'}</span>
                                                </p>
                                                <span className="text-sm font-bold text-slate-400">sur {totalStudents || '?'} élèves</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <motion.div 
                                    whileHover={{ scale: 1.05 }}
                                    className="h-32 w-32 border-4 border-white rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/20 bg-white flex items-center justify-center flex-shrink-0"
                                >
                                    {student.photoURL ? (
                                        <img
                                            src={student.photoURL}
                                            alt={student.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="text-[10px] font-black text-center p-2 text-slate-300">PHOTO NON DISPONIBLE</div>
                                    )}
                                </motion.div>
                            </div>
                        </div>

                        {/* Grades Table */}
                        <div className="bg-white/50 backdrop-blur-md rounded-[2.5rem] border border-white/60 shadow-xl shadow-slate-200/40 overflow-hidden mb-10">
                            <Table>
                                <TableHeader className="bg-slate-900/5">
                                    <TableRow className="hover:bg-transparent border-b border-slate-900/10">
                                        <TableHead className="p-6 font-black text-slate-500 uppercase text-[10px] tracking-[0.2em]">Matières & Enseignants</TableHead>
                                        <TableHead className="p-6 text-center font-black text-slate-500 uppercase text-[10px] tracking-[0.2em]">Coeff.</TableHead>
                                        <TableHead className="p-6 text-center font-black text-slate-500 uppercase text-[10px] tracking-[0.2em]">Moy. Élève</TableHead>
                                        <TableHead className="p-6 text-center font-black text-slate-500 uppercase text-[10px] tracking-[0.2em] hidden sm:table-cell">Moy. Classe</TableHead>
                                        <TableHead className="p-6 font-black text-slate-500 uppercase text-[10px] tracking-[0.2em]">Appréciations & Analyse IA</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {subjectReports.map((report, idx) => {
                                        const totalCoeffs = grades.filter(g => g.subject === report.subject).reduce((sum, g) => sum + g.coefficient, 0);
                                        const isGenerating = subjectAppreciations[report.subject]?.isGenerating;
                                        return (
                                            <TableRow key={report.subject} className="group hover:bg-indigo-50/30 transition-all duration-300 border-b border-slate-900/5 last:border-0">
                                                <TableCell className="p-6">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-black text-slate-800 tracking-tight">{report.subject}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{report.teacherName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="p-6 text-center font-black text-slate-500">{totalCoeffs}</TableCell>
                                                <TableCell className="p-6 text-center">
                                                    <Badge className={cn(
                                                        "text-lg font-black tracking-tighter px-4 py-1 rounded-xl shadow-sm border",
                                                        report.average >= 15 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                                        report.average >= 10 ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                                        "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                                    )}>
                                                        {report.average.toFixed(2)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="p-6 text-center font-bold text-slate-400 hidden sm:table-cell">{report.classAverage.toFixed(2)}</TableCell>
                                                <TableCell className="p-6">
                                                    <div className="flex items-start gap-3">
                                                        <p className="text-xs font-medium text-slate-600 leading-relaxed italic flex-1">
                                                            {report.appreciation || <span className="text-slate-300">En attente d&apos;appréciation...</span>}
                                                        </p>
                                                        {canManageGrades && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-xl bg-slate-100/50 hover:bg-indigo-600 hover:text-white transition-all duration-300 no-print flex-shrink-0"
                                                                onClick={() => handleGenerateComment(report.subject, report.teacherName, report.average)}
                                                                disabled={isGenerating}
                                                            >
                                                                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Analysis & Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                            <div className="md:col-span-1 bg-indigo-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-indigo-200 border-t border-indigo-400/30 flex flex-col justify-center gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em]">Moyenne Générale</p>
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-5xl font-black tracking-tighter">{generalAverage.toFixed(2)}</h3>
                                        <span className="text-xl font-bold opacity-60">/ 20</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em]">Appréciation Générale</p>
                                    <p className="text-2xl font-black tracking-tight">{getMention(generalAverage).toUpperCase()}</p>
                                </div>
                            </div>

                            <div className="md:col-span-2 bg-white/60 backdrop-blur-md rounded-[2rem] p-8 border border-white/60 shadow-xl shadow-slate-200/30 flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Avis Global du Conseil de Classe</p>
                                    {canManageGrades && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => handleOpenFormDialog ? undefined : handleGenerateComment()} 
                                            disabled={isGeneratingCouncilComment} 
                                            className="no-print h-8 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all font-black text-[10px] px-4"
                                        >
                                            {isGeneratingCouncilComment ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Bot className="mr-2 h-3 w-3" />}
                                            {isGeneratingCouncilComment ? "Génération..." : "Intelligence Artificielle"}
                                        </Button>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-center">
                                    <p className="text-slate-600 italic leading-relaxed font-medium">
                                        &quot;{councilComment}&quot;
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="mt-16 grid grid-cols-2 gap-12 text-center print-break-inside-avoid border-t-2 border-slate-900/5 pt-12 pb-12">
                            <div className="space-y-24">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visa</p>
                                    <p className="font-black text-slate-800">Le Professeur Principal</p>
                                </div>
                                <p className="font-bold text-sm text-slate-500">{mainTeacher ? `${mainTeacher.firstName} ${mainTeacher.lastName}` : '.........................................'}</p>
                            </div>
                            <div className="space-y-24">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visa & Cachet</p>
                                    <p className="font-black text-slate-800">Le Directeur de l&apos;École</p>
                                </div>
                                <p className="font-bold text-sm text-slate-500">{school.directorName || '.........................................'}</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest text-center mt-12 opacity-30">Document certifié et généré par le système GèreEcole</p>
                    </div>
                    <div className="mt-10 flex justify-end gap-3 no-print">
                        <Button 
                            onClick={handlePrint}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl h-14 px-8 shadow-2xl shadow-slate-900/20 transition-all duration-300 hover:-translate-y-1"
                        >
                            <Printer className="mr-3 h-5 w-5" />
                            Imprimer le Bulletin
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};
