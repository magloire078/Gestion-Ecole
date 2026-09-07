import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, getDaysInMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { student as Student, class_type as Class } from '@/lib/data-types';
import { getCountryByCode, type CountryCode, type CountryConfig } from '@/lib/countries-data';

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
        className?: string,
        mode: 'save' | 'print' = 'save'
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

        if (mode === 'print') {
            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');
            return;
        }

        const fileName = `Liste_Eleves_${className ? className.replace(/\s+/g, '_') : 'Complete'}_${academicYear}.pdf`;
        doc.save(fileName);
    }

    /**
     * Générer une grille de notation vierge pour une classe (saisie manuelle)
     */
    static async generateBlankGradeSheetPdf(
        students: Student[],
        schoolName: string,
        className: string,
        academicYear: string,
        logoUrl?: string
    ) {
        const doc = new jsPDF('l', 'mm', 'a4');
        const logoBase64 = logoUrl ? await this.getBase64ImageFromUrl(logoUrl) : '';

        this.addHeader(doc, schoolName, `Fiche de Notation Vierge - ${className}`, logoBase64, academicYear);

        const tableData = students.map((s, index) => [
            index + 1,
            s.matricule || 'N/A',
            `${s.lastName} ${s.firstName}`,
            '', '', '', ''
        ]);

        autoTable(doc, {
            startY: 65,
            head: [['N°', 'Matricule', 'Nom & Prénom', 'Devoir 1', 'Devoir 2', 'Composition', 'Moyenne']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', halign: 'center' },
            columnStyles: {
                0: { halign: 'center', cellWidth: 12 },
                1: { halign: 'center', cellWidth: 30 },
                2: { halign: 'left' },
                3: { halign: 'center', cellWidth: 30, minCellHeight: 12 },
                4: { halign: 'center', cellWidth: 30, minCellHeight: 12 },
                5: { halign: 'center', cellWidth: 30, minCellHeight: 12 },
                6: { halign: 'center', cellWidth: 30, minCellHeight: 12 },
            },
            styles: { fontSize: 9, cellPadding: 4 },
            alternateRowStyles: { fillColor: [248, 250, 252] }
        });

        this.addFooter(doc);
        doc.save(`Fiche_Notation_${className.replace(/\s+/g, '_')}.pdf`);
    }

    /**
     * Générer une feuille d'appel journalière pour une classe
     */
    static async generateDailyAttendanceSheetPdf(
        students: Student[],
        schoolName: string,
        className: string,
        dateStr: string,
        logoUrl?: string
    ) {
        const doc = new jsPDF('p', 'mm', 'a4');
        const logoBase64 = logoUrl ? await this.getBase64ImageFromUrl(logoUrl) : '';

        this.addHeader(doc, schoolName, `Feuille d'Appel - ${className} - ${dateStr}`, logoBase64);

        const tableData = students.map((s, index) => [
            index + 1,
            s.matricule || 'N/A',
            `${s.lastName} ${s.firstName}`,
            '', '', ''
        ]);

        autoTable(doc, {
            startY: 65,
            head: [['N°', 'Matricule', 'Nom & Prénom', 'Présent', 'Absent', 'Retard']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', halign: 'center' },
            columnStyles: {
                0: { halign: 'center', cellWidth: 12 },
                1: { halign: 'center', cellWidth: 30 },
                2: { halign: 'left' },
                3: { halign: 'center', cellWidth: 25, minCellHeight: 10 },
                4: { halign: 'center', cellWidth: 25, minCellHeight: 10 },
                5: { halign: 'center', cellWidth: 25, minCellHeight: 10 },
            },
            styles: { fontSize: 9, cellPadding: 4 },
            alternateRowStyles: { fillColor: [248, 250, 252] }
        });

        this.addFooter(doc);
        doc.save(`Feuille_Appel_${className.replace(/\s+/g, '_')}_${dateStr}.pdf`);
    }

    /**
     * Mois couverts par une année scolaire « 2026-2027 » : de septembre de la
     * première année à juillet de la seconde. Une itération naïve sur l'année
     * civile ferait démarrer le registre en janvier, au milieu de l'année.
     */
    private static getAcademicYearMonths(academicYear: string): { year: number; month: number }[] {
        const startYear = parseInt(academicYear?.split('-')[0] ?? '', 10);
        if (Number.isNaN(startYear)) return [];

        const months: { year: number; month: number }[] = [];
        for (let m = 8; m <= 11; m++) months.push({ year: startYear, month: m });     // sept. → déc.
        for (let m = 0; m <= 6; m++) months.push({ year: startYear + 1, month: m });  // janv. → juil.
        return months;
    }

    /**
     * En-tête officiel d'une page de liste d'appel. Redessiné sur chaque page,
     * y compris celles qu'autoTable ajoute quand la classe déborde : une
     * feuille détachée et remise à un enseignant doit rester identifiable.
     */
    private static drawMonthlyAttendanceHeader(
        doc: jsPDF,
        params: {
            schoolName: string;
            schoolContact: string;
            className: string;
            academicYear: string;
            year: number;
            month: number;
            boys: number;
            girls: number;
            total: number;
            country: CountryConfig | null;
            margin: number;
        }
    ) {
        const { schoolName, schoolContact, className, academicYear, year, month,
                boys, girls, total, country, margin } = params;
        const pageWidth = doc.internal.pageSize.width;

        // 1. Timbre officiel, en serif comme sur les imprimés administratifs.
        doc.setTextColor(0, 0, 0);
        doc.setFont('times', 'normal');
        doc.setFontSize(10);
        let y = margin + 4;
        if (country) {
            doc.text(country.officialName, margin, y);
            doc.text(country.motto, margin, y + 4);
            doc.text(country.ministryName, margin, y + 8);
            y += 12;
        }
        doc.setFont('times', 'bold');
        doc.text(schoolName, margin, y);
        if (schoolContact) {
            doc.setFont('times', 'normal');
            doc.text(schoolContact, margin, y + 4);
        }

        // 2. Titre encadré.
        const titleY = margin + 32;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.rect(margin, titleY, pageWidth - margin * 2, 9);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`LISTE D'APPEL MENSUEL ${className}`.toUpperCase(), pageWidth / 2, titleY + 6, { align: 'center' });

        // 3. Année scolaire et mois concernés.
        const infoY = titleY + 17;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Année scolaire:', margin, infoY);
        doc.setFont('helvetica', 'bold');
        doc.text(academicYear, margin + 26, infoY);
        doc.setFont('helvetica', 'normal');
        doc.text('Mois:', margin + 50, infoY);
        doc.setFont('helvetica', 'bold');
        doc.text(format(new Date(year, month, 1), 'MMMM', { locale: fr }).toUpperCase(), margin + 61, infoY);

        // 4. Cartouche des effectifs, aligné à droite.
        const boxW = 54, boxH = 16;
        const boxX = pageWidth - margin - boxW, boxY = infoY - 12;
        const colW = boxW / 3;
        doc.rect(boxX, boxY, boxW, boxH);
        doc.line(boxX, boxY + 5.5, boxX + boxW, boxY + 5.5);
        doc.line(boxX, boxY + 11, boxX + boxW, boxY + 11);
        for (let i = 1; i < 3; i++) {
            doc.line(boxX + colW * i, boxY + 5.5, boxX + colW * i, boxY + boxH);
        }
        doc.setFont('times', 'bold');
        doc.setFontSize(9);
        doc.text('EFFECTIFS', boxX + boxW / 2, boxY + 4, { align: 'center' });
        ['G', 'F', 'T'].forEach((label, i) => {
            doc.text(label, boxX + colW * i + colW / 2, boxY + 9.5, { align: 'center' });
        });
        doc.setFont('times', 'normal');
        // Le total vient de l'effectif réel, pas de la somme G + F : un élève
        // dont le genre n'est pas renseigné disparaîtrait du total.
        [boys, girls, total].forEach((value, i) => {
            doc.text(String(value), boxX + colW * i + colW / 2, boxY + 15, { align: 'center' });
        });
    }

    /**
     * Générer la liste d'appel mensuelle d'une classe : une page par mois de
     * l'année scolaire, avec autant de colonnes que le mois compte de jours.
     */
    static async generateMonthlyAttendanceSheetPdf(
        students: Student[],
        schoolName: string,
        className: string,
        academicYear: string,
        options: {
            countryCode?: string;
            schoolContact?: string;
            months?: { year: number; month: number }[];
            /** 'p' reproduit le format administratif ; 'l' élargit les cases. */
            orientation?: 'p' | 'l';
        } = {}
    ) {
        const { countryCode, schoolContact = '', orientation = 'p' } = options;
        const country = countryCode ? getCountryByCode(countryCode as CountryCode) ?? null : null;

        const computed = this.getAcademicYearMonths(academicYear);
        const now = new Date();
        const months = options.months?.length
            ? options.months
            : (computed.length ? computed : [{ year: now.getFullYear(), month: now.getMonth() }]);

        const doc = new jsPDF(orientation, 'mm', 'a4');
        const margin = 10;
        const pageWidth = doc.internal.pageSize.width;

        const boys = students.filter(s => s.gender === 'Masculin').length;
        const girls = students.filter(s => s.gender === 'Féminin').length;

        // Les colonnes d'identification sont fixes ; toute la largeur restante
        // est répartie entre les jours réels du mois. Février obtient donc des
        // cases plus larges que janvier, au lieu de 31 colonnes systématiques.
        const INFO_WIDTHS = [7, 20, 42, 22];
        const infoWidth = INFO_WIDTHS.reduce((a, b) => a + b, 0);
        const headerHeight = margin + 42;

        months.forEach(({ year, month }, index) => {
            if (index > 0) doc.addPage();

            const daysInMonth = getDaysInMonth(new Date(year, month, 1));
            const dayWidth = (pageWidth - margin * 2 - infoWidth) / daysInMonth;
            const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));

            const columnStyles: Record<number, Record<string, unknown>> = {};
            INFO_WIDTHS.forEach((w, i) => {
                columnStyles[i] = { cellWidth: w, fontSize: 7, halign: i === 2 ? 'left' : 'center' };
            });
            // Corps 5 pt : à 3,2 mm de large, une colonne de jour n'offre que
            // ~2,2 mm utiles une fois les marges retirées, soit tout juste la
            // largeur d'un « 01 ». Au-delà, le nombre déborderait de sa case.
            days.forEach((_, i) => {
                columnStyles[INFO_WIDTHS.length + i] = { cellWidth: dayWidth, fontSize: 5 };
            });

            autoTable(doc, {
                startY: headerHeight,
                margin: { top: headerHeight, left: margin, right: margin },
                head: [['N°', 'Matricule', 'Nom et Prénoms', 'Contact', ...days]],
                body: students.map((s, i) => [
                    i + 1,
                    s.matricule || '',
                    `${s.lastName} ${s.firstName}`.trim(),
                    // Un seul numéro. Joindre les deux contacts dépassait les
                    // 22 mm de la colonne : la ligne se scindait en deux, ce qui
                    // doublait la hauteur de chaque élève concerné et laissait un
                    // « / » orphelin en fin de première ligne. Le premier contact
                    // renseigné suffit pour joindre la famille depuis le registre.
                    [s.parent1Contact, s.parent2Contact].find(Boolean) || '',
                    ...days.map(() => ''),
                ]),
                theme: 'grid',
                styles: {
                    fontSize: 6, cellPadding: 0.5, minCellHeight: 6,
                    textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center',
                },
                headStyles: {
                    fillColor: [226, 232, 240], textColor: [0, 0, 0],
                    fontStyle: 'bold', halign: 'center', valign: 'middle',
                },
                columnStyles,
                didParseCell: (data) => {
                    // Grise samedis et dimanches : l'enseignant voit d'un coup
                    // d'œil les colonnes qui ne le concernent pas.
                    const dayIndex = data.column.index - INFO_WIDTHS.length;
                    if (dayIndex < 0) return;
                    const weekday = new Date(year, month, dayIndex + 1).getDay();
                    if (weekday === 0 || weekday === 6) {
                        data.cell.styles.fillColor = [203, 213, 225];
                    }
                },
                didDrawPage: () => {
                    this.drawMonthlyAttendanceHeader(doc, {
                        schoolName, schoolContact, className, academicYear,
                        year, month, boys, girls, total: students.length, country, margin,
                    });
                },
            });

            // Une classe vide produirait sinon des pages muettes, sans dire s'il
            // s'agit d'une absence d'inscrits ou d'un filtre trop restrictif.
            if (students.length === 0) {
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(9);
                doc.setTextColor(100, 116, 139);
                doc.text(
                    `Aucun élève inscrit dans cette classe pour l'année scolaire ${academicYear}.`,
                    pageWidth / 2, headerHeight + 20, { align: 'center' }
                );
            }
        });

        this.addFooter(doc);
        doc.save(`Liste_Appel_Mensuel_${className.replace(/\s+/g, '_')}_${academicYear}.pdf`);
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
