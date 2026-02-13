

import { collection, getCountFromServer, query, where, type Firestore } from 'firebase/firestore';
import type { school as School, student as Student, cycle as Cycle } from '@/lib/data-types';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';

// ====================================================================================
// CONFIGURATIONS DE FACTURATION CENTRALISÉES
// ====================================================================================

export const TARIFAIRE = {
    Essentiel: { prixMensuel: 0, cyclesInclus: 5, elevesInclus: 50, stockageInclus: 1 },
    Pro: { prixMensuel: 49900, cyclesInclus: 5, elevesInclus: 250, stockageInclus: 10 },
    Premium: { prixMensuel: 99900, cyclesInclus: Infinity, elevesInclus: Infinity, stockageInclus: Infinity },
};

export const SUPPLEMENTS = {
    parCycle: 5000,
    parEleve: 250,
    parGoStockage: 1000,
};

export const MODULE_PRICES = {
    sante: 5000,
    cantine: 10000,
    transport: 10000,
    internat: 15000,
    rh: 15000,
    immobilier: 10000,
    activites: 5000,
} as const;


// ====================================================================================
// LOGIQUE DE CALCUL
// ====================================================================================

export interface MonthlyUsage {
    studentsCount: number;
    cyclesCount: number;
    storageUsed: number; // en Go
}

interface BillingProjection {
    base: number;
    supplements: {
        modules: number;
        cycles: number;
        students: number;
        storage: number;
    };
    total: number;
}

/**
 * Calcule l'utilisation mensuelle actuelle pour une école.
 */
export async function calculateMonthlyUsage(firestore: Firestore, schoolId: string): Promise<MonthlyUsage> {
    const studentsQuery = query(collection(firestore, `ecoles/${schoolId}/eleves`), where('status', '==', 'Actif'));
    const cyclesQuery = query(collection(firestore, `ecoles/${schoolId}/cycles`), where('isActive', '==', true));

    // Pour le stockage, c'est généralement plus complexe et nécessite des intégrations backend.
    // Pour le moment, nous allons utiliser une valeur statique.
    const storageUsed = 0.5; // Exemple : 0.5 Go

    try {
        const [studentsSnap, cyclesSnap] = await Promise.all([
            getCountFromServer(studentsQuery),
            getCountFromServer(cyclesQuery)
        ]);

        return {
            studentsCount: studentsSnap.data().count,
            cyclesCount: cyclesSnap.data().count,
            storageUsed: storageUsed,
        };
    } catch (error) {
        console.error("Erreur lors du calcul de l'utilisation:", error);
        throw new Error("Impossible de calculer les métriques d'utilisation.");
    }
}

/**
 * Calcule la prévision de facturation basée sur l'abonnement et l'utilisation.
 */
export async function applyPricing(
    subscription: School['subscription'],
    usage: MonthlyUsage
): Promise<BillingProjection> {

    if (!subscription || !subscription.plan) {
        throw new Error("Plan d'abonnement non défini.");
    }

    // 1. Récupération des détails du plan
    const planDetails = SUBSCRIPTION_PLANS.find(p => p.name === subscription.plan);

    if (!planDetails) {
        throw new Error(`Plan d'abonnement inconnu: ${subscription.plan}`);
    }

    // 2. Calcul du coût de base (Coût par élève)
    // Le plan Essentiel est gratuit jusqu'à 50 élèves (limite hard codée ou gérée par le plan)
    // Les plans Pro et Premium sont facturés par élève.

    let baseCost = 0;

    if (subscription.plan === 'Essentiel') {
        baseCost = 0;
        // Si plus de 50 élèves, on pourrait bloquer ou facturer, mais pour l'instant c'est une limite d'usage.
    } else {
        const studentPrice = planDetails.pricePerStudent || 0;
        baseCost = usage.studentsCount * studentPrice;
    }

    // 3. Calcul du coût des modules
    // Premium inclut tous les modules, les autres paient à la carte.
    let modulesCost = 0;
    if (subscription.plan !== 'Premium' && subscription.activeModules) {
        modulesCost = subscription.activeModules.reduce((total, moduleId) => {
            const modulePrice = MODULE_PRICES[moduleId] || 0;
            return total + modulePrice;
        }, 0);
    }

    // Pour le plan Premium, les modules sont inclus (coût 0).

    // 4. Calcul des coûts des suppléments (Stockage uniquement)
    const storageLimit = planDetails.storageLimitGB;

    const storageSupplement = Math.max(0, Math.ceil(usage.storageUsed - storageLimit)) * SUPPLEMENTS.parGoStockage;

    // 5. Calcul du total
    const total = baseCost + modulesCost + storageSupplement;

    return {
        base: baseCost,
        supplements: {
            modules: modulesCost,
            cycles: 0, // Plus de supplément cycle dans ce modèle
            students: 0, // Inclus dans le baseCost (prix par élève)
            storage: storageSupplement,
        },
        total: total,
    };
}
