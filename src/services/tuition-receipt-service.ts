'use client';

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface ReceiptPDFData {
    schoolName: string;
    schoolLogo?: string | null;
    studentName: string;
    studentMatricule: string;
    className: string;
    date: Date;
    description: string;
    amountPaid: number;
    amountDue: number;
    payerName: string;
    payerContact?: string;
    paymentMethod: string;
    receiptNumber: string;
}

export class TuitionReceiptService {
    /**
     * Génère un reçu de paiement au format PDF (A5 Paysage ou Portrait)
     */
    static generateReceiptPDF(data: ReceiptPDFData) {
        // Format A5 Paysage pour économiser du papier et faire un rendu type "carnet à souches"
        const doc = new jsPDF('landscape', 'mm', 'a5');
        const pageWidth = doc.internal.pageSize.width;
        let currentY = 15;

        const formatMoney = (amount: number) => amount.toLocaleString('fr-FR') + ' F CFA';

        // 1. Cadre Principal
        doc.setDrawColor(15, 23, 42); // slate-900
        doc.setLineWidth(0.5);
        doc.rect(5, 5, pageWidth - 10, doc.internal.pageSize.height - 10);

        // 2. En-tête (Logo et Nom de l'école)
        if (data.schoolLogo) {
            try {
                doc.addImage(data.schoolLogo, 'PNG', 10, 10, 15, 15);
            } catch (e) {
                console.error("Error adding logo:", e);
            }
        }

        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(data.schoolName.toUpperCase(), 30, 18);

        // 3. Titre du Reçu
        doc.setFillColor(15, 23, 42);
        doc.rect(pageWidth - 70, 10, 60, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text("REÇU DE PAIEMENT", pageWidth - 40, 18, { align: 'center' });

        currentY = 30;
        
        // 4. Informations du Reçu (N°, Date)
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`N° Reçu : ${data.receiptNumber}`, 10, currentY);
        doc.text(`Date : ${format(data.date, 'dd MMMM yyyy', { locale: fr })}`, pageWidth - 50, currentY);

        currentY += 15;

        // 5. Encadré "Reçu de" (Le payeur)
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(10, currentY, pageWidth - 20, 20, 'FD');
        
        doc.setFont("helvetica", "bold");
        doc.text("Reçu de :", 15, currentY + 7);
        doc.setFont("helvetica", "normal");
        doc.text(data.payerName.toUpperCase(), 45, currentY + 7);
        
        doc.setFont("helvetica", "bold");
        doc.text("Contact :", 15, currentY + 14);
        doc.setFont("helvetica", "normal");
        doc.text(data.payerContact || 'N/A', 45, currentY + 14);

        currentY += 30;

        // 6. Encadré "Pour le compte de" (L'élève)
        doc.setFillColor(248, 250, 252);
        doc.rect(10, currentY, pageWidth - 20, 20, 'FD');

        doc.setFont("helvetica", "bold");
        doc.text("Élève :", 15, currentY + 7);
        doc.setFont("helvetica", "normal");
        doc.text(`${data.studentName.toUpperCase()} (Matricule: ${data.studentMatricule})`, 45, currentY + 7);
        
        doc.setFont("helvetica", "bold");
        doc.text("Classe :", 15, currentY + 14);
        doc.setFont("helvetica", "normal");
        doc.text(data.className, 45, currentY + 14);

        currentY += 30;

        // 7. Détails du Paiement
        doc.setFont("helvetica", "bold");
        doc.text("Motif :", 10, currentY);
        doc.setFont("helvetica", "normal");
        doc.text(data.description, 35, currentY);

        currentY += 8;
        doc.setFont("helvetica", "bold");
        doc.text("Mode de paiement :", 10, currentY);
        doc.setFont("helvetica", "normal");
        doc.text(data.paymentMethod, 45, currentY);

        currentY += 15;

        // 8. Montants
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(10, currentY, (pageWidth - 30) / 2, 20, 'F');
        doc.rect(10 + (pageWidth - 30) / 2 + 10, currentY, (pageWidth - 30) / 2, 20, 'F');

        // Bloc Montant Payé
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("MONTANT PAYÉ", 15 + ((pageWidth - 30) / 4), currentY + 7, { align: 'center' });
        doc.setFontSize(14);
        doc.setTextColor(5, 150, 105); // emerald-600
        doc.text(formatMoney(data.amountPaid), 15 + ((pageWidth - 30) / 4), currentY + 15, { align: 'center' });

        // Bloc Solde Restant
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text("SOLDE RESTANT (Scolarité)", 25 + (pageWidth - 30) * 0.75, currentY + 7, { align: 'center' });
        doc.setFontSize(14);
        doc.setTextColor(220, 38, 38); // red-600
        doc.text(formatMoney(Math.max(0, data.amountDue)), 25 + (pageWidth - 30) * 0.75, currentY + 15, { align: 'center' });

        currentY += 35;

        // 9. Signatures
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("La Caisse / Comptabilité", pageWidth - 60, currentY);

        // Sauvegarde du fichier
        const fileName = `Recu_${data.receiptNumber}_${data.studentName.replace(/\s+/g, '_')}.pdf`;
        doc.save(fileName);
    }
}
