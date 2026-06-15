/**
 * Garde-fous d'abonnement, source unique pour décider si une école peut :
 * - utiliser un module donné
 * - inscrire un nouvel élève
 * - créer un nouveau cycle
 *
 * Toutes les décisions s'appuient sur SUBSCRIPTION_PLANS (et `activeModules`)
 * — jamais sur des champs stockés sur `subscription` qui peuvent dériver.
 */
import { getPlanLimits, type ModuleName, type PlanName } from './subscription-plans';

export interface SubscriptionGuardInput {
    plan?: PlanName | string;
    status?: string;
    endDate?: string;
    activeModules?: ModuleName[];
    /** ISO date à laquelle le passage en past_due a eu lieu. */
    pastDueSince?: string;
}

/** Période de grâce après expiration durant laquelle l'accès reste actif. */
export const PAST_DUE_GRACE_DAYS = 7;

/**
 * Un abonnement est "effectivement actif" si :
 * - son statut est `active` ou `trialing` ET sa date de fin est dans le futur, OU
 * - son statut est `past_due` ET on est encore dans la fenêtre de grâce
 *   (PAST_DUE_GRACE_DAYS jours après `pastDueSince` ou `endDate` si manquant).
 */
export function isSubscriptionEffectivelyActive(sub?: SubscriptionGuardInput | null): boolean {
    if (!sub) return false;
    if (sub.status === 'past_due') {
        const since = sub.pastDueSince ? new Date(sub.pastDueSince) : (sub.endDate ? new Date(sub.endDate) : null);
        if (!since || Number.isNaN(since.getTime())) return false;
        const graceMs = PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000;
        return Date.now() - since.getTime() < graceMs;
    }
    const statusOk = sub.status === 'active' || sub.status === 'trialing';
    if (!statusOk) return false;
    if (!sub.endDate) return false;
    return new Date(sub.endDate).getTime() > Date.now();
}

/**
 * Indique s'il faut afficher un avertissement de paiement en attente
 * (échéance dépassée mais accès encore accordé).
 */
export function isInPastDueGrace(sub?: SubscriptionGuardInput | null): boolean {
    return !!sub && sub.status === 'past_due' && isSubscriptionEffectivelyActive(sub);
}

/**
 * Une école peut utiliser un module si :
 * - L'abonnement est actif ET
 *   - le plan Premium (tous modules inclus), OU
 *   - le module est listé dans `activeModules` (payé à la carte).
 *
 * Le plan Essentiel n'a PAS d'accès gratuit aux modules complémentaires
 * (cf. label "Accès aux modules complémentaires (payants)" dans
 * SUBSCRIPTION_PLANS).
 */
export function canAccessModule(
    sub: SubscriptionGuardInput | null | undefined,
    module: ModuleName,
): boolean {
    if (!isSubscriptionEffectivelyActive(sub)) return false;
    if (sub!.plan === 'Premium') return true;
    return !!sub!.activeModules?.includes(module);
}

/**
 * Nombre d'élèves restants avant d'atteindre la limite du plan. Renvoie
 * `Infinity` pour les plans illimités. Renvoie 0 si la limite est dépassée.
 */
export function remainingStudentSlots(
    sub: SubscriptionGuardInput | null | undefined,
    currentCount: number,
): number {
    const limits = getPlanLimits(sub?.plan);
    if (!limits) return 0;
    if (!Number.isFinite(limits.maxStudents)) return Infinity;
    return Math.max(0, limits.maxStudents - currentCount);
}

/**
 * Nombre de cycles restants avant d'atteindre la limite du plan.
 */
export function remainingCycleSlots(
    sub: SubscriptionGuardInput | null | undefined,
    currentCount: number,
): number {
    const limits = getPlanLimits(sub?.plan);
    if (!limits) return 0;
    if (!Number.isFinite(limits.maxCycles)) return Infinity;
    return Math.max(0, limits.maxCycles - currentCount);
}

/**
 * Helper de message d'erreur uniforme pour les limites atteintes.
 */
export function buildLimitReachedMessage(kind: 'students' | 'cycles', plan: string, limit: number): string {
    const label = kind === 'students' ? 'élèves' : 'cycles';
    return `LIMIT_REACHED: Votre plan ${plan} est limité à ${limit} ${label}. Mettez à niveau votre abonnement pour continuer.`;
}
