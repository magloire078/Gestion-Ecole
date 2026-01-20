

import { collection, getCountFromServer, query, where, type Firestore } from 'firebase/firestore';
import type { school as School, student as Student, cycle as Cycle } from '@/lib/data-types';

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

interface MonthlyUsage {
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

    const planDetails = TARIFAIRE[subscription.plan];
    if (!planDetails) {
        throw new Error(`Plan d'abonnement inconnu: ${subscription.plan}`);
    }

    // 1. Calcul du coût des modules
    let modulesCost = 0;
    if (subscription.plan === 'Pro' && subscription.activeModules) {
        modulesCost = subscription.activeModules.reduce((total, module) => {
            return total + (MODULE_PRICES[module] || 0);
        }, 0);
    }

    // 2. Calcul des coûts des suppléments
    const extraCycles = Math.max(0, usage.cyclesCount - planDetails.cyclesInclus);
    const extraStudents = Math.max(0, usage.studentsCount - planDetails.elevesInclus);
    const extraStorage = Math.max(0, usage.storageUsed - planDetails.stockageInclus);
    
    const cyclesSupplement = extraCycles * SUPPLEMENTS.parCycle;
    const studentsSupplement = extraStudents * SUPPLEMENTS.parEleve;
    const storageSupplement = Math.ceil(extraStorage) * SUPPLEMENTS.parGoStockage; // Facturé par Go entier

    // 3. Calcul du total
    const baseCost = planDetails.prixMensuel;
    const totalSupplements = modulesCost + cyclesSupplement + studentsSupplement + storageSupplement;
    const total = baseCost + totalSupplements;

    return {
        base: baseCost,
        supplements: {
            modules: modulesCost,
            cycles: cyclesSupplement,
            students: studentsSupplement,
            storage: storageSupplement,
        },
        total: total,
    };
}
