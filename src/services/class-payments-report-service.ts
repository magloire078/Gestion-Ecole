import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface StudentPaymentRow {
    index: number;
    name: string;
    totalFee: number;
    inscription: number;
    payment1: number;
    payment2: number;
    payment3: number;
    payment4: number;
    remaining: number;
    obs: string;
}

export class ClassPaymentsReportService {
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

    private static clean(val: string): string {
        return val?.replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ') || '';
    }

    static async generateClassPaymentsPdf(
        rows: StudentPaymentRow[],
        schoolName: string,
        academicYear: string,
        className: string,
        logoUrl?: string
    ) {
        // landscape orientation since there are 10 columns
        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width; // 297 mm
        const logoBase64 = logoUrl ? await this.getBase64ImageFromUrl(logoUrl) : '';

        // 1. Header & Logo
        if (logoBase64) {
            try {
                doc.addImage(logoBase64, 'PNG', 14, 10, 22, 22);
            } catch (e) {
                console.warn('Could not add logo', e);
            }
        }

        // School Information
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.text(schoolName.toUpperCase(), logoBase64 ? 40 : 14, 16);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text(`Année Académique: ${academicYear}`, logoBase64 ? 40 : 14, 22);
        doc.text(`Classe: ${className}`, logoBase64 ? 40 : 14, 27);

        // Right-aligned Generation Date
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        const dateStr = `Généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`;
        doc.text(dateStr, pageWidth - 14 - doc.getTextWidth(dateStr), 16);

        // Separation Line
        doc.setDrawColor(79, 70, 229); // Indigo 600
        doc.setLineWidth(0.5);
        doc.line(14, 35, pageWidth - 14, 35);

        // Document Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // Slate 900
        const title = "ÉTAT DE LA COMPTABILITÉ DES ÉLÈVES";
        const titleWidth = doc.getTextWidth(title);
        const xTitle = (pageWidth - titleWidth) / 2;
        doc.text(title, xTitle, 47);

        // 2. Prepare Data for Table
        const formatAmount = (amt: number) => amt > 0 ? this.clean(new Intl.NumberFormat('fr-FR').format(amt)) : '-';
        
        let totalScolarite = 0;
        let totalInscription = 0;
        let totalP1 = 0;
        let totalP2 = 0;
        let totalP3 = 0;
        let totalP4 = 0;
        let totalRemaining = 0;

        const tableBody = rows.map(r => {
            totalScolarite += r.totalFee;
            totalInscription += r.inscription;
            totalP1 += r.payment1;
            totalP2 += r.payment2;
            totalP3 += r.payment3;
            totalP4 += r.payment4;
            totalRemaining += r.remaining;

            return [
                r.index,
                r.name,
                formatAmount(r.totalFee),
                formatAmount(r.inscription),
                formatAmount(r.payment1),
                formatAmount(r.payment2),
                formatAmount(r.payment3),
                formatAmount(r.payment4),
                formatAmount(r.remaining),
                r.obs || ''
            ];
        });

        // Add TOTAL Row
        tableBody.push([
            '',
            'TOTAL',
            formatAmount(totalScolarite),
            formatAmount(totalInscription),
            formatAmount(totalP1),
            formatAmount(totalP2),
            formatAmount(totalP3),
            formatAmount(totalP4),
            formatAmount(totalRemaining),
            ''
        ]);

        // 3. Render Table
        autoTable(doc, {
            startY: 55,
            head: [['N°', 'NOM ET PRENOM(S)', 'SCOLARITE TOTALE', 'INSCRIPTION', '1ER VERSEMENT', '2E VERSEMENT', '3E VERSEMENT', '4E VERSEMENT', 'RESTE', 'OBS']],
            body: tableBody,
            theme: 'grid',
            headStyles: {
                fillColor: [79, 70, 229], // Indigo 600
                textColor: 255,
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { halign: 'left', fontStyle: 'bold', cellWidth: 70 },
                2: { halign: 'right', cellWidth: 26 },
                3: { halign: 'right', cellWidth: 24 },
                4: { halign: 'right', cellWidth: 24 },
                5: { halign: 'right', cellWidth: 24 },
                6: { halign: 'right', cellWidth: 24 },
                7: { halign: 'right', cellWidth: 24 },
                8: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
                9: { halign: 'left', cellWidth: 25 }
            },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                textColor: [30, 41, 59] // Slate 800
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Slate 50
            },
            didParseCell: function (data) {
                // Bold the total row
                if (data.row.index === tableBody.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [241, 245, 249]; // Slate 100
                    if (data.column.index === 8) {
                        data.cell.styles.textColor = [225, 29, 72]; // Rose 600 for total remaining
                    }
                }
                // Color remaining values
                if (data.section === 'body' && data.column.index === 8 && data.row.index < tableBody.length - 1) {
                    const val = data.cell.raw;
                    if (val && val !== '-') {
                        data.cell.styles.textColor = [225, 29, 72]; // Rose 600
                    }
                }
            },
            margin: { left: 14, right: 14 }
        });

        // 4. Footer Page Numbers
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate 400
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const str = `Page ${i} sur ${pageCount}`;
            doc.text(str, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        }

        // Save
        const sanitizedClassName = className.replace(/\s+/g, '_');
        doc.save(`Etat_Paiement_${sanitizedClassName}_${academicYear}.pdf`);
    }
}
