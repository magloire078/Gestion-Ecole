

'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Bot, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { staff as Staff, student as Student, class_type as Class } from '@/lib/data-types';
import { useHydrationFix } from '@/hooks/use-hydration-fix';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { SafeImage } from './ui/safe-image';


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
    const isMounted = useHydrationFix();
    const { toast } = useToast();
    const printRef = useRef<HTMLDivElement>(null);
    const firestore = useFirestore();

    const [councilComment, setCouncilComment] = useState("Excellent trimestre. Élève sérieux et motivé qui a fourni un travail de qualité. Les résultats sont très satisfaisants. Félicitations du conseil de classe.");
    const [isGeneratingCouncilComment, setIsGeneratingCouncilComment] = useState(false);
    
    const [subjectAppreciations, setSubjectAppreciations] = useState<Record<string, {text: string, isGenerating: boolean}>>({});


    // Fetch the student's class to get the mainTeacherId
    const classRef = useMemoFirebase(() =>
        (student.schoolId && student.classId) ? doc(firestore, `ecoles/${student.schoolId}/classes/${student.classId}`) : null
    , [firestore, student.schoolId, student.classId]);
    const { data: classData } = useDoc<Class>(classRef);

    // Get the main teacher for the class
    const mainTeacher = useMemo(() => {
        if (!classData?.mainTeacherId || !teachers) return null;
        return teachers.find(t => t.id === classData.mainTeacherId) || null;
    }, [classData, teachers]);

    const { subjectReports, generalAverage, totalCoefficients } = useMemo(() => {
        const reports: SubjectReport[] = [];
        let totalPoints = 0;
        let totalCoeffs = 0;

        const subjects = [...new Set(grades.map(g => g.subject))];
        const studentCycle = student.cycle;
        const isPrimaryOrMaternelle = studentCycle === "Maternelle" || studentCycle === "Enseignement Primaire";

        subjects.forEach(subject => {
            const subjectGrades = grades.filter(g => g.subject === subject);
            if (subjectGrades.length === 0) return;

            const studentTotalPoints = subjectGrades.reduce((acc, g) => acc + g.grade * g.coefficient, 0);
            const studentTotalCoeffs = subjectGrades.reduce((acc, g) => acc + g.coefficient, 0);
            const studentAverage = studentTotalCoeffs > 0 ? studentTotalPoints / studentTotalCoeffs : 0;
            
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
                appreciation: subjectAppreciations[subject]?.text || `Trimestre solide en ${subject}.`
            });

            totalPoints += studentAverage * studentTotalCoeffs;
            totalCoeffs += studentTotalCoeffs;
        });

        reports.sort((a,b) => b.average - a.average);

        const finalAverage = totalCoeffs > 0 ? totalPoints / totalCoeffs : 0;

        return { subjectReports: reports, generalAverage: finalAverage, totalCoefficients: totalCoeffs };
    }, [grades, teachers, mainTeacher, student.cycle, subjectAppreciations]);

    const handleGenerateComment = async (subject?: string, teacherName?: string, average?: number) => {
        const isCouncilComment = !subject;

        if (isCouncilComment) {
            setIsGeneratingCouncilComment(true);
        } else {
             setSubjectAppreciations(prev => ({...prev, [subject!]: { text: '', isGenerating: true }}));
        }
        
        toast({ title: "Fonctionnalité indisponible", description: "La génération de commentaires par IA a été temporairement désactivée." });

        if (isCouncilComment) {
            setIsGeneratingCouncilComment(false);
        } else {
            setSubjectAppreciations(prev => ({...prev, [subject!]: { ...prev[subject!], isGenerating: false }}));
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
                     {school.mainLogoUrl && <SafeImage src={school.mainLogoUrl} alt={school.name} width={80} height={80} className="object-contain" />}
                    <div>
                        <h2 className="text-2xl font-bold uppercase">{school.name || "Nom de l'école"}</h2>
                        <p className="text-xs text-muted-foreground">{school.address || "Adresse de l'école"}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p>Année scolaire: {isMounted ? `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`: '...'}</p>
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
                    <SafeImage src={student.photoUrl} alt={student.name} width={80} height={80} data-ai-hint="student portrait" className="rounded-full" />
                    <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}</AvatarFallback>
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
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-5 w-5 no-print"
                                                onClick={() => handleGenerateComment(report.subject, report.teacherName, report.average)}
                                                disabled={isGenerating}
                                            >
                                                <Bot className="h-3 w-3" />
                                            </Button>
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
                        <Button variant="ghost" size="sm" onClick={() => handleGenerateComment()} disabled={isGeneratingCouncilComment} className="no-print">
                             <Bot className="mr-2 h-4 w-4" />
                            {isGeneratingCouncilComment ? "Génération..." : "Générer"}
                        </Button>
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
