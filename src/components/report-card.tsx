
'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Bot, Printer } from 'lucide-react';
import { generateReportCardComment } from '@/ai/flows/generate-report-card-comment';
import { useToast } from '@/hooks/use-toast';
import { useSchoolData } from '@/hooks/use-school-data';
import type { teacher as Teacher } from '@/lib/data-types';

// --- Interfaces ---
interface Student {
  name: string;
  matricule?: string;
  class?: string;
}

interface School {
  name: string;
  directorName?: string;
  address?: string; // Supposons que ces champs peuvent exister
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
  student: Student;
  school: School;
  grades: Grade[];
  teachers: (Teacher & { id: string })[]; // Liste de tous les enseignants
}

export const ReportCard: React.FC<ReportCardProps> = ({ student, school, grades, teachers }) => {
    const { toast } = useToast();
    const printRef = React.useRef<HTMLDivElement>(null);
    const { directorName } = useSchoolData();

    const [councilComment, setCouncilComment] = useState("Excellent trimestre pour Rafael. Au delà de ses très bons résultats homogènes, Rafael fait preuve d'une maturité et d'une autonomie très favorables à la poursuite de sa réussite académique. Bravo!");
    const [isGeneratingComment, setIsGeneratingComment] = useState(false);

    const { subjectReports, generalAverage } = useMemo(() => {
        const reports: SubjectReport[] = [];
        let totalPoints = 0;
        let totalCoeffs = 0;

        const subjects = [...new Set(grades.map(g => g.subject))];

        subjects.forEach(subject => {
            const subjectGrades = grades.filter(g => g.subject === subject);
            if (subjectGrades.length === 0) return;

            const studentTotalPoints = subjectGrades.reduce((acc, g) => acc + g.grade * g.coefficient, 0);
            const studentTotalCoeffs = subjectGrades.reduce((acc, g) => acc + g.coefficient, 0);
            const studentAverage = studentTotalCoeffs > 0 ? studentTotalPoints / studentTotalCoeffs : 0;
            
            const teacher = teachers.find(t => t.subject === subject);

            reports.push({
                subject,
                teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'N/A',
                average: studentAverage,
                // Mock data for class stats as we don't have them yet
                classMin: studentAverage > 2 ? studentAverage - 1.5 : studentAverage * 0.8,
                classMax: studentAverage < 19 ? studentAverage + 1.2 : 20,
                classAverage: studentAverage < 19.5 ? studentAverage + 0.5 : 20,
                appreciation: `Trimestre solide en ${subject}.`
            });

            totalPoints += studentAverage * studentTotalCoeffs;
            totalCoeffs += studentTotalCoeffs;
        });

        reports.sort((a,b) => b.average - a.average);

        const finalAverage = totalCoeffs > 0 ? totalPoints / totalCoeffs : 0;

        return { subjectReports: reports, generalAverage: finalAverage };
    }, [grades, teachers]);

    const handleGenerateComment = async () => {
        setIsGeneratingComment(true);
        try {
            const gradesSummary = subjectReports
                .map(r => `${r.subject}: ${r.average.toFixed(2)}/20`)
                .join(', ');

            const result = await generateReportCardComment({
                studentName: student.name,
                grades: gradesSummary,
                teacherName: "Le Conseil de Classe",
            });
            setCouncilComment(result.comment);
            toast({ title: "Appréciation générée", description: "L'appréciation du conseil de classe a été mise à jour." });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de générer l'appréciation." });
        } finally {
            setIsGeneratingComment(false);
        }
    };
    
    const handlePrint = () => {
        const printContent = printRef.current?.innerHTML;
        const pageStyles = `
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .no-print {
                    display: none !important;
                }
                 .report-card {
                    border: none;
                    box-shadow: none;
                }
            }
        `;

        if (printContent) {
            const printWindow = window.open('', '', 'height=800,width=800');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Bulletin de Notes</title>');
                printWindow.document.write('<link rel="stylesheet" href="/_next/static/css/app/layout.css" type="text/css" media="print">');
                printWindow.document.write(`<style>${pageStyles}</style>`);
                printWindow.document.write('</head><body>');
                printWindow.document.write(printContent);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.focus();
                
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 250);
            }
        }
    };


  return (
    <Card className="report-card">
      <CardContent className="p-4 sm:p-6">
        <div ref={printRef}>
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b-2 border-primary mb-6">
                <div className="flex items-center gap-4">
                     {school.mainLogoUrl && <img src={school.mainLogoUrl} alt={school.name} className="h-16 w-16 object-contain" />}
                    <div>
                        <h2 className="text-xl font-bold">{school.name || "Nom de l'école"}</h2>
                        <p className="text-xs text-muted-foreground">{school.address || "Adresse de l'école"}</p>
                        <p className="text-xs text-muted-foreground">
                            Tél: {school.phone || "N/A"} - Site: {school.website || "N/A"}
                        </p>
                    </div>
                </div>
                <div className="flex-shrink-0">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={`https://picsum.photos/seed/${student.matricule}/100`} alt={student.name} data-ai-hint="student portrait" />
                        <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </div>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold tracking-tight">BULLETIN DE NOTES DU 1ER TRIMESTRE</h1>
                <p className="text-muted-foreground">Année scolaire: {new Date().getFullYear() - 1}-{new Date().getFullYear()}</p>
            </div>

            {/* Student Info */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-6 text-sm">
                <div><span className="font-semibold">Nom & Prénoms :</span> {student.name}</div>
                <div><span className="font-semibold">Matricule :</span> {student.matricule || 'N/A'}</div>
                <div><span className="font-semibold">Classe :</span> {student.class || 'N/A'}</div>
            </div>

            {/* Grades Table */}
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted">
                            <TableHead className="font-bold">Matières</TableHead>
                            <TableHead className="text-center font-bold">Coeff.</TableHead>
                            <TableHead className="text-center font-bold">Moy /20</TableHead>
                            <TableHead className="text-center font-bold hidden sm:table-cell">Min</TableHead>
                            <TableHead className="text-center font-bold hidden sm:table-cell">Max</TableHead>
                            <TableHead className="text-center font-bold hidden sm:table-cell">Moy Classe</TableHead>
                            <TableHead className="font-bold">Appréciations</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {subjectReports.map((report) => {
                            const totalCoeffs = grades.filter(g => g.subject === report.subject).reduce((sum, g) => sum + g.coefficient, 0);
                            return (
                                <TableRow key={report.subject}>
                                    <TableCell>
                                        <p className="font-semibold">{report.subject}</p>
                                        <p className="text-xs text-muted-foreground">{report.teacherName}</p>
                                    </TableCell>
                                    <TableCell className="text-center font-mono">{totalCoeffs}</TableCell>
                                    <TableCell className="text-center font-mono font-bold">{report.average.toFixed(2)}</TableCell>
                                    <TableCell className="text-center font-mono hidden sm:table-cell">{report.classMin.toFixed(2)}</TableCell>
                                    <TableCell className="text-center font-mono hidden sm:table-cell">{report.classMax.toFixed(2)}</TableCell>
                                    <TableCell className="text-center font-mono hidden sm:table-cell">{report.classAverage.toFixed(2)}</TableCell>
                                    <TableCell className="text-xs italic">{report.appreciation}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Summary */}
            <div className="mt-6 p-3 bg-slate-700 text-white rounded-md grid grid-cols-2 gap-4">
                <div className="flex justify-between items-center">
                    <span className="font-bold">Moyenne générale :</span>
                    <span className="text-lg font-bold">{generalAverage.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between items-center">
                    <span className="font-bold">Nombre de demi-journée d'absence :</span>
                    <span className="text-lg font-bold">0</span>
                </div>
            </div>

             {/* Mention and Council Comments */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="md:col-span-1 p-3 bg-muted rounded-md">
                    <p className="font-bold mb-1">Mention</p>
                    <p className="text-lg font-semibold text-primary">{getMention(generalAverage)}</p>
                </div>
                 <div className="md:col-span-2 p-3 bg-muted rounded-md">
                    <div className="flex justify-between items-start">
                        <p className="font-bold mb-1">Appréciations du conseil de classe</p>
                        <Button variant="ghost" size="sm" onClick={handleGenerateComment} disabled={isGeneratingComment} className="no-print">
                             <Bot className="mr-2 h-4 w-4" />
                            {isGeneratingComment ? "Génération..." : "Générer"}
                        </Button>
                    </div>
                    <p className="italic text-xs">{councilComment}</p>
                </div>
            </div>
             {/* Footer with signatures */}
             <div className="mt-16 flex justify-between items-end text-center text-xs">
                <div>
                    <p className="font-bold">Le Professeur Principal</p>
                    <div className="mt-12 border-t border-dashed w-40 mx-auto"></div>
                </div>
                 <div>
                    <p>Fait à {school.address ? school.address.split(',')[0] : 'Abidjan'}, le {new Date().toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                    <p className="font-bold">Le Directeur</p>
                     <div className="mt-12 border-t border-dashed w-40 mx-auto"></div>
                     <p>{directorName || school.directorName}</p>
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

    