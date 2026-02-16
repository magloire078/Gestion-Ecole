'use client';

import { Firestore, collection, getDocs, query, where } from 'firebase/firestore';
import { GradeEntry } from './grades-service';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extension pour TypeScript
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

export interface SubjectAverage {
    subject: string;
    average: number;
    coefficient: number;
    grades: GradeEntry[];
}

export interface ClassSubjectStats {
    subject: string;
    classAverage: number;
    minGrade: number;
    maxGrade: number;
}

export interface ReportCardData {
    studentId: string;
    studentName: string;
    className: string;
    schoolYear: string;
    term: string;
    subjectAverages: SubjectAverage[];
    generalAverage: number;
    totalCoefficients: number;
    rank?: number;
    totalStudents?: number;
    classStats?: Record<string, ClassSubjectStats>;
}

export class ReportCardService {
    constructor(private firestore: Firestore) { }

    /**
     * Calcule les moyennes d'un élève pour une période donnée.
     */
    async calculateStudentAverages(schoolId: string, studentId: string, startDate?: string, endDate?: string): Promise<SubjectAverage[]> {
        try {
            const gradesRef = collection(this.firestore, `ecoles/${schoolId}/eleves/${studentId}/notes`);
            const querySnapshot = await getDocs(gradesRef);

            const grades: GradeEntry[] = [];
            querySnapshot.forEach(doc => {
                const data = doc.data() as GradeEntry;
                const { id, ...rest } = data;
                // Filtrage par date si spécifié
                if (startDate && endDate && data.date) {
                    if (data.date >= startDate && data.date <= endDate) {
                        grades.push({ id: doc.id, ...rest });
                    }
                } else {
                    grades.push({ id: doc.id, ...rest });
                }
            });

            // Grouper par matière
            const groupedBySubject: Record<string, GradeEntry[]> = {};
            grades.forEach(grade => {
                if (!groupedBySubject[grade.subject]) {
                    groupedBySubject[grade.subject] = [];
                }
                groupedBySubject[grade.subject].push(grade);
            });

            // Calculer la moyenne par matière
            const subjectAverages: SubjectAverage[] = Object.keys(groupedBySubject).map(subject => {
                const subjectGrades = groupedBySubject[subject];
                const totalPoints = subjectGrades.reduce((acc, g) => acc + (g.grade), 0);
                const avg = subjectGrades.length > 0 ? totalPoints / subjectGrades.length : 0;

                // Utiliser le coefficient du dernier devoir saisi ou 1 par défaut
                const coef = subjectGrades[0]?.coefficient || 1;

                return {
                    subject,
                    average: parseFloat(avg.toFixed(2)),
                    coefficient: coef,
                    grades: subjectGrades
                };
            });

            return subjectAverages;
        } catch (error) {
            console.error("Error calculating averages:", error);
            throw error;
        }
    }

    /**
     * Calcule les statistiques de toute la classe
     */
    async getClassStatistics(schoolId: string, classId: string, startDate?: string, endDate?: string): Promise<{
        classStats: Record<string, ClassSubjectStats>;
        studentRanks: Record<string, { rank: number, average: number }>;
        totalStudents: number;
    }> {
        try {
            // 1. Récupérer tous les élèves de la classe
            const studentsRef = collection(this.firestore, `ecoles/${schoolId}/eleves`);
            const q = query(studentsRef, where('classId', '==', classId), where('status', '==', 'Actif'));
            const studentsSnapshot = await getDocs(q);

            // 2. Pour chaque élève, calculer ses moyennes en parallèle
            const studentAveragesPromises = studentsSnapshot.docs.map(async (studentDoc) => {
                const averages = await this.calculateStudentAverages(schoolId, studentDoc.id, startDate, endDate);
                const { average: generalAvg } = this.calculateGeneralAverage(averages);
                return { id: studentDoc.id, averages, generalAvg };
            });

            const studentDataList = await Promise.all(studentAveragesPromises);

            // 3. Calculer les rangs
            const sortedByAvg = [...studentDataList].sort((a, b) => b.generalAvg - a.generalAvg);
            const studentRanks: Record<string, { rank: number, average: number }> = {};
            sortedByAvg.forEach((s, index) => {
                studentRanks[s.id] = { rank: index + 1, average: s.generalAvg };
            });

            // 4. Calculer les stats par matière (Moyenne classe, Min, Max)
            const subjectStatsCollector: Record<string, number[]> = {};

            studentDataList.forEach(student => {
                student.averages.forEach(sa => {
                    if (!subjectStatsCollector[sa.subject]) {
                        subjectStatsCollector[sa.subject] = [];
                    }
                    subjectStatsCollector[sa.subject].push(sa.average);
                });
            });

            const classStats: Record<string, ClassSubjectStats> = {};
            Object.keys(subjectStatsCollector).forEach(subject => {
                const grades = subjectStatsCollector[subject];
                const sum = grades.reduce((acc, g) => acc + g, 0);
                classStats[subject] = {
                    subject,
                    classAverage: parseFloat((sum / grades.length).toFixed(2)),
                    minGrade: Math.min(...grades),
                    maxGrade: Math.max(...grades)
                };
            });

            return {
                classStats,
                studentRanks,
                totalStudents: studentDataList.length
            };
        } catch (error) {
            console.error("Error calculating class statistics:", error);
            throw error;
        }
    }

