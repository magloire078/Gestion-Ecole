'use client';

import jsPDF from 'jspdf';
import { getCountryByCode, CountryCode } from '@/lib/countries-data';
import type { school as School, student as Student } from '@/lib/data-types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface RegistrationFormOptions {
    school: Partial<School> | any;
    academicYear?: string;
    targetClassName?: string;
    student?: Partial<Student> | any; // Si présent, pré-remplit les données (mode réinscription / fiche élève)
    schoolLogoUrl?: string | null;
}

export class RegistrationFormPDFService {
    /**
     * Convertit une URL d'image en Base64 de manière sécurisée
     */
    private static async getBase64ImageFromUrl(imageUrl: string): Promise<string> {
        if (!imageUrl) return '';
        try {
            const res = await fetch(imageUrl, { mode: 'cors' });
            if (!res.ok) return '';
            const blob = await res.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string) || '');
                reader.onerror = () => resolve('');
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.warn('Impossible de charger le logo en base64:', error);
            return '';
        }
    }

    /**
     * Génère et télécharge la Fiche d'Inscription PDF
     */
    static async generateRegistrationFormPDF(options: RegistrationFormOptions): Promise<void> {
        const { school, academicYear, targetClassName, student, schoolLogoUrl } = options;

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 12;
        const contentWidth = pageWidth - (margin * 2); // 186 mm
        let currentY = 10;

        // Pré-chargement du logo
        let logoBase64 = '';
        const logoToUse = schoolLogoUrl || school?.mainLogoUrl;
        if (logoToUse) {
            logoBase64 = await this.getBase64ImageFromUrl(logoToUse);
        }

        const country = school?.country ? getCountryByCode(school.country as CountryCode) : null;
        const currentSchoolYear = academicYear || school?.currentAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

        // -------------------------------------------------------------
        // 1. EN-TÊTE OFFICIEL / NATIONAL (si configuré)
        // -------------------------------------------------------------
        if (country) {
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59); // Slate 800
            doc.text(country.officialName.toUpperCase(), margin, currentY);

            doc.setFont('helvetica', 'italic');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139); // Slate 500
            doc.text(country.motto, margin, currentY + 3.5);

            // Ministère à droite
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(30, 41, 59);
            const ministryLines = doc.splitTextToSize(country.ministryName.toUpperCase(), 75);
            doc.text(ministryLines, pageWidth - margin, currentY, { align: 'right' });

            currentY += 10;
        }

        // -------------------------------------------------------------
        // 2. BANNIÈRE ÉCOLE & TITRE DU DOCUMENT
        // -------------------------------------------------------------
        const bannerTopY = currentY;
        const photoWidth = 32;
        const photoHeight = 38;
        const infoWidth = contentWidth - photoWidth - 4;

        // Rectangle d'en-tête de l'école
        doc.setFillColor(248, 250, 252); // Slate 50
        doc.setDrawColor(203, 213, 225); // Slate 300
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, bannerTopY, infoWidth, photoHeight, 2, 2, 'FD');

        // Barre d'accentuation couleur école (Indigo / Bleu)
        doc.setFillColor(37, 99, 235); // Blue 600
        doc.roundedRect(margin, bannerTopY, 3, photoHeight, 1, 1, 'F');

        // Insertion Logo si présent
        let textStartX = margin + 6;
        if (logoBase64) {
            try {
                doc.addImage(logoBase64, 'PNG', margin + 5, bannerTopY + 4, 18, 18);
                textStartX = margin + 26;
            } catch (e) {
                console.warn('Erreur insertion logo', e);
            }
        }

        // Nom de l'établissement
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.text(school?.name ? school.name.toUpperCase() : 'ÉTABLISSEMENT SCOLAIRE', textStartX, bannerTopY + 7);

        // Coordonnées de l'école
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105); // Slate 600
        let contactY = bannerTopY + 12;

        const schoolDetails = [
            school?.address ? `Adresse: ${school.address}` : '',
            (school?.phone || school?.email) ? `Tél: ${school?.phone || '-'} | Email: ${school?.email || '-'}` : '',
            school?.status ? `Statut: ${school.status}` : ''
        ].filter(Boolean);

        schoolDetails.forEach((line) => {
            doc.text(line, textStartX, contactY);
            contactY += 3.8;
        });

        // Titre & Année Académique dans la bannière
        doc.setFillColor(37, 99, 235);
        doc.roundedRect(textStartX, bannerTopY + 26, infoWidth - (textStartX - margin) - 4, 9, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        const docTitle = student?.lastName 
            ? "FICHE DE RÉINSCRIPTION & MISE À JOUR" 
            : "FICHE OFFICIELLE D'INSCRIPTION";
        doc.text(docTitle, textStartX + 3, bannerTopY + 32);

        doc.setFontSize(8);
        doc.text(`Année : ${currentSchoolYear}`, margin + infoWidth - 6, bannerTopY + 32, { align: 'right' });

        // CADRE PHOTO D'IDENTITÉ (En haut à droite)
        const photoX = margin + infoWidth + 4;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(148, 163, 184); // Slate 400
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.roundedRect(photoX, bannerTopY, photoWidth, photoHeight, 2, 2, 'FD');
        doc.setLineDashPattern([], 0); // Reset dash

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text("PHOTO", photoX + (photoWidth / 2), bannerTopY + 16, { align: 'center' });
        doc.text("D'IDENTITÉ", photoX + (photoWidth / 2), bannerTopY + 20, { align: 'center' });
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.text("(Format 4 x 4)", photoX + (photoWidth / 2), bannerTopY + 25, { align: 'center' });

        currentY = bannerTopY + photoHeight + 5;

        // -------------------------------------------------------------
        // ENCART CADRE ADMINISTRATIF RAPIDE
        // -------------------------------------------------------------
        doc.setFillColor(241, 245, 249); // Slate 100
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.roundedRect(margin, currentY, contentWidth, 9, 1.5, 1.5, 'FD');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);

        const dossierNum = student?.matricule || '....................................';
        const dateDepot = format(new Date(), 'dd/MM/yyyy');
        const classeDemandee = targetClassName || student?.class || '....................................';

        doc.text(`N° Matricule / Dossier :`, margin + 3, currentY + 6);
        doc.setFont('helvetica', 'normal');
        doc.text(dossierNum, margin + 37, currentY + 6);

        doc.setFont('helvetica', 'bold');
        doc.text(`Classe / Niveau sollicité :`, margin + 85, currentY + 6);
        doc.setFont('helvetica', 'normal');
        doc.text(classeDemandee, margin + 125, currentY + 6);

        doc.setFont('helvetica', 'bold');
        doc.text(`Date :`, margin + 155, currentY + 6);
        doc.setFont('helvetica', 'normal');
        doc.text(dateDepot, margin + 165, currentY + 6);

        currentY += 13;

        // -------------------------------------------------------------
        // FONCTION UTILITAIRE DE SECTION
        // -------------------------------------------------------------
        const drawSectionHeader = (title: string, yPos: number, iconNumber: string) => {
            doc.setFillColor(30, 41, 59); // Slate 800
            doc.roundedRect(margin, yPos, contentWidth, 6.5, 1, 1, 'F');
            
            // Badge numéro
            doc.setFillColor(37, 99, 235); // Blue 600
            doc.roundedRect(margin + 1, yPos + 0.8, 5, 5, 0.8, 0.8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(255, 255, 255);
            doc.text(iconNumber, margin + 3.5, yPos + 4.5, { align: 'center' });

            doc.setFontSize(8.5);
            doc.text(title.toUpperCase(), margin + 9, yPos + 4.7);
            return yPos + 9;
        };

        const drawFieldBox = (label: string, value: string, x: number, y: number, w: number, h: number = 7) => {
            doc.setDrawColor(226, 232, 240); // Slate 200
            doc.setFillColor(255, 255, 255);
            doc.rect(x, y, w, h, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139); // Slate 500
            doc.text(label.toUpperCase(), x + 1.5, y + 2.8);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42); // Slate 900
            
            if (value) {
                doc.text(value, x + 2, y + 6);
            } else {
                // Ligne pointillée fine pour écriture manuelle
                doc.setDrawColor(203, 213, 225);
                doc.setLineDashPattern([0.8, 1.2], 0);
                doc.line(x + 2, y + 5.8, x + w - 2, y + 5.8);
                doc.setLineDashPattern([], 0);
            }
        };

        const drawCheckbox = (label: string, checked: boolean, x: number, y: number) => {
            doc.setDrawColor(100, 116, 139);
            doc.setLineWidth(0.3);
            doc.rect(x, y, 3.2, 3.2);
            if (checked) {
                doc.setFillColor(37, 99, 235);
                doc.rect(x + 0.6, y + 0.6, 2, 2, 'F');
            }
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(30, 41, 59);
            doc.text(label, x + 4.8, y + 2.6);
        };

        // -------------------------------------------------------------
        // SECTION 1 : RENSEIGNEMENTS SUR L'ÉLÈVE
        // -------------------------------------------------------------
        currentY = drawSectionHeader("1. Informations Générales de l'Élève", currentY, "1");

        const halfW = (contentWidth - 2) / 2;

        // Ligne 1 : Nom & Prénoms
        drawFieldBox("Nom de Famille", student?.lastName || '', margin, currentY, halfW);
        drawFieldBox("Prénoms", student?.firstName || '', margin + halfW + 2, currentY, halfW);
        currentY += 8;

        // Ligne 2 : Sexe, Date de naissance, Lieu de naissance
        const isMale = student?.gender === 'Masculin';
        const isFemale = student?.gender === 'Féminin';
        
        // Boîte Sexe
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, currentY, 40, 7, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text("SEXE", margin + 1.5, currentY + 2.8);
        drawCheckbox("M", isMale, margin + 12, currentY + 2.3);
        drawCheckbox("F", isFemale, margin + 26, currentY + 2.3);

        // Date de naissance & Lieu
        let birthDateFormatted = '';
        if (student?.dateOfBirth) {
            try {
                birthDateFormatted = format(new Date(student.dateOfBirth), 'dd/MM/yyyy');
            } catch {
                birthDateFormatted = student.dateOfBirth;
            }
        }
        drawFieldBox("Date de Naissance (JJ/MM/AAAA)", birthDateFormatted, margin + 42, currentY, 52);
        drawFieldBox("Lieu de Naissance / Ville", student?.placeOfBirth || '', margin + 96, currentY, contentWidth - 96);
        currentY += 8;

        // Ligne 3 : Nationalité, Ville / Quartier de résidence
        drawFieldBox("Nationalité", student?.nationality || (student ? 'Ivoirienne' : ''), margin, currentY, 55);
        drawFieldBox("Adresse / Quartier de Résidence Actuelle", student?.address || '', margin + 57, currentY, contentWidth - 57);
        currentY += 8;

        // Ligne 4 : Établissement d'origine & Régime
        drawFieldBox("Établissement Précédent Fréquenté", student?.previousSchool || '', margin, currentY, halfW);
        
        // Régime scolaire souhaité
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(255, 255, 255);
        doc.rect(margin + halfW + 2, currentY, halfW, 7, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text("RÉGIME SOUHAITÉ", margin + halfW + 3.5, currentY + 2.8);
        drawCheckbox("Externe", true, margin + halfW + 30, currentY + 2.3);
        drawCheckbox("Cantine", false, margin + halfW + 48, currentY + 2.3);
        drawCheckbox("Transport", false, margin + halfW + 68, currentY + 2.3);
        currentY += 10.5;

        // -------------------------------------------------------------
        // SECTION 2 : RESPONSABLES LÉGAUX / PARENTS
        // -------------------------------------------------------------
        currentY = drawSectionHeader("2. Renseignements sur les Parents / Tuteurs Légaux", currentY, "2");

        // --- PÈRE / TUTEUR 1 ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(37, 99, 235);
        doc.text("• PÈRE OU TUTEUR LÉGAL 1 :", margin + 1, currentY + 2.8);
        currentY += 4.2;

        const parent1FullName = [student?.parent1FirstName, student?.parent1LastName].filter(Boolean).join(' ');
        const parent1Phone = student?.parent1Contact || '';
        const parent1Email = student?.parent1Email || '';

        drawFieldBox("Nom & Prénoms du Père / Tuteur", parent1FullName, margin, currentY, 68);
        drawFieldBox("Profession / Entreprise", '', margin + 70, currentY, 48);
        drawFieldBox("Téléphone Principal (WhatsApp)", parent1Phone, margin + 120, currentY, contentWidth - 120);
        currentY += 8;

        drawFieldBox("Adresse Email", parent1Email, margin, currentY, halfW);
        drawFieldBox("Adresse Domicile / Précisions", student?.address || '', margin + halfW + 2, currentY, halfW);
        currentY += 9;

        // --- MÈRE / TUTRICES 2 ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(37, 99, 235);
        doc.text("• MÈRE OU TUTRICES 2 :", margin + 1, currentY + 2.8);
        currentY += 4.2;

        const parent2FullName = [student?.parent2FirstName, student?.parent2LastName].filter(Boolean).join(' ');
        const parent2Phone = student?.parent2Contact || '';
        const parent2Email = student?.parent2Email || '';

        drawFieldBox("Nom & Prénoms de la Mère / Tutrice", parent2FullName, margin, currentY, 68);
        drawFieldBox("Profession / Entreprise", '', margin + 70, currentY, 48);
        drawFieldBox("Téléphone Principal (WhatsApp)", parent2Phone, margin + 120, currentY, contentWidth - 120);
        currentY += 8;

        drawFieldBox("Adresse Email", parent2Email, margin, currentY, halfW);
        drawFieldBox("Adresse Domicile (si différente)", '', margin + halfW + 2, currentY, halfW);
        currentY += 10.5;

        // -------------------------------------------------------------
        // SECTION 3 : SANTÉ, ALLERGIES & URGENCE
        // -------------------------------------------------------------
        currentY = drawSectionHeader("3. Informations Médicales & Contact d'Urgence", currentY, "3");

        drawFieldBox("Groupe Sanguin (A+, O+, B-, ...)", '', margin, currentY, 42);
        drawFieldBox("Allergies, Asthme ou Pathologies Particulières", '', margin + 44, currentY, 82);
        drawFieldBox("Urgence : Nom & Tél à contacter", '', margin + 128, currentY, contentWidth - 128);
        currentY += 10.5;

        // -------------------------------------------------------------
        // SECTION 4 : PIÈCES OBLIGATOIRES À FOURNIR (Checklist)
        // -------------------------------------------------------------
        currentY = drawSectionHeader("4. Dossier à Fournir (Cocher les pièces jointes)", currentY, "4");

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, currentY, contentWidth, 14, 1.5, 1.5, 'FD');

        const col1X = margin + 3;
        const col2X = margin + (contentWidth / 2) + 2;

        drawCheckbox("Extrait d'Acte de Naissance (Original ou Copie légalisée)", false, col1X, currentY + 2.5);
        drawCheckbox("Dernier bulletin de notes de l'année précédente", false, col1X, currentY + 6.2);
        drawCheckbox("Certificat de Radiation (pour les nouveaux élèves)", false, col1X, currentY + 9.8);

        drawCheckbox("4 Photos d'identité récentes en couleur (Format 4x4)", false, col2X, currentY + 2.5);
        drawCheckbox("Photocopie du carnet de vaccination / Certificat médical", false, col2X, currentY + 6.2);
        drawCheckbox("Reçu de paiement des frais d'inscription / scolarité", false, col2X, currentY + 9.8);

        currentY += 16.5;

        // -------------------------------------------------------------
        // SECTION 5 : ENGAGEMENT DU PARENT & CADRE ADMINISTRATIF
        // -------------------------------------------------------------
        currentY = drawSectionHeader("5. Engagement & Approbations", currentY, "5");

        const boxH = 31;
        const halfBoxW = (contentWidth - 3) / 2;

        // CADRE GAUCHE : ENGAGEMENT DU PARENT / TUTEUR
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(margin, currentY, halfBoxW, boxH, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        doc.text("ENGAGEMENT DU RESPONSABLE LÉGAL", margin + 3, currentY + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(71, 85, 105);
        const parentDecl = "Je soussigné(e), certifie sur l'honneur l'exactitude des informations fournies ci-dessus et m'engage à respecter le règlement intérieur de l'établissement.";
        const declLines = doc.splitTextToSize(parentDecl, halfBoxW - 6);
        doc.text(declLines, margin + 3, currentY + 8.5);

        doc.setFontSize(6.8);
        doc.text("Fait à ................................., le ..... / ..... / 202...", margin + 3, currentY + 16.5);
        doc.setFont('helvetica', 'bold');
        doc.text("Signature du Parent (précédée de « Lu et approuvé ») :", margin + 3, currentY + 21);

        // CADRE DROITE : RÉSERVÉ À L'ADMINISTRATION
        const adminX = margin + halfBoxW + 3;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(adminX, currentY, halfBoxW, boxH, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(37, 99, 235);
        doc.text("RÉSERVÉ À L'ADMINISTRATION SCOLAIRE", adminX + 3, currentY + 4.5);

        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59);
        doc.text("Décision :", adminX + 3, currentY + 9);
        drawCheckbox("Inscrit(e)", false, adminX + 18, currentY + 7);
        drawCheckbox("Liste d'attente", false, adminX + 35, currentY + 7);
        drawCheckbox("Refusé", false, adminX + 57, currentY + 7);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(71, 85, 105);
        doc.text("Montant perçu : ............................ Date : ...../...../202...", adminX + 3, currentY + 15);

        doc.setFont('helvetica', 'bold');
        doc.text("Visa & Cachet de l'Établissement :", adminX + 3, currentY + 20);

        // -------------------------------------------------------------
        // BAS DE PAGE / FOOTER
        // -------------------------------------------------------------
        const footerY = pageHeight - 7;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
            `Fiche éditée le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })} — Logiciel de Gestion Scolaire GèreEcole`,
            margin,
            footerY + 1.5
        );
        doc.text("Page 1 / 1", pageWidth - margin, footerY + 1.5, { align: 'right' });

        // Téléchargement / Ouverture
        const fileNameSafeSchool = (school?.name || 'ecole').replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = student?.lastName 
            ? `Fiche_Inscription_${student.lastName}_${student.firstName || ''}.pdf`
            : `Fiche_Inscription_Vierge_${fileNameSafeSchool}_${currentSchoolYear}.pdf`;

        doc.save(fileName);
    }
}
