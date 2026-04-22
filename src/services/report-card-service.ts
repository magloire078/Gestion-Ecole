'use client';

import { Firestore, collection, getDocs, query, where } from 'firebase/firestore';
import { GradeEntry } from './grades-service';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getCountryByCode, CountryCode } from '@/lib/countries-data';

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
    classStats?: Record<string, {
        classAverage: number;
        minGrade: number;
        maxGrade: number;
    }>;
    absencesCount?: number;
    justifiedAbsencesCount?: number;
    comments?: string;
}

export class ReportCardService {
    constructor(private firestore: Firestore) { }

    /**
     * Compte les absences d'un élève pour une période donnée
     */
    async countStudentAbsences(schoolId: string, studentId: string, startDate?: string, endDate?: string) {
        try {
            const absencesRef = collection(this.firestore, `ecoles/${schoolId}/eleves/${studentId}/absences`);
            const q = startDate && endDate 
                ? query(absencesRef, where('date', '>=', startDate), where('date', '<=', endDate))
                : query(absencesRef);
            
            const snap = await getDocs(q);
            const absences = snap.docs.map(doc => doc.data());
            
            return {
                total: absences.length,
                justified: absences.filter(a => a.justified === true).length,
                unjustified: absences.filter(a => a.justified !== true).length
            };
        } catch (error) {
            console.error("Error counting absences:", error);
            return { total: 0, justified: 0, unjustified: 0 };
        }
    }

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
    generatePDF(
        data: ReportCardData, 
        schoolName: string, 
        schoolLogo?: string | null, 
        directorSignature?: string | null,
        countryCode?: string,
        regionName?: string
    ) {
        const doc = new jsPDF();
        const stats = this.calculateGeneralAverage(data.subjectAverages);
        const country = countryCode ? getCountryByCode(countryCode as CountryCode) : null;

        // Header Structure
        const pageWidth = 210;
        let currentY = 15;

        // 1. Official National Header (Left & Right)
        if (country) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            
            // Left Side: Republic & Motto
            doc.text(country.officialName, 15, currentY);
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.text(country.motto, 15, currentY + 5);
            
            // Right Side: Ministry & Authority
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            const ministryLines = doc.splitTextToSize(country.ministryName, 70);
            doc.text(ministryLines, pageWidth - 15, currentY, { align: 'right' });
            
            let authorityY = currentY + (ministryLines.length * 4);
            doc.setFont("helvetica", "normal");
            doc.text(`${country.educationAuthorityLabel} :`, pageWidth - 15, authorityY, { align: 'right' });
            if (regionName) {
                doc.setFont("helvetica", "bold");
                doc.text(regionName.toUpperCase(), pageWidth - 15, authorityY + 4, { align: 'right' });
            }
            
            currentY = authorityY + 15;
        }

        // 2. School Info Section (Banner-like)
        doc.setFillColor(12, 54, 90); // #0C365A
        doc.rect(15, currentY, 180, 25, 'F');
        
        if (schoolLogo) {
            try {
                doc.addImage(schoolLogo, 'PNG', 20, currentY + 2, 20, 20);
            } catch (e) {
                console.error("Error adding logo to PDF:", e);
            }
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(schoolName.toUpperCase(), pageWidth / 2, currentY + 12, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`ANNEE SCOLAIRE ${data.schoolYear}`, pageWidth / 2, currentY + 19, { align: 'center' });

        currentY += 35;

        // 3. Document Title
        doc.setTextColor(12, 54, 90);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`BULLETIN DE NOTES - ${data.term.toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
        
        currentY += 15;

        // 4. Student Details Card
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(15, currentY, 180, 25, 3, 3);
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Nom et Prénoms :", 20, currentY + 10);
        doc.setFont("helvetica", "bold");
        doc.text(data.studentName.toUpperCase(), 55, currentY + 10);
        
        doc.setFont("helvetica", "normal");
        doc.text("Classe :", 20, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.text(data.className, 55, currentY + 18);

        if (data.rank) {
            doc.setFont("helvetica", "normal");
            doc.text("Rang :", 140, currentY + 10);
            doc.setFont("helvetica", "bold");
            doc.text(`${data.rank}${data.rank === 1 ? 'er' : 'ème'}${data.totalStudents ? ` / ${data.totalStudents}` : ''}`, 155, currentY + 10);
        }

        currentY += 35;

        // 5. Grades Table
        const tableBody = data.subjectAverages.map(sa => {
            const row = [
                sa.subject,
                sa.coefficient.toString(),
                sa.average.toString(),
            ];

            // Add class stats if available
            if (data.classStats && data.classStats[sa.subject]) {
                const cs = data.classStats[sa.subject];
                row.push(cs.classAverage.toString());
                row.push(cs.minGrade.toString());
                row.push(cs.maxGrade.toString());
            }

            row.push((sa.average * sa.coefficient).toFixed(2));
            return row;
        });

        const headers = ['MATIÈRE', 'COEFF', 'MOY. / 20'];
        if (data.classStats) {
            headers.push('MOY. CL');
            headers.push('MIN');
            headers.push('MAX');
        }
        headers.push('TOTAL');

        (doc as any).autoTable({
            startY: currentY,
            head: [headers],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [12, 54, 90], fontSize: 9, halign: 'center' },
            bodyStyles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 60 },
                1: { halign: 'center' },
                2: { halign: 'center', fontStyle: 'bold' },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center' },
                6: { halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: 15, right: 15 }
        });

        // 6. Final Statistics & Signatures
        currentY = (doc as any).lastAutoTable.finalY + 10;

        // Summary Box
        doc.setDrawColor(12, 54, 90);
        doc.rect(pageWidth - 85, currentY, 70, 20);
        
        doc.setFontSize(10);
        doc.text(`TOTAL POINTS : ${stats.totalPoints} / ${stats.totalCoef * 20}`, pageWidth - 80, currentY + 7);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`MOYENNE GENERALE : ${stats.average} / 20`, pageWidth - 80, currentY + 15);

        // Absences & Comments Section
        currentY += 25;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        
        if (data.absencesCount !== undefined) {
            doc.text(`Assiduité : ${data.absencesCount} absence(s) dont ${data.justifiedAbsencesCount || 0} justifiée(s).`, 15, currentY);
            currentY += 8;
        }

        if (data.comments) {
            doc.setFont("helvetica", "bold");
            doc.text("Observations / Appréciations :", 15, currentY);
            doc.setFont("helvetica", "italic");
            doc.setFontSize(9);
            const commentLines = doc.splitTextToSize(data.comments, 180);
            doc.text(commentLines, 15, currentY + 5);
            currentY += (commentLines.length * 5) + 5;
        }

        currentY += 15;

        // Signatures
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Le Parent", 30, currentY);
        doc.text("Le Titulaire", 90, currentY);
        doc.text("Le Chef d'Établissement", 155, currentY);

        if (directorSignature) {
            try {
                doc.addImage(directorSignature, 'PNG', 150, currentY + 5, 40, 20);
            } catch (e) {
                console.error("Error adding signature to PDF:", e);
            }
        }

        // 6. Footer
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text("Document confidentiel généré par le système GèreEcole.", pageWidth / 2, 285, { align: 'center' });

        // Save
        const fileName = `Bulletin_${data.studentName.replace(/\s+/g, '_')}_${data.term}.pdf`;
        doc.save(fileName);
    }
}
