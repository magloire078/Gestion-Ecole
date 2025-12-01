
import { isValid, parseISO, lastDayOfMonth, format, differenceInYears, differenceInMonths, differenceInDays, addYears, addMonths } from "date-fns";
import { fr } from "date-fns/locale";

// ====================================================================================
// 1. DATA TYPES
// ====================================================================================

export type OrganizationSettings = {
    organizationName: string;
    mainLogoUrl: string;
    secondaryLogoUrl: string;
    faviconUrl: string;
};

export type Employe = {
  id: string;
  matricule: string;
  name: string;
  lastName?: string;
  firstName?: string;
  poste: string;
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
  cnpsEmployeur?: string;
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

function numberToWords(num: number): string {
    if (num === 0) return 'ZÉRO';

    const units = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF'];
    const teens = ['DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE', 'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF'];
    const tens = ['', 'DIX', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE', 'SOIXANTE-DIX', 'QUATRE-VINGT', 'QUATRE-VINGT-DIX'];

    function convert(n: number): string {
        if (n < 10) return units[n];
        if (n < 20) return teens[n - 10];
        if (n < 70) {
            const ten = Math.floor(n / 10);
            const unit = n % 10;
            if (unit === 1 && ten < 8) return tens[ten] + ' ET UN';
            return tens[ten] + (unit > 0 ? '-' + units[unit] : '');
        }
        if (n < 80) { // 70-79
             const unit = n % 10;
             if (unit === 1) return tens[6] + '-ET-ONZE';
             return tens[6] + '-' + teens[n - 70];
        }
        if (n < 100) {
            const ten = Math.floor(n / 10);
            const unit = n % 10;
            if (unit === 0) return tens[ten] + 'S';
            return tens[ten] + (unit > 0 ? '-' + units[unit] : '');
        }
        if (n < 200) {
            return 'CENT' + (n % 100 > 0 ? ' ' + convert(n % 100) : '');
        }
        if (n < 1000) {
            const hundred = Math.floor(n / 100);
            const remainder = n % 100;
            return units[hundred] + ' CENT' + (remainder > 0 ? ' ' + convert(remainder) : 'S');
        }
        return '';
    }

    function processGroup(n: number, groupName: string): string {
        if (n === 0) return '';
        let str = '';
        if (n > 1) {
            str = convert(n) + ' ' + groupName;
             str += 'S';
        } else {
            str = 'UN ' + groupName;
        }
        return str;
    }

    const billions = Math.floor(num / 1000000000);
    const millions = Math.floor((num % 1000000000) / 1000000);
    const thousands = Math.floor((num % 1000000) / 1000);
    const remainder = num % 1000;

    let result = '';
    if (billions > 0) result += processGroup(billions, 'MILLIARD') + ' ';
    if (millions > 0) result += processGroup(millions, 'MILLION') + ' ';
    if (thousands > 0) {
        if (thousands === 1) result += 'MILLE ';
        else result += convert(thousands).replace(/S$/, '') + ' MILLE ';
    }
    if (remainder > 0) result += convert(remainder);
    
    result = result.replace(/CENTS\s(MILLE|MILLION|MILLIARD)/g, 'CENT $1');

    return result.trim().toUpperCase();
}

// ====================================================================================
// 3. PAYSLIP CALCULATION LOGIC
// ====================================================================================

function calculateSeniority(hireDateStr: string | undefined, payslipDateStr: string): { text: string, years: number } {
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
    const salaryStructure = {
        baseSalary: employee.baseSalary || 0,
        indemniteTransportImposable: employee.indemniteTransportImposable || 0,
        indemniteResponsabilite: employee.indemniteResponsabilite || 0,
        indemniteLogement: employee.indemniteLogement || 0,
        indemniteSujetion: employee.indemniteSujetion || 0,
        indemniteCommunication: employee.indemniteCommunication || 0,
        indemniteRepresentation: employee.indemniteRepresentation || 0,
        transportNonImposable: employee.transportNonImposable || 0,
    };
    
    const { baseSalary, ...indemnityFields } = salaryStructure;
    
    const seniorityInfo = calculateSeniority(employee.dateEmbauche || '', payslipDate);
    
    let primeAnciennete = 0;
    if (seniorityInfo.years >= 2) {
        const bonusRate = Math.min(25, seniorityInfo.years);
        primeAnciennete = baseSalary * (bonusRate / 100);
    }

    const earnings: PayslipEarning[] = [
        { label: 'SALAIRE DE BASE', amount: Math.round(baseSalary) },
        { label: 'PRIME D\'ANCIENNETE', amount: Math.round(primeAnciennete) },
        { label: 'INDEMNITE DE TRANSPORT IMPOSABLE', amount: Math.round(indemnityFields.indemniteTransportImposable || 0) },
        { label: 'INDEMNITE DE SUJETION', amount: Math.round(indemnityFields.indemniteSujetion || 0) },
        { label: 'INDEMNITE DE COMMUNICATION', amount: Math.round(indemnityFields.indemniteCommunication || 0) },
        { label: 'INDEMNITE DE REPRESENTATION', amount: Math.round(indemnityFields.indemniteRepresentation || 0) },
        { label: 'INDEMNITE DE RESPONSABILITE', amount: Math.round(indemnityFields.indemniteResponsabilite || 0) },
        { label: 'INDEMNITE DE LOGEMENT', amount: Math.round(indemnityFields.indemniteLogement || 0) },
    ];

    const brutImposable = earnings.reduce((sum, item) => sum + item.amount, 0);
    
    const cnps = employee.CNPS ? (brutImposable * 0.063) : 0;
    const its = 0;
    const igr = 0;
    const cn = 0;
    
    const deductions: PayslipDeduction[] = [
        { label: 'ITS', amount: Math.round(its) },
        { label: 'CN', amount: Math.round(cn) },
        { label: 'IGR', amount: Math.round(igr) },
        { label: 'CNPS', amount: Math.round(cnps) },
    ];
    
    const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);

    const netAPayer = brutImposable + (indemnityFields.transportNonImposable || 0) - totalDeductions;
    const netAPayerInWords = numberToWords(Math.floor(netAPayer)) + " FRANCS CFA";

    const employerContributions: PayslipEmployerContribution[] = [
        { label: 'ITS PART PATRONALE', base: Math.round(brutImposable), rate: '1,2%', amount: employee.CNPS ? Math.round(brutImposable * 0.012) : 0 },
        { label: 'TAXE D\'APPRENTISSAGE', base: Math.round(brutImposable), rate: '0,4%', amount: employee.CNPS ? Math.round(brutImposable * 0.004) : 0 },
        { label: 'TAXE FPC', base: Math.round(brutImposable), rate: '0,6%', amount: employee.CNPS ? Math.round(brutImposable * 0.006) : 0 },
        { label: 'PRESTATION FAMILIALE', base: Math.min(brutImposable, 70000), rate: '5,75%', amount: employee.CNPS ? Math.round(Math.min(brutImposable, 70000) * 0.0575) : 0 },
        { label: 'ACCIDENT DE TRAVAIL', base: Math.min(brutImposable, 70000), rate: '2,0%', amount: employee.CNPS ? Math.round(Math.min(brutImposable, 70000) * 0.02) : 0 },
        { label: 'REGIME DE RETRAITE', base: Math.round(brutImposable), rate: '7,7%', amount: employee.CNPS ? Math.round(brutImposable * 0.077) : 0 },
    ];
    
    const organizationLogos: OrganizationSettings = {
        organizationName: "VOTRE ORGANISATION", // Remplacez par le nom de votre organisation
        mainLogoUrl: "https://cnrct.ci/wp-content/uploads/2018/03/logo_chambre.png", // Remplacez par votre logo
        secondaryLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Coat_of_arms_of_C%C3%B4te_d%27Ivoire_%281997-2001_variant%29.svg/512px-Coat_of_arms_of_C%C3%B4te_d%27Ivoire_%281997-2001_variant%29.svg.png", // Remplacez par votre logo secondaire
        faviconUrl: ''
    };
    
    const paymentDateObject = parseISO(payslipDate);
    const numeroCompteComplet = [employee.CB, employee.CG, employee.numeroCompte, employee.Cle_RIB].filter(Boolean).join(' ');

    const formattedDateEmbauche = employee.dateEmbauche && isValid(parseISO(employee.dateEmbauche)) 
        ? format(parseISO(employee.dateEmbauche), 'dd MMMM yyyy', { locale: fr })
        : 'N/A';

    const employeeInfoWithStaticData: Employe & { numeroCompteComplet?: string } = {
        ...employee,
        dateEmbauche: formattedDateEmbauche,
        departmentId: employee.departmentId || 'Non spécifié',
        anciennete: seniorityInfo.text,
        categorie: employee.categorie || 'Catégorie',
        cnpsEmployeur: "320491", // À remplacer par votre numéro
        paymentDate: isValid(paymentDateObject) ? format(lastDayOfMonth(paymentDateObject), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : '',
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
            transportNonImposable: { label: 'INDEMNITE DE TRANSPORT NON IMPOSABLE', amount: Math.round(indemnityFields.transportNonImposable || 0) },
            netAPayer: Math.round(netAPayer),
            netAPayerInWords,
        },
        employerContributions,
        organizationLogos
    };
}
