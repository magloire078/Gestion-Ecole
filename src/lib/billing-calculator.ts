

'use server';
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

export const TRANCHES_IGR = [
    {limite: 25000, taux: 0},
    {limite: 46250, taux: 0.10},
    {limite: 73750, taux: 0.15},
    {limite: 121250, taux: 0.20},
    {limite: 203750, taux: 0.25},
    {limite: 346250, taux: 0.35},
    {limite: 843750, taux: 0.45},
    {limite: Infinity, taux: 0.60}
];


// ====================================================================================
// FONCTIONS DE CALCUL
// ====================================================================================

interface UsageData {
  cyclesCount: number;
  studentsCount: number;
  storageUsed: number; // en Go, pour l'instant une valeur fictive
  month: string;
}


export async function calculateMonthlyUsage(firestore: Firestore, schoolId: string): Promise<UsageData> {
  const currentYear = new Date().getFullYear();
  const month = new Date().toISOString().slice(0, 7);

  // Nombre de cycles actifs
  const cyclesQuery = query(collection(firestore, `ecoles/${schoolId}/cycles`), where('isActive', '==', true));
  const cyclesSnapshot = await getCountFromServer(cyclesQuery);
  const cyclesCount = cyclesSnapshot.data().count;

  // Nombre d'élèves actifs (inscrits cette année)
  const studentsQuery = query(
    collection(firestore, `ecoles/${schoolId}/eleves`),
    where('inscriptionYear', '==', currentYear),
    where('status', '==', 'Actif')
  );
  const studentsSnapshot = await getCountFromServer(studentsQuery);
  const studentsCount = studentsSnapshot.data().count;

  // Stockage utilisé (valeur fictive pour l'instant)
  const storageUsed = 2.5;

  return {
    cyclesCount,
    studentsCount,
    storageUsed,
    month,
  };
}

export async function applyPricing(subscription: School['subscription'], usage: UsageData) {
  if (!subscription || !subscription.plan) {
      throw new Error("Abonnement non défini ou plan manquant.");
  }
  
  const planDetails = TARIFAIRE[subscription.plan];
  if (!planDetails) {
      throw new Error(`Détails du plan '${subscription.plan}' non trouvés.`);
  }

  const { prixMensuel, cyclesInclus, elevesInclus, stockageInclus } = planDetails;
  const { cyclesCount, studentsCount, storageUsed } = usage;

  let total = prixMensuel;
  const supplements = {
    cycles: 0,
    students: 0,
    storage: 0,
    modules: 0,
  };

  // Supplément cycles
  if (cyclesCount > cyclesInclus) {
    const extraCycles = cyclesCount - cyclesInclus;
    supplements.cycles = extraCycles * SUPPLEMENTS.parCycle;
  }

  // Supplément élèves
  if (studentsCount > elevesInclus) {
    const extraStudents = studentsCount - elevesInclus;
    supplements.students = extraStudents * SUPPLEMENTS.parEleve;
  }

  // Supplément stockage
  if (storageUsed > stockageInclus) {
    const extraStorage = storageUsed - stockageInclus;
    supplements.storage = Math.ceil(extraStorage) * SUPPLEMENTS.parGoStockage;
  }

  // Coût des modules complémentaires (sauf si Premium)
  if (subscription.plan !== 'Premium' && subscription.activeModules) {
    for (const moduleId of subscription.activeModules) {
        if (moduleId in MODULE_PRICES) {
            supplements.modules += MODULE_PRICES[moduleId as keyof typeof MODULE_PRICES];
        }
    }
  }


  total += supplements.cycles + supplements.students + supplements.storage + supplements.modules;

  return {
    base: prixMensuel,
    supplements,
    total,
    usage,
  };
}
