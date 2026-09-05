'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getCountryByCode, CountryCode } from '@/lib/countries-data';
import { student as Student, school as School, class_type as Class } from '@/lib/data-types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Extension pour TypeScript
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

export class ClassListReportService {
    /**
     * Génère la liste des élèves d'une classe au format PDF
     */
    static generateClassListPDF(
        school: School,
        classData: Class,
        students: Student[],
        schoolLogo?: string | null
    ) {
        const doc = new jsPDF();
        const pageWidth = 210;
        const country = school.country ? getCountryByCode(school.country as CountryCode) : null;
        let currentY = 15;

        // 1. En-tête Officiel National
        if (country) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            
            // Gauche : Pays & Devise
            doc.text(country.officialName, 15, currentY);
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.text(country.motto, 15, currentY + 5);
            
            // Droite : Ministère
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            const ministryLines = doc.splitTextToSize(country.ministryName, 70);
            doc.text(ministryLines, pageWidth - 15, currentY, { align: 'right' });
            
            currentY = currentY + 20;
        }

        // 2. Bannière de l'École (Couleur Hyper-Premium Blue-600)
        doc.setFillColor(37, 99, 235); // #2563EB
        doc.rect(15, currentY, 180, 25, 'F');
        
        if (schoolLogo) {
            try {
                doc.addImage(schoolLogo, 'PNG', 20, currentY + 2, 20, 20);
            } catch (e) {
                console.error("Error adding logo:", e);
            }
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(school.name.toUpperCase(), pageWidth / 2, currentY + 12, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Année Académique ${classData.academicYear || "En cours"}`, pageWidth / 2, currentY + 19, { align: 'center' });

        currentY += 40;

        // 3. Titre du Document & Infos
        doc.setTextColor(37, 99, 235);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(`LISTE DES ÉLÈVES - ${classData.name.toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(`Date d'édition : ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - 20, currentY + 5, { align: 'right' });

        currentY += 15;

        // Informations additionnelles
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Effectif Total : ${students.length}`, 15, currentY);
        if (classData.mainTeacherName) {
            doc.text(`Professeur Principal : ${classData.mainTeacherName}`, 15, currentY + 5);
        }

        currentY += 15;

        // 4. Tableau des Élèves
        const activeStudents = students
            .filter(s => s.status === 'Actif' || s.status === 'En attente')
            .sort((a, b) => a.lastName.localeCompare(b.lastName));

        const tableBody = activeStudents.map((s, index) => [
            (index + 1).toString(),
            s.matricule || 'N/A',
            s.lastName.toUpperCase(),
            s.firstName,
            s.gender === 'F' ? 'Fille' : (s.gender === 'M' ? 'Garçon' : 'N/A'),
            '' // Colonne pour l'observation ou pointage
        ]);

        if (tableBody.length === 0) {
            tableBody.push(['', '', 'Aucun élève inscrit dans cette classe', '', '', '']);
        }

        (doc as any).autoTable({
            startY: currentY,
            head: [['N°', 'MATRICULE', 'NOM', 'PRÉNOM(S)', 'SEXE', 'OBSERVATION']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235], fontSize: 9, halign: 'center' },
            bodyStyles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
                1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
                2: { cellWidth: 45 },
                3: { cellWidth: 50 },
                4: { cellWidth: 15, halign: 'center' },
                5: { cellWidth: 35 } // observation vide
            },
            margin: { left: 15, right: 15 },
            didDrawPage: function (data: any) {
                // Footer
                doc.setFontSize(8);
                doc.setFont("helvetica", "italic");
                doc.setTextColor(100, 100, 100);
                doc.text(
                    `Généré par GèreEcole - Page ${data.pageNumber}`,
                    pageWidth / 2,
                    285,
                    { align: 'center' }
                );
            }
        });

        // Sauvegarde
        const sanitizedClassName = classData.name.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `Liste_${sanitizedClassName}.pdf`;
        doc.save(fileName);
    }
}
