/**
 * Schémas Zod par entité importable. Chaque schéma valide une ligne
 * AVANT que l'`importRow` correspondant écrive dans Firestore — on
 * rejette les lignes invalides avec un message lisible plutôt que de
 * laisser passer un doc corrompu.
 *
 * Les transformations légères (trim, toUpperCase…) sont incluses ici,
 * pour que `importRow` reçoive une ligne propre.
 */
import { z } from 'zod';

const optionalString = z.preprocess(
    v => (v == null || v === '' ? undefined : String(v)),
    z.string().optional(),
);

const yearString = z.preprocess(
    v => (v == null || v === '' ? undefined : String(v).trim()),
    z.string().regex(/^\d{4}-\d{4}$/, 'Format AAAA-AAAA attendu').optional(),
);

const numericString = z.preprocess(
    v => (v == null || v === '' ? undefined : Number(v)),
    z.number().optional(),
);

const requiredNumber = z.preprocess(
    v => (v == null || v === '' ? undefined : Number(v)),
    z.number({ invalid_type_error: 'Nombre attendu' }),
);

const requiredString = z.preprocess(
    v => (v == null ? undefined : String(v).trim()),
    z.string().min(1, 'Champ obligatoire'),
);

const optionalEmail = z.preprocess(
    v => (v == null || v === '' ? undefined : String(v).trim()),
    z.string().email('Email invalide').optional(),
);

const studentSchema = z.object({
    firstName: requiredString,
    lastName: requiredString,
    dateOfBirth: z.preprocess(v => (v == null || v === '' ? undefined : v), z.union([z.string(), z.number()])),
    placeOfBirth: optionalString,
    gender: z.preprocess(
        v => (v == null ? undefined : String(v).trim().toUpperCase()),
        z.enum(['M', 'F', 'MASCULIN', 'FEMININ'], { errorMap: () => ({ message: 'Genre attendu: M ou F' }) }),
    ),
    className: requiredString,
    matricule: optionalString,
    email: optionalEmail,
    parentEmail: optionalEmail,
    parent1FirstName: optionalString,
    parent1LastName: optionalString,
    parent1Contact: optionalString,
    academicYear: yearString,
});

const teacherSchema = z.object({
    firstName: requiredString,
    lastName: requiredString,
    email: z.preprocess(v => (v == null ? undefined : String(v).trim()), z.string().email('Email invalide')),
    role: optionalString,
    subject: optionalString,
    phone: optionalString,
    academicYear: yearString,
});

const gradeSchema = z.object({
    studentMatricule: requiredString,
    subject: requiredString,
    grade: requiredNumber.refine(n => n >= 0 && n <= 20, 'Note hors [0,20]'),
    coefficient: requiredNumber.refine(n => n >= 0, 'Coefficient invalide'),
    type: requiredString,
    date: optionalString,
    academicYear: yearString,
});

const classSchema = z.object({
    name: requiredString,
    code: optionalString,
    cycleId: optionalString,
    niveauId: optionalString,
    maxStudents: numericString,
    academicYear: yearString,
});

const cycleSchema = z.object({
    name: requiredString,
    code: optionalString,
    order: numericString,
    isActive: z.preprocess(v => {
        if (v == null || v === '') return undefined;
        if (typeof v === 'boolean') return v;
        const s = String(v).trim().toLowerCase();
        if (['true', '1', 'oui', 'yes'].includes(s)) return true;
        if (['false', '0', 'non', 'no'].includes(s)) return false;
        return v;
    }, z.boolean().optional()),
});

const niveauSchema = z.object({
    name: requiredString,
    code: optionalString,
    cycleId: requiredString,
    order: numericString,
});

const feeSchema = z.object({
    grade: requiredString,
    amount: z.preprocess(v => (v == null || v === '' ? undefined : String(v)), z.string().min(1)),
    installments: z.preprocess(v => (v == null || v === '' ? undefined : String(v)), z.string().min(1)),
    details: optionalString,
    academicYear: yearString,
});

const paymentSchema = z.object({
    studentMatricule: requiredString,
    amount: requiredNumber.refine(n => n > 0, 'Montant positif requis'),
    date: requiredString,
    description: optionalString,
    method: z.preprocess(
        v => (v == null || v === '' ? undefined : String(v).trim()),
        z.enum(['Espèces', 'Chèque', 'Virement Bancaire', 'Paiement Mobile']).optional(),
    ),
    payerFirstName: optionalString,
    payerLastName: optionalString,
    academicYear: yearString,
});

const transactionSchema = z.object({
    date: requiredString,
    description: requiredString,
    category: requiredString,
    type: z.enum(['Revenu', 'Dépense']),
    amount: requiredNumber,
    academicYear: yearString,
});

export const IMPORT_SCHEMAS: Record<string, z.ZodTypeAny> = {
    students: studentSchema,
    teachers: teacherSchema,
    grades: gradeSchema,
    classes: classSchema,
    cycles: cycleSchema,
    niveaux: niveauSchema,
    fees: feeSchema,
    payments: paymentSchema,
    transactions: transactionSchema,
};

export function validateRow(entityId: string, row: Record<string, any>):
    | { ok: true; data: Record<string, any> }
    | { ok: false; error: string }
{
    const schema = IMPORT_SCHEMAS[entityId];
    if (!schema) return { ok: true, data: row };
    const result = schema.safeParse(row);
    if (!result.success) {
        const issues = result.error.issues
            .map(i => `${i.path.join('.') || 'row'}: ${i.message}`)
            .join(' ; ');
        return { ok: false, error: issues };
    }
    // On préserve les champs additionnels (le schema ne les supprime pas
    // par défaut), tout en bénéficiant des transformations sur les champs
    // déclarés.
    return { ok: true, data: { ...row, ...result.data } };
}
