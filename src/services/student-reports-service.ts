import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { student as Student, class_type as Class } from '@/lib/data-types';

export class StudentReportsService {
    private static async getBase64ImageFromUrl(imageUrl: string): Promise<string> {
        if (!imageUrl) return '';
        try {
            const res = await fetch(imageUrl);
            const blob = await res.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error converting image to base64:', error);
            return '';
        }
    }

    private static addHeader(doc: jsPDF, schoolName: string, title: string, logoBase64: string, academicYear?: string) {
        if (logoBase64) {
            try {
                doc.addImage(logoBase64, 'PNG', 14, 10, 25, 25);
            } catch (e) {
                console.warn('Could not add logo', e);
            }
        }

        // En-tête école
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(schoolName, logoBase64 ? 45 : 14, 18);

        if (academicYear) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Année Académique: ${academicYear}`, logoBase64 ? 45 : 14, 25);
        }

        // Ligne de séparation
        doc.setDrawColor(79, 70, 229); // Indigo 600
        doc.setLineWidth(0.5);
        doc.line(14, 40, doc.internal.pageSize.width - 14, 40);

        // Titre du document
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // Slate 900
        const titleWidth = doc.getTextWidth(title);
        const xTitle = (doc.internal.pageSize.width - titleWidth) / 2;
        doc.text(title, xTitle, 55);

        // Date de génération
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 116, 139); // Slate 500
        const dateStr = `Généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`;
        doc.text(dateStr, doc.internal.pageSize.width - 14 - doc.getTextWidth(dateStr), 35);
    }

    private static addFooter(doc: jsPDF) {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate 400
        
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const str = `Page ${i} sur ${pageCount}`;
            doc.text(str, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        }
    }

    /**
     * Générer la liste des élèves (filtrée par classe ou année)
     */
    static async generateStudentListPdf(
        students: Student[],
        schoolName: string,
        academicYear: string,
        logoUrl?: string,
        className?: string
    ) {
        const doc = new jsPDF('p', 'mm', 'a4');
        const logoBase64 = logoUrl ? await this.getBase64ImageFromUrl(logoUrl) : '';
        const title = className ? `Liste des élèves - ${className}` : 'Liste complète des élèves';

        this.addHeader(doc, schoolName, title, logoBase64, academicYear);

        const tableData = students.map((s, index) => [
            index + 1,
            s.matricule || 'N/A',
            `${s.lastName} ${s.firstName}`,
            s.gender || 'N/A',
            s.class || 'N/A',
            s.status || 'Actif'
        ]);

        autoTable(doc, {
            startY: 65,
            head: [['N°', 'Matricule', 'Nom & Prénom', 'Genre', 'Classe', 'Statut']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [79, 70, 229], // Indigo 600
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { halign: 'center', cellWidth: 30 },
                2: { halign: 'left' },
                3: { halign: 'center', cellWidth: 20 },
                4: { halign: 'center', cellWidth: 30 },
                5: { halign: 'center', cellWidth: 25 },
            },
            styles: {
                fontSize: 9,
                cellPadding: 4,
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Slate 50
            }
        });

        this.addFooter(doc);
        const fileName = `Liste_Eleves_${className ? className.replace(/\s+/g, '_') : 'Complete'}_${academicYear}.pdf`;
        doc.save(fileName);
    }

    /**
     * Générer le rapport de passage de classe (Transition)
     */
    static async generateTransitionReportPdf(
        decisions: Record<string, { status: string, targetClassId: string }>,
        sourceStudents: Student[],
        classes: Class[],
        schoolName: string,
        sourceYear: string,
        targetYear: string,
        logoUrl?: string
    ) {
        const doc = new jsPDF('p', 'mm', 'a4');
        const logoBase64 = logoUrl ? await this.getBase64ImageFromUrl(logoUrl) : '';
        
        this.addHeader(doc, schoolName, 'Rapport de Passage de Classe', logoBase64);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105); // Slate 600
        doc.text(`Année Source : ${sourceYear}`, 14, 65);
        doc.text(`Année Cible : ${targetYear}`, 14, 71);

        const tableData = sourceStudents.map((s, index) => {
            const decision = decisions[s.id!];
            const decisionStatus = decision?.status || 'Non traité';
            const currentClass = classes.find(c => c.id === s.classId)?.name || 'N/A';
            const targetClass = decision?.targetClassId ? classes.find(c => c.id === decision.targetClassId)?.name || 'N/A' : '-';
            
            return [
                index + 1,
                s.matricule || '-',
                `${s.lastName} ${s.firstName}`,
                currentClass,
                decisionStatus,
                targetClass
            ];
        });

        autoTable(doc, {
            startY: 80,
            head: [['N°', 'Matricule', 'Nom & Prénom', 'Classe Origine', 'Décision', 'Classe Cible']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [79, 70, 229], // Indigo 600
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { halign: 'center', cellWidth: 25 },
                2: { halign: 'left' },
                3: { halign: 'center', cellWidth: 35 },
                4: { halign: 'center', cellWidth: 30 },
                5: { halign: 'center', cellWidth: 35 },
            },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 4) {
                    const status = data.cell.raw;
                    if (status === 'Promu') {
                        data.cell.styles.textColor = [5, 150, 105]; // Emerald 600
                        data.cell.styles.fontStyle = 'bold';
                    } else if (status === 'Redoublant') {
                        data.cell.styles.textColor = [217, 119, 6]; // Amber 600
                        data.cell.styles.fontStyle = 'bold';
                    } else if (status === 'Radié') {
                        data.cell.styles.textColor = [225, 29, 72]; // Rose 600
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            },
            styles: {
                fontSize: 9,
                cellPadding: 4,
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Slate 50
            }
        });

        this.addFooter(doc);
        const fileName = `Rapport_Transition_${sourceYear}_vers_${targetYear}.pdf`;
        doc.save(fileName);
    }
}
