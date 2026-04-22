'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getCountryByCode, CountryCode } from '@/lib/countries-data';
import { student as Student, school as School, payment as Payment } from '@/lib/data-types';
import { formatCurrency } from '@/lib/currency-utils';

// Extension pour TypeScript
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

export class BillingService {
    /**
     * Génère un reçu PDF officiel pour un paiement spécifique
     */
    static generateReceiptPDF(
        school: School,
        student: Student,
        payment: Payment,
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

        // 2. Bannière de l'École
        doc.setFillColor(12, 54, 90); // #0C365A
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
        doc.text(school.address || "", pageWidth / 2, currentY + 19, { align: 'center' });

        currentY += 40;

        // 3. Titre du Document & Date
        doc.setTextColor(12, 54, 90);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("REÇU DE PAIEMENT", pageWidth / 2, currentY, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(`N° : ${payment.id?.substring(0, 8).toUpperCase() || 'REF-TEMP'}`, pageWidth - 20, currentY, { align: 'right' });
        doc.text(`Date : ${new Date(payment.date).toLocaleDateString('fr-FR')}`, pageWidth - 20, currentY + 5, { align: 'right' });

        currentY += 20;

        // 4. Informations de l'Élève & Payeur
        doc.setDrawColor(230, 230, 230);
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(15, currentY, 180, 35, 3, 3, 'FD');
        
        doc.setTextColor(12, 54, 90);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("ÉLÈVE", 20, currentY + 8);
        doc.text("PAYEUR", 110, currentY + 8);
        
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.text(`${student.firstName} ${student.lastName}`, 20, currentY + 15);
        doc.text(`Classe : ${student.class || 'N/A'}`, 20, currentY + 20);
        doc.text(`Matricule : ${student.matricule || 'N/A'}`, 20, currentY + 25);
        
        doc.text(`${payment.payerFirstName} ${payment.payerLastName}`, 110, currentY + 15);
        doc.text(`Méthode : ${payment.method}`, 110, currentY + 20);
        doc.text(`Contact : ${payment.payerContact || 'N/A'}`, 110, currentY + 25);

        currentY += 45;

        // 5. Tableau des Détails
        (doc as any).autoTable({
            startY: currentY,
            head: [['DESCRIPTION', 'MONTANT']],
            body: [
                [payment.description || "Paiement frais de scolarité", formatCurrency(payment.amount)],
            ],
            theme: 'grid',
            headStyles: { fillColor: [12, 54, 90], fontSize: 10, halign: 'center' },
            bodyStyles: { fontSize: 11, minCellHeight: 15 },
            columnStyles: {
                0: { cellWidth: 130 },
                1: { halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: 15, right: 15 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;

        // 6. Résumé Financier Élève
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("SITUATION FINANCIÈRE DE L'ÉLÈVE :", 15, currentY);
        
        const remaining = student.amountDue || 0;
        doc.setFont("helvetica", "bold");
        doc.text(`Reste à payer : ${formatCurrency(remaining)}`, 15, currentY + 7);

        // 7. Filigrane "PAYÉ" si nécessaire
        doc.saveGraphicsState();
        doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
        doc.setFontSize(100);
        doc.setTextColor(0, 150, 0);
        doc.text("PAYÉ", pageWidth / 2, currentY + 40, { align: 'center', angle: 45 });
        doc.restoreGraphicsState();

        // 8. Bas de page / Signatures
        currentY += 40;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Le Caissier / Comptable", 150, currentY, { align: 'center' });
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text("Ce document est un reçu officiel généré électroniquement.", pageWidth / 2, 285, { align: 'center' });

        // Sauvegarde
        const fileName = `Recu_${payment.id?.substring(0, 8)}_${student.lastName}.pdf`;
        doc.save(fileName);
    }

    /**
     * Génère une facture globale (Bilan Personnel) pour un élève
     */
    static generateInVoicePDF(
        school: School,
        student: Student,
        payments: Payment[],
        schoolLogo?: string | null
    ) {
        const doc = new jsPDF();
        const pageWidth = 210;
        let currentY = 15;

        // -- Similaire à Receipt mais avec la liste des paiements --
        // (Pour gagner du temps j'implémente d'abord le reçu qui est le plus urgent)
        
        // Header... 
        // Table of all installments...
        // Summary of total paid vs total due...
    }
}
