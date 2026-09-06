/**
 * Catalogue des entités importables.
 *
 * Chaque entité décrit :
 * - ses colonnes attendues (avec required + description)
 * - la fonction qui transforme une ligne brute en doc Firestore prêt à écrire
 * - le chemin de la collection cible (ou une fonction qui le calcule pour les
 *   sous-collections)
 *
 * Les descripteurs sont consommés par BulkImport pour générer templates,
 * validations et écritures sans avoir à toucher au composant pour ajouter
 * une nouvelle entité.
 */
import { collection, serverTimestamp, addDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { class_type, student } from '@/lib/data-types';

export interface ImportColumn {
    header: string;
    required: boolean;
    desc: string;
}

export interface ImportContext {
    firestore: Firestore;
    schoolId: string;
    rowYear: string;
    existingClasses: (class_type & { id: string })[];
    existingStudents: (student & { id: string })[];
}

export interface EntityDescriptor {
    id: string;
    label: string;
    columns: ImportColumn[];
    /**
     * Transforme une ligne brute et écrit le doc dans Firestore. Doit lancer
     * une `Error` lisible pour que la ligne soit comptée comme échouée.
     */
    importRow: (row: Record<string, any>, ctx: ImportContext) => Promise<void>;
}

function clean(row: Record<string, any>, schoolId: string, rowYear: string): Record<string, any> {
    return {
        ...row,
        schoolId,
        academicYear: rowYear,
        createdAt: serverTimestamp(),
    };
}

function parseDateOfBirth(raw: any): string | null {
    if (raw == null || raw === '') return null;
    if (typeof raw === 'number') {
        const date = new Date(Math.round((raw - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    if (typeof raw === 'string') {
        if (raw.includes('/')) {
            const parts = raw.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    return null;
}

function parseDate(raw: any): string | null {
    const iso = parseDateOfBirth(raw);
    if (iso) return iso;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

export const ENTITY_DESCRIPTORS: EntityDescriptor[] = [
    {
        id: 'students',
        label: 'Élèves',
        columns: [
            { header: 'firstName', required: true, desc: 'Prénom de l\'élève' },
            { header: 'lastName', required: true, desc: 'Nom de l\'élève' },
            { header: 'dateOfBirth', required: true, desc: 'Date de naissance (JJ/MM/AAAA)' },
            { header: 'placeOfBirth', required: false, desc: 'Lieu de naissance' },
            { header: 'gender', required: true, desc: 'Genre (M/F)' },
            { header: 'className', required: true, desc: 'Classe (ex: 6ème A)' },
            { header: 'matricule', required: false, desc: 'Matricule' },
            { header: 'email', required: false, desc: 'Email' },
            { header: 'parentEmail', required: false, desc: 'Email du parent' },
            { header: 'parent1FirstName', required: false, desc: 'Prénom du parent' },
            { header: 'parent1LastName', required: false, desc: 'Nom du parent' },
            { header: 'parent1Contact', required: false, desc: 'Téléphone du parent' },
            { header: 'academicYear', required: false, desc: 'Année (ex: 2024-2025). Vide = année cible' },
        ],
        async importRow(row, ctx) {
            if (!row.firstName || !row.lastName) throw new Error('Nom ou Prénom manquant');
            
            const cleanMatricule = row.matricule ? String(row.matricule).trim().toLowerCase() : null;
            const cleanFirstName = String(row.firstName).trim().toLowerCase();
            const cleanLastName = String(row.lastName).trim().toLowerCase();
            
            // Recherche d'un élève existant par matricule, ou à défaut par nom/prénom
            const existingStudent = ctx.existingStudents.find(s => {
                if (cleanMatricule && s.matricule && String(s.matricule).trim().toLowerCase() === cleanMatricule) return true;
                if (!cleanMatricule && s.firstName?.toLowerCase() === cleanFirstName && s.lastName?.toLowerCase() === cleanLastName) return true;
                return false;
            });

            const docData = clean(row, ctx.schoolId, ctx.rowYear);
            const dob = parseDateOfBirth(docData.dateOfBirth);
            if (dob) docData.dateOfBirth = dob;
            
            if (docData.className) {
                let target = ctx.existingClasses.find(c =>
                    c.name.toLowerCase().trim() === String(docData.className).toLowerCase().trim()
                    && (!c.academicYear || c.academicYear === ctx.rowYear),
                );
                
                if (!target) {
                    // Fallback: chercher la classe juste par son nom (pour les imports historiques)
                    target = ctx.existingClasses.find(c =>
                        c.name.toLowerCase().trim() === String(docData.className).toLowerCase().trim()
                    );
                }
                
                if (!target) throw new Error(`Classe "${docData.className}" introuvable (vérifiez l'orthographe exacte)`);
                docData.classId = target.id;
                docData.class = target.name;
            }
            
            docData.inscriptionYear = ctx.rowYear;
            docData.academicYear = docData.academicYear || ctx.rowYear;
            docData.academicYears = [docData.academicYear];
            docData.status = docData.status || 'Actif';
            docData.tuitionStatus = docData.tuitionStatus || 'Non payé';
            docData.amountDue = Number(docData.amountDue) || 0;
            docData.tuitionFee = Number(docData.tuitionFee) || 0;

            const newEnrollment: any = {
                schoolId: ctx.schoolId,
                academicYear: docData.academicYear,
                classId: docData.classId || "",
                status: docData.status,
                tuitionFee: docData.tuitionFee,
                amountDue: docData.amountDue,
                tuitionStatus: docData.tuitionStatus,
                createdAt: new Date().toISOString(),
                createdBy: 'import-system'
            };

            if (existingStudent) {
                // Mise à jour si l'élève existe déjà
                // On retire createdAt pour ne pas l'écraser, mais on peut mettre un updatedAt
                delete docData.createdAt;
                
                newEnrollment.studentId = existingStudent.id;
                
                // Merge enrollments (avoid duplicates)
                let existingEnrollments = existingStudent.enrollments || [];
                const enrollmentIndex = existingEnrollments.findIndex(e => e.academicYear === newEnrollment.academicYear);
                if (enrollmentIndex >= 0) {
                    existingEnrollments[enrollmentIndex] = { ...existingEnrollments[enrollmentIndex], ...newEnrollment };
                } else {
                    existingEnrollments.push(newEnrollment);
                }

                // Update academicYears array
                let existingAcademicYears = existingStudent.academicYears || [];
                if (existingStudent.academicYear && !existingAcademicYears.includes(existingStudent.academicYear)) {
                    existingAcademicYears.push(existingStudent.academicYear);
                }
                if (!existingAcademicYears.includes(docData.academicYear)) {
                    existingAcademicYears.push(docData.academicYear);
                }

                await updateDoc(doc(ctx.firestore, `ecoles/${ctx.schoolId}/eleves/${existingStudent.id}`), {
                    ...docData,
                    enrollments: existingEnrollments,
                    academicYears: existingAcademicYears,
                    updatedAt: serverTimestamp(),
                });
            } else {
                // Création normale
                const studentRef = doc(collection(ctx.firestore, `ecoles/${ctx.schoolId}/eleves`));
                newEnrollment.studentId = studentRef.id;
                docData.id = studentRef.id;
                docData.schoolId = ctx.schoolId;
                docData.enrollments = [newEnrollment];
                await setDoc(studentRef, docData);
            }
        },
    },

    {
        id: 'teachers',
        label: 'Enseignants / Personnel',
        columns: [
            { header: 'firstName', required: true, desc: 'Prénom' },
            { header: 'lastName', required: true, desc: 'Nom' },
            { header: 'email', required: true, desc: 'Email professionnel' },
            { header: 'role', required: false, desc: 'Rôle (enseignant, admin, ...)' },
            { header: 'subject', required: false, desc: 'Matière enseignée' },
            { header: 'phone', required: false, desc: 'Téléphone' },
            { header: 'academicYear', required: false, desc: 'Année d\'arrivée' },
        ],
        async importRow(row, ctx) {
            if (!row.firstName || !row.lastName) throw new Error('Nom ou Prénom manquant');
            if (!row.email) throw new Error('Email obligatoire');
            const doc = clean(row, ctx.schoolId, ctx.rowYear);
            doc.role = doc.role || 'enseignant';
            doc.status = doc.status || 'Actif';
            await addDoc(collection(ctx.firestore, `ecoles/${ctx.schoolId}/personnel`), doc);
        },
    },

    {
        id: 'grades',
        label: 'Notes',
        columns: [
            { header: 'studentMatricule', required: true, desc: 'Matricule de l\'élève' },
            { header: 'subject', required: true, desc: 'Matière' },
            { header: 'grade', required: true, desc: 'Note (0-20)' },
            { header: 'coefficient', required: true, desc: 'Coefficient' },
            { header: 'type', required: true, desc: 'Type (Devoir, Composition…)' },
            { header: 'date', required: false, desc: 'Date (JJ/MM/AAAA)' },
            { header: 'academicYear', required: false, desc: 'Année (ex: 2023-2024)' },
        ],
        async importRow(row, ctx) {
            if (!row.studentMatricule) throw new Error('Matricule manquant');
            if (!row.subject) throw new Error('Matière manquante');
            if (row.grade == null || row.grade === '') throw new Error('Note manquante');
            const gradeValue = Number(row.grade);
            if (Number.isNaN(gradeValue) || gradeValue < 0 || gradeValue > 20) {
                throw new Error(`Note invalide (${row.grade})`);
            }
            const cleanMatricule = String(row.studentMatricule).trim().toLowerCase();
            const studentDoc = ctx.existingStudents.find(s =>
                s.matricule && String(s.matricule).trim().toLowerCase() === cleanMatricule,
            );
            if (!studentDoc) throw new Error(`Élève "${row.studentMatricule}" introuvable`);
            const date = parseDate(row.date) ?? new Date().toISOString().split('T')[0];
            await addDoc(collection(ctx.firestore, `ecoles/${ctx.schoolId}/eleves/${studentDoc.id}/notes`), {
                schoolId: ctx.schoolId,
                subject: row.subject,
                grade: gradeValue,
                coefficient: Number(row.coefficient || 1),
                type: row.type || 'Devoir',
                date,
                academicYear: ctx.rowYear,
                createdAt: serverTimestamp(),
            });
        },
    },

    {
        id: 'classes',
        label: 'Classes',
        columns: [
            { header: 'name', required: true, desc: 'Nom (ex: 6ème A)' },
            { header: 'code', required: false, desc: 'Code court' },
            { header: 'cycleId', required: false, desc: 'ID du cycle' },
            { header: 'niveauId', required: false, desc: 'ID du niveau' },
            { header: 'maxStudents', required: false, desc: 'Effectif maximum' },
            { header: 'academicYear', required: false, desc: 'Année (vide = cible)' },
        ],
        async importRow(row, ctx) {
            if (!row.name) throw new Error('Nom de classe manquant');
            const doc = clean(row, ctx.schoolId, ctx.rowYear);
            doc.studentCount = 0;
            doc.status = doc.status || 'active';
            doc.maxStudents = Number(doc.maxStudents) || 50;
            await addDoc(collection(ctx.firestore, `ecoles/${ctx.schoolId}/classes`), doc);
        },
    },

    {
        id: 'cycles',
        label: 'Cycles',
        columns: [
            { header: 'name', required: true, desc: 'Nom du cycle (ex: Primaire)' },
            { header: 'code', required: false, desc: 'Code court' },
            { header: 'order', required: false, desc: 'Ordre d\'affichage (1, 2, 3…)' },
            { header: 'isActive', required: false, desc: 'true / false' },
        ],
        async importRow(row, ctx) {
            if (!row.name) throw new Error('Nom du cycle manquant');
            const doc = clean(row, ctx.schoolId, ctx.rowYear);
            doc.order = Number(doc.order) || 1;
            doc.isActive = doc.isActive == null ? true : Boolean(doc.isActive);
            await addDoc(collection(ctx.firestore, `ecoles/${ctx.schoolId}/cycles`), doc);
        },
    },

    {
        id: 'niveaux',
        label: 'Niveaux',
        columns: [
            { header: 'name', required: true, desc: 'Nom (ex: CP1)' },
            { header: 'code', required: false, desc: 'Code court' },
            { header: 'cycleId', required: true, desc: 'ID du cycle parent' },
            { header: 'order', required: false, desc: 'Ordre d\'affichage' },
        ],
        async importRow(row, ctx) {
            if (!row.name) throw new Error('Nom du niveau manquant');
            if (!row.cycleId) throw new Error('cycleId manquant');
            const doc = clean(row, ctx.schoolId, ctx.rowYear);
            doc.order = Number(doc.order) || 1;
            await addDoc(collection(ctx.firestore, `ecoles/${ctx.schoolId}/niveaux`), doc);
        },
    },

    {
        id: 'fees',
        label: 'Frais de scolarité',
        columns: [
            { header: 'grade', required: true, desc: 'Niveau (ex: CP1)' },
            { header: 'amount', required: true, desc: 'Montant total' },
            { header: 'installments', required: true, desc: 'Nombre d\'échéances' },
            { header: 'details', required: false, desc: 'Description' },
            { header: 'academicYear', required: false, desc: 'Année concernée' },
        ],
        async importRow(row, ctx) {
            if (!row.grade) throw new Error('Niveau manquant');
            if (row.amount == null) throw new Error('Montant manquant');
            const doc = clean(row, ctx.schoolId, ctx.rowYear);
            doc.amount = String(doc.amount);
            doc.installments = String(doc.installments);
            await addDoc(collection(ctx.firestore, `ecoles/${ctx.schoolId}/frais_scolarite`), doc);
        },
    },

    {
        id: 'payments',
        label: 'Paiements élèves',
        columns: [
            { header: 'studentMatricule', required: true, desc: 'Matricule de l\'élève' },
            { header: 'amount', required: true, desc: 'Montant payé' },
            { header: 'date', required: true, desc: 'Date du paiement (JJ/MM/AAAA)' },
            { header: 'description', required: false, desc: 'Libellé' },
            { header: 'method', required: false, desc: 'Espèces / Chèque / Virement Bancaire / Paiement Mobile' },
            { header: 'payerFirstName', required: false, desc: 'Prénom du payeur' },
            { header: 'payerLastName', required: false, desc: 'Nom du payeur' },
            { header: 'academicYear', required: false, desc: 'Année (ex: 2023-2024)' },
        ],
        async importRow(row, ctx) {
            if (!row.studentMatricule) throw new Error('Matricule manquant');
            const amount = Number(row.amount);
            if (Number.isNaN(amount) || amount <= 0) throw new Error('Montant invalide');
            const cleanMatricule = String(row.studentMatricule).trim().toLowerCase();
            const studentDoc = ctx.existingStudents.find(s =>
                s.matricule && String(s.matricule).trim().toLowerCase() === cleanMatricule,
            );
            if (!studentDoc) throw new Error(`Élève "${row.studentMatricule}" introuvable`);
            const date = parseDate(row.date) ?? new Date().toISOString().split('T')[0];
            await addDoc(collection(ctx.firestore, `ecoles/${ctx.schoolId}/eleves/${studentDoc.id}/paiements`), {
                schoolId: ctx.schoolId,
                studentId: studentDoc.id,
                amount,
                date,
                description: row.description || 'Paiement importé',
                method: row.method || 'Espèces',
                payerFirstName: row.payerFirstName || 'Parent',
                payerLastName: row.payerLastName || '',
                academicYear: ctx.rowYear,
                createdAt: serverTimestamp(),
            });
        },
    },

    {
        id: 'transactions',
        label: 'Transactions comptables',
        columns: [
            { header: 'date', required: true, desc: 'Date (JJ/MM/AAAA)' },
            { header: 'description', required: true, desc: 'Libellé' },
            { header: 'category', required: true, desc: 'Catégorie' },
            { header: 'type', required: true, desc: 'Revenu / Dépense' },
            { header: 'amount', required: true, desc: 'Montant' },
            { header: 'academicYear', required: false, desc: 'Année comptable' },
        ],
        async importRow(row, ctx) {
            if (!row.date) throw new Error('Date manquante');
            if (!row.description) throw new Error('Description manquante');
            const amount = Number(row.amount);
            if (Number.isNaN(amount)) throw new Error('Montant invalide');
            if (row.type !== 'Revenu' && row.type !== 'Dépense') throw new Error('Type invalide (Revenu / Dépense)');
            const date = parseDate(row.date) ?? new Date().toISOString().split('T')[0];
            await addDoc(collection(ctx.firestore, `ecoles/${ctx.schoolId}/comptabilite`), {
                schoolId: ctx.schoolId,
                date,
                description: row.description,
                category: row.category,
                type: row.type,
                amount,
                academicYear: ctx.rowYear,
                createdAt: serverTimestamp(),
            });
        },
    },
];

export function getDescriptor(id: string): EntityDescriptor | undefined {
    return ENTITY_DESCRIPTORS.find(e => e.id === id);
}
