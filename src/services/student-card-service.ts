'use client';

import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface StudentCardData {
    id: string;
    firstName: string;
    lastName: string;
    matricule: string;
    className: string;
    academicYear: string;
    photoUrl?: string;
    dateOfBirth?: string;
}

export interface SchoolCardInfo {
    name: string;
    logoUrl?: string;
    motto?: string;
    phone?: string;
}

export class StudentCardService {
    /**
     * Génère une planche PDF de cartes d'identité (A4, 8 cartes par page)
     */
    static async generateCardsPDF(students: StudentCardData[], school: SchoolCardInfo) {
        // Format A4 Portrait
        const doc = new jsPDF('portrait', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        
        // Configuration de la grille (2 colonnes x 4 lignes = 8 cartes)
        const cardWidth = 86; // Format carte bancaire standard (~85.6mm)
        const cardHeight = 54;
        const marginX = (pageWidth - (cardWidth * 2)) / 3;
        const marginY = (pageHeight - (cardHeight * 4)) / 5;

        let cursorX = marginX;
        let cursorY = marginY;
        let cardCount = 0;

        for (let i = 0; i < students.length; i++) {
            const student = students[i];

            if (cardCount > 0 && cardCount % 8 === 0) {
                doc.addPage();
                cursorX = marginX;
                cursorY = marginY;
            }

            // --- DESSIN DE LA CARTE ---
            
            // 1. Fond et Bordure
            doc.setDrawColor(200, 200, 200);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(cursorX, cursorY, cardWidth, cardHeight, 3, 3, 'FD');

            // 2. Bandeau Supérieur (Couleur de l'école)
            doc.setFillColor(15, 23, 42); // slate-900
            doc.roundedRect(cursorX, cursorY, cardWidth, 12, 3, 3, 'F');
            // Masquer les coins arrondis en bas du bandeau
            doc.rect(cursorX, cursorY + 9, cardWidth, 3, 'F');

            // Logo de l'école (si disponible)
            if (school.logoUrl) {
                try {
                    doc.addImage(school.logoUrl, 'PNG', cursorX + 2, cursorY + 1, 10, 10);
                } catch (e) {
                    console.error("Erreur chargement logo:", e);
                }
            }

            // Nom de l'école
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text(school.name.toUpperCase(), cursorX + 15, cursorY + 7);
            
            if (school.motto) {
                doc.setFontSize(5);
                doc.setFont("helvetica", "italic");
                doc.text(school.motto, cursorX + 15, cursorY + 10);
            }

            // 3. Titre de la carte
            doc.setTextColor(37, 99, 235); // blue-600
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("CARTE D'IDENTITÉ SCOLAIRE", cursorX + (cardWidth / 2), cursorY + 16, { align: 'center' });
            
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(6);
            doc.setFont("helvetica", "normal");
            doc.text(`Année: ${student.academicYear}`, cursorX + (cardWidth / 2), cursorY + 19, { align: 'center' });

            // 4. Photo de l'élève
            const photoSize = 22;
            doc.setDrawColor(15, 23, 42);
            doc.rect(cursorX + 4, cursorY + 22, photoSize, photoSize);
            
            if (student.photoUrl) {
                try {
                    doc.addImage(student.photoUrl, 'JPEG', cursorX + 4, cursorY + 22, photoSize, photoSize);
                } catch (e) {
                    // Placeholder si erreur
                    doc.setFillColor(241, 245, 249);
                    doc.rect(cursorX + 4, cursorY + 22, photoSize, photoSize, 'F');
                }
            } else {
                // Placeholder avatar par défaut
                doc.setFillColor(241, 245, 249); // slate-100
                doc.rect(cursorX + 4, cursorY + 22, photoSize, photoSize, 'F');
                doc.setTextColor(150, 150, 150);
                doc.setFontSize(10);
                doc.text("PHOTO", cursorX + 4 + (photoSize / 2), cursorY + 22 + (photoSize / 2) + 3, { align: 'center' });
            }

            // 5. Informations de l'élève
            let textY = cursorY + 25;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(7);
            
            doc.setFont("helvetica", "normal");
            doc.text("Nom :", cursorX + 30, textY);
            doc.setFont("helvetica", "bold");
            doc.text(student.lastName.toUpperCase(), cursorX + 40, textY);
            
            textY += 4;
            doc.setFont("helvetica", "normal");
            doc.text("Prénom :", cursorX + 30, textY);
            doc.setFont("helvetica", "bold");
            doc.text(student.firstName, cursorX + 45, textY);

            textY += 4;
            doc.setFont("helvetica", "normal");
            doc.text("Classe :", cursorX + 30, textY);
            doc.setFont("helvetica", "bold");
            doc.text(student.className, cursorX + 42, textY);

            textY += 4;
            doc.setFont("helvetica", "normal");
            doc.text("Matricule :", cursorX + 30, textY);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(220, 38, 38); // red-600
            doc.text(student.matricule, cursorX + 46, textY);

            if (student.dateOfBirth) {
                textY += 4;
                doc.setTextColor(0, 0, 0);
                doc.setFont("helvetica", "normal");
                doc.text("Né(e) le :", cursorX + 30, textY);
                doc.setFont("helvetica", "bold");
                doc.text(student.dateOfBirth, cursorX + 45, textY);
            }

            // 6. QR Code
            try {
                // Le QR code contient l'ID unique de l'élève pour le système de pointage
                const qrDataUrl = await QRCode.toDataURL(student.id, { margin: 1, width: 60 });
                const qrSize = 18;
                doc.addImage(qrDataUrl, 'PNG', cursorX + cardWidth - qrSize - 4, cursorY + 22, qrSize, qrSize);
            } catch (err) {
                console.error("Erreur génération QR:", err);
            }

            // 7. Pied de carte
            doc.setFillColor(241, 245, 249);
            doc.roundedRect(cursorX, cursorY + cardHeight - 6, cardWidth, 6, 3, 3, 'F');
            doc.rect(cursorX, cursorY + cardHeight - 6, cardWidth, 3, 'F');
            
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(5);
            doc.setFont("helvetica", "normal");
            doc.text("En cas de perte, veuillez rapporter cette carte à la direction de l'école.", cursorX + (cardWidth / 2), cursorY + cardHeight - 2, { align: 'center' });

            // Mise à jour des positions
            cardCount++;
            if (cardCount % 2 === 0) {
                // Passer à la ligne suivante
                cursorX = marginX;
                cursorY += cardHeight + marginY;
            } else {
                // Passer à la colonne de droite
                cursorX += cardWidth + marginX;
            }
        }

        // 8. Sauvegarde du PDF
        const safeClassName = students.length > 0 ? students[0].className.replace(/[^a-zA-Z0-9]/g, '_') : 'Classe';
        doc.save(`Cartes_Scolaires_${safeClassName}.pdf`);
    }
}
