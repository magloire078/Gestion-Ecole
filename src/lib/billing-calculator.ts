

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
