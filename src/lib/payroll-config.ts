

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
