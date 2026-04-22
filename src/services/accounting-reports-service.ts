'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getCountryByCode, CountryCode } from '@/lib/countries-data';
import { accountingTransaction as AccountingTransaction, school as School } from '@/lib/data-types';
import { formatCurrency } from '@/lib/currency-utils';
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export class AccountingReportsService {
    /**
     * Nettoie les chaînes de caractères pour jsPDF (remplace les espaces insécables)
     */
    private static clean(val: string): string {
        return val.replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ');
    }

    /**
     * Génère le rapport "Grand Livre" en PDF
     */
    static generateGrandLivrePDF(
        school: School,
        transactions: AccountingTransaction[],
        periodLabel: string
    ) {
        if (!school || !school.name) {
            console.error("School data is missing");
            return;
        }

        const doc = new jsPDF();
        const pageWidth = 210;
        let currentY = 20;

        // 1. Header & Logo
        if (school.mainLogoUrl) {
            try {
                // simple base64 or url check - for simplicity in this env we assume it's loadable
                doc.addImage(school.mainLogoUrl, 'PNG', 15, 15, 25, 25);
                currentY = 45;
            } catch (e) {
                console.error("Could not add logo to PDF", e);
            }
        }

        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.text("GRAND LIVRE COMPTABLE", 15, currentY);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105); // Slate 600
        doc.text(school.name.toUpperCase(), 15, currentY + 8);
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Période : ${periodLabel}`, 15, currentY + 14);
        
        doc.text(`Édité le : ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 15, currentY + 14, { align: 'right' });

        currentY += 25;

        // 2. Préparation des données du tableau
        let runningBalance = 0;
        const tableBody = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(t => {
            const amount = t.type === 'Revenu' ? t.amount : -t.amount;
            runningBalance += amount;
            
            return [
                format(new Date(t.date), 'dd/MM/yyyy'),
                t.description,
                t.category,
                t.type === 'Revenu' ? this.clean(formatCurrency(t.amount)) : '',
                t.type === 'Dépense' ? this.clean(formatCurrency(t.amount)) : '',
                this.clean(formatCurrency(runningBalance))
            ];
        });

        // 3. Table des transactions
        autoTable(doc, {
            startY: currentY,
            head: [['DATE', 'DESCRIPTION', 'CATÉGORIE', 'DÉBIT (+)', 'CRÉDIT (-)', 'SOLDE']],
            body: tableBody,
            theme: 'grid',
            headStyles: { 
                fillColor: [79, 70, 229], // Indigo 600
                fontSize: 9, 
                halign: 'center',
                fontStyle: 'bold',
                cellPadding: 5
            },
            bodyStyles: { 
                fontSize: 8,
                cellPadding: 4,
                textColor: [30, 41, 59] // Slate 800
            },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 60 },
                2: { cellWidth: 35 },
                3: { halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] }, // Emerald 600
                4: { halign: 'right', fontStyle: 'bold', textColor: [225, 29, 72] }, // Rose 600
                5: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } // Slate 50
            },
            alternateRowStyles: {
                fillColor: [249, 250, 251] // Slate 50
            },
            margin: { left: 15, right: 15 }
        });

        // 4. Footer
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text("Document confidentiel généré par le système GèreEcole.", pageWidth / 2, 285, { align: 'center' });

        // 5. Save
        const sanitizedSchoolName = (school.name || "Ecole").replace(/[^a-z0-9]/gi, '_');
        const fileName = `Grand_Livre_${sanitizedSchoolName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        doc.save(fileName);
    }

    /**
     * Génère le "Bilan Financier" (Compte de Résultat Simplifié)
     */
    static generateBilanPDF(
        school: School,
        transactions: AccountingTransaction[],
        periodLabel: string
    ) {
        if (!school || !school.name) {
            console.error("School data is missing");
            return;
        }

        const doc = new jsPDF();
        const pageWidth = 210;
        let currentY = 20;

        // 1. Header & Logo
        if (school.mainLogoUrl) {
            try {
                doc.addImage(school.mainLogoUrl, 'PNG', 15, 15, 25, 25);
                currentY = 45;
            } catch (e) {
                console.error("Could not add logo to PDF", e);
            }
        }

        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.text("BILAN FINANCIER", 15, currentY);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105); // Slate 600
        doc.text(school.name.toUpperCase(), 15, currentY + 8);
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Analyse périodique des flux : ${periodLabel}`, 15, currentY + 14);
        
        doc.text(`Édité le : ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 15, currentY + 14, { align: 'right' });

        currentY += 30;

        // Calculs par catégorie
        const revenueByCat: Record<string, number> = {};
        const expenseByCat: Record<string, number> = {};
        let totalRev = 0;
        let totalExp = 0;

        transactions.forEach(t => {
            if (t.type === 'Revenu') {
                revenueByCat[t.category] = (revenueByCat[t.category] || 0) + t.amount;
                totalRev += t.amount;
            } else {
                expenseByCat[t.category] = (expenseByCat[t.category] || 0) + t.amount;
                totalExp += t.amount;
            }
        });

        // 1. Tableau des Revenus
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("1. PRODUITS (REVENUS)", 15, currentY);
        currentY += 5;

        const revBody = Object.entries(revenueByCat).map(([cat, amt]) => [cat, this.clean(formatCurrency(amt))]);
        revBody.push(['TOTAL REVENUS', this.clean(formatCurrency(totalRev))]);

        autoTable(doc, {
            startY: currentY,
            head: [['CATÉGORIE DE PRODUIT', 'MONTANT TOTAL']],
            body: revBody,
            theme: 'grid',
            headStyles: { 
                fillColor: [5, 150, 105], // Emerald 600
                fontStyle: 'bold',
                cellPadding: 4
            },
            bodyStyles: {
                fontSize: 9,
                cellPadding: 4
            },
            columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
            margin: { left: 15, right: 15 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;

        // 2. Tableau des Dépenses
        doc.setFont("helvetica", "bold");
        doc.text("2. CHARGES (DÉPENSES)", 15, currentY);
        currentY += 5;

        const expBody = Object.entries(expenseByCat).map(([cat, amt]) => [cat, this.clean(formatCurrency(amt))]);
        expBody.push(['TOTAL DÉPENSES', this.clean(formatCurrency(totalExp))]);

        autoTable(doc, {
            startY: currentY,
            head: [['CATÉGORIE DE CHARGE', 'MONTANT TOTAL']],
            body: expBody,
            theme: 'grid',
            headStyles: { 
                fillColor: [225, 29, 72], // Rose 600
                fontStyle: 'bold',
                cellPadding: 4
            },
            bodyStyles: {
                fontSize: 9,
                cellPadding: 4
            },
            columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
            margin: { left: 15, right: 15 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 20;

        // 3. Résultat Net
        const result = totalRev - totalExp;
        doc.setFillColor(248, 250, 252); // Slate 50
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.rect(15, currentY, 180, 25, 'FD');
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59); // Slate 800
        doc.text("RÉSULTAT NET DE L'EXERCICE :", 25, currentY + 16);
        
        if (result >= 0) {
            doc.setTextColor(5, 150, 105); // Emerald 600
        } else {
            doc.setTextColor(225, 29, 72); // Rose 600
        }
        doc.setFontSize(18);
        doc.text(this.clean(formatCurrency(result)), pageWidth - 25, currentY + 16, { align: 'right' });

        // Footer
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text("Document confidentiel généré par le système GèreEcole.", pageWidth / 2, 285, { align: 'center' });

        const sanitizedSchoolName = (school.name || "Ecole").replace(/[^a-z0-9]/gi, '_');
        doc.save(`Bilan_Financier_${sanitizedSchoolName}.pdf`);
    }
}
