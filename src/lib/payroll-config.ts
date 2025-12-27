
'use server';

// This file is now dedicated to payroll-specific configurations.
// Billing configurations have been moved to billing-calculator.ts to avoid circular dependencies.

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
