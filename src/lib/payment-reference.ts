import type { PlanName } from './subscription-plans';

export type PaymentReference =
    | { type: 'tuition'; schoolId: string; studentId: string; amount: number }
    | { type: 'subscription'; schoolId: string; planName: PlanName; durationMonths: number; amount: number };

const SEPARATOR = '__';

export function buildPaymentReference(ref: PaymentReference): string {
    if (ref.type === 'tuition') {
        return ['tuition', ref.schoolId, ref.studentId, ref.amount].join(SEPARATOR);
    }
    return ['subscription', ref.schoolId, ref.planName, ref.durationMonths, ref.amount].join(SEPARATOR);
}

export function parsePaymentReference(raw: string | null | undefined): PaymentReference | null {
    if (!raw) return null;
    const parts = raw.split(SEPARATOR);
    const type = parts[0];

    if (type === 'tuition' && parts.length >= 4) {
        const amount = parseFloat(parts[3]);
        if (!parts[1] || !parts[2] || Number.isNaN(amount)) return null;
        return { type: 'tuition', schoolId: parts[1], studentId: parts[2], amount };
    }

    if (type === 'subscription' && parts.length >= 5) {
        const durationMonths = parseInt(parts[3], 10);
        const amount = parseFloat(parts[4]);
        if (!parts[1] || !parts[2] || Number.isNaN(durationMonths) || Number.isNaN(amount)) return null;
        return {
            type: 'subscription',
            schoolId: parts[1],
            planName: parts[2] as PlanName,
            durationMonths,
            amount,
        };
    }

    return null;
}
