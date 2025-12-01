
import { isValid, parseISO, lastDayOfMonth, format, differenceInYears, differenceInMonths, differenceInDays, addYears, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { numberToWords } from "french-numbers-to-words";

// ====================================================================================
// 1. DATA TYPES
// ====================================================================================

export type OrganizationSettings = {
    organizationName: string;
    mainLogoUrl: string;
    secondaryLogoUrl: string;
    faviconUrl: string;
    cnpsEmployeur?: string;
};

export type Employe = {
  id: string;
  matricule: string;
  name: string;
  lastName?: string;
  firstName?: string;
  poste: string; // Utilise 'role' de l'entité 'staff'
  departmentId?: string;
  status: 'Actif' | 'En congé' | 'Licencié' | 'Retraité' | 'Décédé';
  photoUrl: string;
  
  // Personal Info
  email?: string;
  Date_Naissance?: string;
  situationMatrimoniale?: string;
  enfants?: number;

  // Professional Info
  dateEmbauche?: string;
  
  // Payroll Info
  baseSalary?: number;
  
  // Earnings & Deductions
  primeAnciennete?: number;
  indemniteTransportImposable?: number;
  indemniteResponsabilite?: number;
  indemniteLogement?: number;
  indemniteSujetion?: number;
  indemniteCommunication?: number;
  indemniteRepresentation?: number;
  transportNonImposable?: number;

  // Bank Info
  banque?: string;
  numeroCompte?: string;
  CB?: string;
  CG?: string;
  Cle_RIB?: string;

  // Payslip specific details
  cnpsEmploye?: string;
  anciennete?: string;
  categorie?: string;
  parts?: number;
  paymentDate?: string;
  paymentLocation?: string;
  CNPS?: boolean;
};

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

export type PayslipDetails = {
    employeeInfo: Employe & { numeroCompteComplet?: string };
    earnings: PayslipEarning[];
    deductions: PayslipDeduction[];
    totals: {
        brutImposable: number;
        transportNonImposable: { label: string; amount: number };
        netAPayer: number;
        netAPayerInWords: string;
    };
    employerContributions: PayslipEmployerContribution[];
    organizationLogos: OrganizationSettings;
};

// ====================================================================================
// 2. UTILITY FUNCTION
// ====================================================================================

function toWords(num: number): string {
    if (num === 0) return 'ZÉRO';
    return numberToWords(num).toUpperCase();
}


// ====================================================================================
// 3. PAYSLIP CALCULATION LOGIC
// ====================================================================================

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

export async function getPayslipDetails(employee: Employe, payslipDate: string): Promise<PayslipDetails> {
    const { baseSalary = 0, ...otherFields } = employee;
    
    const seniorityInfo = calculateSeniority(employee.dateEmbauche || '', payslipDate);
    
    let primeAnciennete = 0;
    if (seniorityInfo.years >= 2) {
        const bonusRate = Math.min(25, seniorityInfo.years);
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
    
    const cnps = employee.CNPS ? (brutImposable * 0.063) : 0;
    const its = 0; // Calcul à implémenter
    const igr = 0; // Calcul à implémenter
    const cn = 0;  // Calcul à implémenter
    
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
        { label: 'ACCIDENT DE TRAVAIL', base: Math.min(brutImposable, 70000), rate: '2,0%', amount: employee.CNPS ? Math.round(Math.min(brutImposable, 70000) * 0.02) : 0 },
        { label: 'REGIME DE RETRAITE', base: Math.round(brutImposable), rate: '7,7%', amount: employee.CNPS ? Math.round(brutImposable * 0.077) : 0 },
    ];
    
    const organizationLogos: OrganizationSettings = {
        organizationName: "VOTRE ORGANISATION",
        mainLogoUrl: "https://cnrct.ci/wp-content/uploads/2018/03/logo_chambre.png",
        secondaryLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Coat_of_arms_of_C%C3%B4te_d%27Ivoire_%281997-2001_variant%29.svg/512px-Coat_of_arms_of_C%C3%B4te_d%27Ivoire_%281997-2001_variant%29.svg.png",
        faviconUrl: '',
        cnpsEmployeur: "320491",
    };
    
    const numeroCompteComplet = [employee.CB, employee.CG, employee.numeroCompte, employee.Cle_RIB].filter(Boolean).join(' ');

    const formattedDateEmbauche = employee.dateEmbauche && isValid(parseISO(employee.dateEmbauche)) 
        ? format(parseISO(employee.dateEmbauche), 'dd MMMM yyyy', { locale: fr })
        : 'N/A';

    const employeeInfoWithStaticData: Employe & { numeroCompteComplet?: string } = {
        ...employee,
        poste: employee.poste || employee.role, // fallback to role
        dateEmbauche: formattedDateEmbauche,
        departmentId: employee.departmentId || 'Non spécifié',
        anciennete: seniorityInfo.text,
        categorie: employee.categorie || 'Catégorie',
        cnpsEmployeur: organizationLogos.cnpsEmployeur,
        paymentDate: payslipDate,
        paymentLocation: 'Yamoussoukro', // À remplacer
        parts: employee.parts || 1.5,
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
        organizationLogos
    };
}

    