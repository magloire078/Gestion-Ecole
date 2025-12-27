
'use server';

// This file is now dedicated to payroll-specific configurations.
// Billing configurations have been moved to billing-calculator.ts to avoid circular dependencies.

import { TRANCHES_IGR as TI } from './billing-calculator';

export const TRANCHES_IGR = TI;
