'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { student as Student, class_type as Class, school as School, payment as Payment } from '@/lib/data-types';
import { format } from 'date-fns';

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

export interface StudentWithPayments extends Student {
    paymentHistory: Payment[];
}

export class FinancialReportsService {
    /**
     * Génère un bilan financier par classe au format PDF
     */
    static generateClassFinancialReportPdf(
        school: School,
        classData: Class,
        students: StudentWithPayments[],
        schoolLogo?: string | null,
        filter: 'all' | 'paid' | 'unpaid' = 'all'
    ) {
        // Mode paysage pour avoir plus de place pour les colonnes
        const doc = new jsPDF('landscape');
        const pageWidth = doc.internal.pageSize.width;
        let currentY = 15;

        // 1. En-tête / Bannière (Hyper-Premium)
        doc.setFillColor(15, 23, 42); // slate-900 pour la finance
        doc.rect(15, currentY, pageWidth - 30, 25, 'F');
        
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

        // 2. Titre du Document
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        
        let reportTitle = `BILAN FINANCIER DES ÉLÈVES - ${classData.name.toUpperCase()}`;
        if (filter === 'paid') reportTitle += ' (SOLDÉS)';
        if (filter === 'unpaid') reportTitle += ' (IMPAYÉS)';
        
        doc.text(reportTitle, pageWidth / 2, currentY, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(`Date d'édition : ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - 20, currentY + 5, { align: 'right' });

        currentY += 15;

        const formatMoney = (amount: number | undefined | null) => {
            if (!amount) return '-';
            return amount.toLocaleString('fr-FR') + ' F';
        };

        // 3. Préparation des données du tableau
        // Trier les élèves par nom
        const sortedStudents = [...students].sort((a, b) => a.lastName.localeCompare(b.lastName));

        let grandTotalScolarite = 0;
        let grandTotalInscription = 0;
        let grandTotalV1 = 0;
        let grandTotalV2 = 0;
        let grandTotalV3 = 0;
        let grandTotalV4 = 0;
        let grandTotalReste = 0;

        let filteredStudents = sortedStudents;

        const tableBody = filteredStudents.map((s) => {
            // Trier les paiements chronologiquement (du plus ancien au plus récent)
            const sortedPayments = [...(s.paymentHistory || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            const scolarite = s.tuitionFee || 0;
            const inscription = sortedPayments[0]?.amount || 0;
            const v1 = sortedPayments[1]?.amount || 0;
            const v2 = sortedPayments[2]?.amount || 0;
            const v3 = sortedPayments[3]?.amount || 0;
            const v4 = sortedPayments[4]?.amount || 0;
            const totalPaid = inscription + v1 + v2 + v3 + v4;
            const reste = Math.max(0, scolarite - totalPaid);

            return { s, scolarite, inscription, v1, v2, v3, v4, reste };
        })
        .filter((item) => {
            if (filter === 'paid') return item.reste === 0;
            if (filter === 'unpaid') return item.reste > 0;
            return true; // 'all'
        })
        .map((item, index) => {
            const { s, scolarite, inscription, v1, v2, v3, v4, reste } = item;

            grandTotalScolarite += scolarite;
            grandTotalInscription += inscription;
            grandTotalV1 += v1;
            grandTotalV2 += v2;
            grandTotalV3 += v3;
            grandTotalV4 += v4;
            grandTotalReste += reste;

            return [
                (index + 1).toString(),
                `${s.firstName} ${s.lastName}`,
                formatMoney(scolarite),
                formatMoney(inscription),
                formatMoney(v1),
                formatMoney(v2),
                formatMoney(v3),
                formatMoney(v4),
                formatMoney(reste),
                '' // OBS
            ];
        });

        if (tableBody.length === 0) {
            tableBody.push(['', 'Aucun élève trouvé', '', '', '', '', '', '', '', '']);
        }

        // 4. Dessiner le tableau
        (doc as any).autoTable({
            startY: currentY,
            head: [['N°', 'NOM ET PRÉNOM(S)', 'SCOLARITÉ', 'INSCRIPTION', '1ER VERS.', '2ÈME VERS.', '3ÈME VERS.', '4ÈME VERS.', 'RESTE', 'OBS']],
            body: tableBody,
            foot: [['', 'TOTAL', formatMoney(grandTotalScolarite), formatMoney(grandTotalInscription), formatMoney(grandTotalV1), formatMoney(grandTotalV2), formatMoney(grandTotalV3), formatMoney(grandTotalV4), formatMoney(grandTotalReste), '']],
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8, halign: 'center', fontStyle: 'bold' },
            footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold', halign: 'right' },
            bodyStyles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
                1: { cellWidth: 'auto' }, // Nom
                2: { cellWidth: 25, halign: 'right' },
                3: { cellWidth: 25, halign: 'right' },
                4: { cellWidth: 25, halign: 'right' },
                5: { cellWidth: 25, halign: 'right' },
                6: { cellWidth: 25, halign: 'right' },
                7: { cellWidth: 25, halign: 'right' },
                8: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
                9: { cellWidth: 20 } // OBS
            },
            margin: { left: 10, right: 10 },
            didParseCell: function(data: any) {
                // Aligner la colonne TOTAL de la ligne foot à droite
                if (data.section === 'foot' && data.column.index === 1) {
                    data.cell.styles.halign = 'right';
                }
            },
            didDrawPage: function (data: any) {
                // Footer
                doc.setFontSize(8);
                doc.setFont("helvetica", "italic");
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `Généré par GèreEcole - Page ${data.pageNumber}`,
                    pageWidth / 2,
                    doc.internal.pageSize.height - 10,
                    { align: 'center' }
                );
            }
        });

        // Sauvegarde
        const sanitizedClassName = classData.name.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `Bilan_Financier_${sanitizedClassName}.pdf`;
        doc.save(fileName);
    }
}
