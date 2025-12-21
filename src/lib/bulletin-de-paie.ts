
'use server';

import { isValid, parseISO, lastDayOfMonth, format, differenceInYears, differenceInMonths, differenceInDays, addYears, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { numberToWords } from "french-numbers-to-words";
import placeholderImages from '@/lib/placeholder-images.json';
import type { staff as Employe, school as OrganizationSettings } from '@/lib/data-types';

// ====================================================================================
// 1. DATA TYPES 
// ====================================================================================

export type PayslipEarning = {
    label: string;
    amount: number;
};

export type PayslipDeduction = {
    label: string;
    amount: number;
};

export type PayslipEmployerContribution = {
    label: string;
    base: number;
    rate: string;
    amount: number;
};

// This type extends the base employee with calculated/static data for the payslip
export type PayslipEmployeeInfo = Employe & {
    numeroCompteComplet?: string;
    anciennete: string;
    paymentDate: string;
    paymentLocation: string;
    parts: number;
};


export type PayslipDetails = {
    employeeInfo: PayslipEmployeeInfo;
    earnings: PayslipEarning[];
    deductions: PayslipDeduction[];
    totals: {
        brutImposable: number;
        transportNonImposable: { label: string; amount: number };
        netAPayer: number;
        netAPayerInWords: string;
    };
    employerContributions: PayslipEmployerContribution[];
    organizationSettings: OrganizationSettings & { secondaryLogoUrl?: string; };
};

// ====================================================================================
// 2. UTILITY FUNCTIONS
// ====================================================================================

function toWords(num: number): string {
    if (num === 0) return 'ZÉRO';
    return numberToWords(num).toUpperCase();
}


function calculateSeniority(hireDateStr: string, payslipDateStr: string): { text: string, years: number } {
    if (!hireDateStr || !payslipDateStr) return { text: 'N/A', years: 0 };
    
    const hireDate = parseISO(hireDateStr);
    const payslipDate = parseISO(payslipDateStr);

    if (!isValid(hireDate) || !isValid(payslipDate)) return { text: 'Dates invalides', years: 0 };

    const years = differenceInYears(payslipDate, hireDate);
    const dateAfterYears = addYears(hireDate, years);
    const months = differenceInMonths(payslipDate, dateAfterYears);
    const dateAfterMonths = addMonths(dateAfterYears, months);
    const days = differenceInDays(payslipDate, dateAfterMonths);

    return {
        text: `${years} an(s), ${months} mois, ${days} jour(s)`,
        years: years
    };
}

function calculateParts(situation: Employe['situationMatrimoniale'], enfants: number = 0): number {
    switch(situation) {
        case 'Marié(e)':
            return 2 + (enfants * 0.5);
        case 'Veuf(ve)':
            return 1.5 + (enfants * 0.5);
        case 'Divorcé(e)':
        case 'Célibataire':
            if (enfants > 0) {
                return 1.5 + ((enfants - 1) * 0.5);
            }
            return 1;
        default:
            return 1;
    }
}


// ====================================================================================
// 3. PAYSLIP CALCULATION LOGIC
// ====================================================================================

export async function getPayslipDetails(
    employee: Employe,
    payslipDate: string, 
    organizationSettings: OrganizationSettings
): Promise<PayslipDetails> {
    
    const { baseSalary = 0, ...otherFields } = employee;
    
    const seniorityInfo = calculateSeniority(employee.hireDate || '', payslipDate);
    
    let primeAnciennete = 0;
    if (seniorityInfo.years >= 2) {
        let bonusRate = 0;
        if (seniorityInfo.years >= 25) bonusRate = 25;
        else if (seniorityInfo.years >= 20) bonusRate = 20;
        else if (seniorityInfo.years >= 15) bonusRate = 15;
        else if (seniorityInfo.years >= 10) bonusRate = 10;
        else if (seniorityInfo.years >= 5) bonusRate = 5;
        else if (seniorityInfo.years >= 2) bonusRate = 2;
        
        primeAnciennete = baseSalary * (bonusRate / 100);
    }

    const earningsMap: { [key: string]: { label: string; amount: number } } = {
        baseSalary: { label: 'SALAIRE DE BASE', amount: baseSalary },
        primeAnciennete: { label: 'PRIME D\'ANCIENNETE', amount: primeAnciennete },
        indemniteTransportImposable: { label: 'INDEMNITE DE TRANSPORT IMPOSABLE', amount: otherFields.indemniteTransportImposable || 0 },
        indemniteSujetion: { label: 'INDEMNITE DE SUJETION', amount: otherFields.indemniteSujetion || 0 },
        indemniteCommunication: { label: 'INDEMNITE DE COMMUNICATION', amount: otherFields.indemniteCommunication || 0 },
        indemniteRepresentation: { label: 'INDEMNITE DE REPRESENTATION', amount: otherFields.indemniteRepresentation || 0 },
        indemniteResponsabilite: { label: 'INDEMNITE DE RESPONSABILITE', amount: otherFields.indemniteResponsabilite || 0 },
        indemniteLogement: { label: 'INDEMNITE DE LOGEMENT', amount: otherFields.indemniteLogement || 0 },
    };

    const earnings: PayslipEarning[] = Object.values(earningsMap)
        .filter(item => item.amount > 0)
        .map(item => ({...item, amount: Math.round(item.amount)}));
        
    const brutImposable = earnings.reduce((sum, item) => sum + item.amount, 0);
    
    // --- Déductions fiscales ---
    const cnps = employee.CNPS ? (brutImposable * 0.063) : 0;
    
    // Base de calcul pour ITS, CN, IGR
    const baseCalculITS = brutImposable * 0.8; // Abattement de 20%
    
    // Calcul de l'ITS
    const its = baseCalculITS * 0.015;

    // Calcul de la Contribution Nationale (CN)
    let cn = 0;
    if (baseCalculITS > 50000) {
        const tranche1 = Math.min(baseCalculITS, 130000) - 50000;
        const tranche2 = baseCalculITS > 130000 ? Math.min(baseCalculITS, 200000) - 130000 : 0;
        const tranche3 = Math.max(0, baseCalculITS - 200000);
        cn = (tranche1 * 0.015) + (tranche2 * 0.05) + (tranche3 * 0.10);
    }
    
    // Calcul de l'IGR
    const N = baseCalculITS - (its + cn);
    const parts = calculateParts(employee.situationMatrimoniale, employee.enfants);
    const Q = Math.floor(N / parts);
    
    const getIGRFromTranche = (revenu: number) => {
        const tranches = [
            {limite: 25000, taux: 0},
            {limite: 46250, taux: 0.10},
            {limite: 73750, taux: 0.15},
            {limite: 121250, taux: 0.20},
            {limite: 203750, taux: 0.25},
            {limite: 346250, taux: 0.35},
            {limite: 843750, taux: 0.45},
            {limite: Infinity, taux: 0.60}
        ];
        
        let impot = 0;
        let revenuRestant = revenu;
        let limitePrecedente = 0;

        for (const tranche of tranches) {
            if (revenuRestant <= 0) break;

            const montantDansTranche = Math.min(tranche.limite - limitePrecedente, revenuRestant);
            impot += montantDansTranche * tranche.taux;
            revenuRestant -= montantDansTranche;
            limitePrecedente = tranche.limite;
        }

        return impot;
    };
    
    const igr = Math.max(0, Math.round(getIGRFromTranche(Q) * parts));

    
    const deductions: PayslipDeduction[] = [
        { label: 'ITS', amount: Math.round(its) },
        { label: 'CN', amount: Math.round(cn) },
        { label: 'IGR', amount: Math.round(igr) },
        { label: 'CNPS', amount: Math.round(cnps) },
    ].filter(d => d.amount > 0);
    
    const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);

    const transportNonImposable = otherFields.transportNonImposable || 0;
    const netAPayer = brutImposable + transportNonImposable - totalDeductions;
    const netAPayerInWords = toWords(Math.floor(netAPayer)) + " FRANCS CFA";

    const employerContributions: PayslipEmployerContribution[] = [
        { label: 'ITS PART PATRONALE', base: Math.round(brutImposable), rate: '1,2%', amount: employee.CNPS ? Math.round(brutImposable * 0.012) : 0 },
        { label: 'TAXE D\'APPRENTISSAGE', base: Math.round(brutImposable), rate: '0,4%', amount: employee.CNPS ? Math.round(brutImposable * 0.004) : 0 },
        { label: 'TAXE FPC', base: Math.round(brutImposable), rate: '0,6%', amount: employee.CNPS ? Math.round(brutImposable * 0.006) : 0 },
        { label: 'PRESTATION FAMILIALE', base: Math.min(brutImposable, 70000), rate: '5,75%', amount: employee.CNPS ? Math.round(Math.min(brutImposable, 70000) * 0.0575) : 0 },
        { label: 'ACCIDENT DE TRAVAIL', base: Math.min(brutImposable, 70000), rate: '2,5%', amount: employee.CNPS ? Math.round(Math.min(brutImposable, 70000) * 0.025) : 0 },
        { label: 'REGIME DE RETRAITE', base: Math.round(brutImposable), rate: '7,7%', amount: employee.CNPS ? Math.round(brutImposable * 0.077) : 0 },
    ];
    
    const numeroCompteComplet = [employee.CB, employee.CG, employee.numeroCompte, employee.Cle_RIB].filter(Boolean).join(' ');

    const formattedDateEmbauche = employee.hireDate && isValid(parseISO(employee.hireDate)) 
        ? format(parseISO(employee.hireDate), 'dd MMMM yyyy', { locale: fr })
        : 'N/A';

    const employeeInfoWithStaticData: PayslipEmployeeInfo = {
        ...employee,
        hireDate: formattedDateEmbauche,
        anciennete: seniorityInfo.text,
        categorie: employee.categorie || 'Catégorie',
        paymentDate: payslipDate,
        paymentLocation: organizationSettings.address || 'Yamoussoukro',
        parts: parts,
        numeroCompteComplet: numeroCompteComplet
    };

    return {
        employeeInfo: employeeInfoWithStaticData,
        earnings,
        deductions,
        totals: {
            brutImposable: Math.round(brutImposable),
            transportNonImposable: { label: 'INDEMNITE DE TRANSPORT NON IMPOSABLE', amount: Math.round(transportNonImposable) },
            netAPayer: Math.round(netAPayer),
            netAPayerInWords,
        },
        employerContributions,
        organizationSettings: {
            ...organizationSettings,
            secondaryLogoUrl: placeholderImages.nationalEmblem,
        }
    };
}
