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
}

/**
 * Un abonnement est "effectivement actif" si son statut est `active` ou
 * `trialing` ET que sa date de fin n'est pas dans le passé.
 */
export function isSubscriptionEffectivelyActive(sub?: SubscriptionGuardInput | null): boolean {
    if (!sub) return false;
    const statusOk = sub.status === 'active' || sub.status === 'trialing';
    if (!statusOk) return false;
    if (!sub.endDate) return false;
    return new Date(sub.endDate).getTime() > Date.now();
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
