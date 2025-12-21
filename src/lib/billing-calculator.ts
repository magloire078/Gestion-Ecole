

'use server';
import { collection, getCountFromServer, query, where, type Firestore } from 'firebase/firestore';
import type { school as School, student as Student, cycle as Cycle } from '@/lib/data-types';
import { TARIFAIRE, SUPPLEMENTS, MODULE_PRICES } from './payroll-config';


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