    /**
     * Calcule la moyenne générale
     */
    calculateGeneralAverage(subjectAverages: SubjectAverage[]): { average: number; totalPoints: number; totalCoef: number } {
        let totalWeightedPoints = 0;
        let totalCoef = 0;

        subjectAverages.forEach(sa => {
            totalWeightedPoints += sa.average * sa.coefficient;
            totalCoef += sa.coefficient;
        });

        const generalAvg = totalCoef > 0 ? totalWeightedPoints / totalCoef : 0;

        return {
            average: parseFloat(generalAvg.toFixed(2)),
            totalPoints: parseFloat(totalWeightedPoints.toFixed(2)),
            totalCoef
        };
    }

    /**
     * Génère le bulletin PDF
     */
    generatePDF(data: ReportCardData, schoolName: string, schoolLogo?: string | null, directorSignature?: string | null) {
        const doc = new jsPDF();
        const stats = this.calculateGeneralAverage(data.subjectAverages);

        // Header
        doc.setFillColor(12, 54, 90); // #0C365A
        doc.rect(0, 0, 210, 40, 'F');

        if (schoolLogo) {
            try {
                doc.addImage(schoolLogo, 'PNG', 15, 5, 30, 30);
            } catch (e) {
                console.error("Error adding logo to PDF:", e);
            }
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text(schoolName.toUpperCase(), 105, 15, { align: 'center' });

        doc.setFontSize(10);
        doc.text("BULLETIN DE NOTES", 105, 25, { align: 'center' });
        doc.text(`${data.term} - Année Scolaire ${data.schoolYear}`, 105, 32, { align: 'center' });

        // Student Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Élève : ${data.studentName}`, 15, 55);
        doc.setFont("helvetica", "normal");
        doc.text(`Classe : ${data.className}`, 15, 62);

        if (data.rank) {
            doc.text(`Rang : ${data.rank}${data.rank === 1 ? 'er' : 'ème'}`, 150, 55);
        }

        // Grades Table
        const tableBody = data.subjectAverages.map(sa => [
            sa.subject,
            sa.coefficient.toString(),
            sa.average.toString(),
            (sa.average * sa.coefficient).toFixed(2)
        ]);

        (doc as any).autoTable({
            startY: 75,
            head: [['MATIÈRE', 'COEFF', 'MOYENNE / 20', 'TOTAL PONDÉRÉ']],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [12, 54, 90] },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { halign: 'center' },
                2: { halign: 'center' },
                3: { halign: 'right' }
            },
            margin: { left: 15, right: 15 }
        });

        // Summary
        const lastY = (doc as any).lastAutoTable.finalY + 10;

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Total des Points : ${stats.totalPoints} / ${stats.totalCoef * 20}`, 130, lastY);
        doc.text(`Moyenne Générale : ${stats.average} / 20`, 130, lastY + 7);

        // Footer / Signatures
        const footerY = 250;
        doc.line(15, footerY, 195, footerY);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Le Parent", 30, footerY + 10);
        doc.text("Le Titulaire", 90, footerY + 10);
        doc.text("Le Directeur", 160, footerY + 10);

        if (directorSignature) {
            try {
                doc.addImage(directorSignature, 'PNG', 155, footerY + 12, 40, 20);
            } catch (e) {
                console.error("Error adding signature to PDF:", e);
            }
        }

        // Save
        const fileName = `Bulletin_${data.studentName.replace(/\s+/g, '_')}_${data.term}.pdf`;
        doc.save(fileName);
    }
}
