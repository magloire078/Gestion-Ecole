
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, MoreHorizontal, Mail, Phone, BadgeDollarSign, Calendar, FileText, Lock } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import { useAuthProtection } from '@/hooks/use-auth-protection';
import { isValid, parseISO, lastDayOfMonth, format, differenceInYears, differenceInMonths, differenceInDays, addYears, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { PayslipTemplate } from '@/components/payroll/payslip-template';
import { useSubscription } from '@/hooks/use-subscription';
import Link from "next/link";

// ====================================================================================
// 1. DATA TYPES (Logique de paie déplacée ici)
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
// 2. UTILITY FUNCTION (Logique de paie déplacée ici)
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
// 3. PAYSLIP CALCULATION LOGIC (Logique de paie déplacée ici)
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
    
    const paymentDateObject = isValid(parseISO(payslipDate)) ? lastDayOfMonth(parseISO(payslipDate)) : new Date();
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
        paymentDate: paymentDateObject.toISOString(),
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


// ====================================================================================
// 4. REACT COMPONENT
// ====================================================================================

interface StaffMember extends Employe {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  salary?: number;
  hireDate: string;
  poste: string;
  matricule: string;
}

function HRContent() {
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();

  // --- Firestore Data Hooks ---
  const staffQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/personnel`) : null, [firestore, schoolId]);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);
  const staff: StaffMember[] = useMemo(() => staffData?.map(d => ({ id: d.id, ...d.data() } as StaffMember)) || [], [staffData]);

  // --- UI State ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [payslipDetails, setPayslipDetails] = useState<PayslipDetails | null>(null);
  const [isGeneratingPayslip, setIsGeneratingPayslip] = useState(false);
  
  const [formState, setFormState] = useState<Omit<StaffMember, 'id'>>({
      name: '',
      role: '',
      email: '',
      phone: '',
      salary: 0,
      hireDate: '',
      poste: '',
      matricule: '',
      status: 'Actif',
      photoUrl: '',
      baseSalary: 0,
  });

  useEffect(() => {
    if (isFormOpen && editingStaff) {
      setFormState({
        name: editingStaff.name,
        role: editingStaff.role,
        email: editingStaff.email || '',
        phone: editingStaff.phone || '',
        salary: editingStaff.salary || 0,
        hireDate: editingStaff.hireDate,
        poste: editingStaff.poste || editingStaff.role,
        matricule: editingStaff.matricule || '',
        status: editingStaff.status || 'Actif',
        photoUrl: editingStaff.photoUrl || '',
        baseSalary: editingStaff.baseSalary || editingStaff.salary || 0,
      });
    } else {
      setFormState({
        name: '',
        role: '',
        email: '',
        phone: '',
        salary: 0,
        hireDate: format(new Date(), 'yyyy-MM-dd'),
        poste: '',
        matricule: '',
        status: 'Actif',
        photoUrl: '',
        baseSalary: 0,
      });
    }
  }, [isFormOpen, editingStaff]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormState(prev => ({ 
        ...prev, 
        [id]: value,
        ...(id === 'role' && { poste: value }), // sync poste with role if not specified
        ...(id === 'salary' && { baseSalary: Number(value) }), // sync baseSalary
     }));
  };

  const handleSubmit = async () => {
    if (!schoolId || !formState.name || !formState.role || !formState.hireDate) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Le nom, le rôle et la date d'embauche sont requis." });
      return;
    }
    
    const dataToSave = { 
        ...formState, 
        salary: Number(formState.salary) || 0,
        baseSalary: Number(formState.baseSalary) || Number(formState.salary) || 0,
        poste: formState.poste || formState.role,
        matricule: formState.matricule || `STAFF-${Math.floor(1000 + Math.random() * 9000)}`
    };

    try {
        if (editingStaff) {
            const staffDocRef = doc(firestore, `ecoles/${schoolId}/personnel/${editingStaff.id}`);
            await setDoc(staffDocRef, dataToSave, { merge: true });
            toast({ title: "Membre du personnel modifié", description: `Les informations de ${formState.name} ont été mises à jour.` });
        } else {
            const staffCollectionRef = collection(firestore, `ecoles/${schoolId}/personnel`);
            await addDoc(staffCollectionRef, dataToSave);
            toast({ title: "Membre du personnel ajouté", description: `${formState.name} a été ajouté(e) à la liste du personnel.` });
        }
        setIsFormOpen(false);
        setEditingStaff(null);
    } catch (error) {
        const operation = editingStaff ? 'update' : 'create';
        const path = `ecoles/${schoolId}/personnel/${editingStaff?.id || ''}`;
        const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: dataToSave });
        errorEmitter.emit('permission-error', permissionError);
    }
  };
  
  const handleDelete = () => {
    if (!schoolId || !staffToDelete) return;
    const staffDocRef = doc(firestore, `ecoles/${schoolId}/personnel/${staffToDelete.id}`);
    deleteDoc(staffDocRef)
      .then(() => {
        toast({ title: "Membre du personnel supprimé", description: `${staffToDelete.name} a été retiré(e) de la liste.` });
        setIsDeleteDialogOpen(false);
        setStaffToDelete(null);
      }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: staffDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
      });
  };
  
  const handleGeneratePayslip = async (staffMember: StaffMember) => {
    setIsGeneratingPayslip(true);
    setIsPayslipOpen(true);
    try {
        const payslipDate = new Date().toISOString();
        const details = await getPayslipDetails(staffMember, payslipDate);
        setPayslipDetails(details);
    } catch(e) {
        console.error(e);
        toast({
            variant: "destructive",
            title: "Erreur de génération",
            description: "Impossible de calculer le bulletin de paie.",
        });
        setIsPayslipOpen(false);
    } finally {
        setIsGeneratingPayslip(false);
    }
  };


  const handleOpenFormDialog = (staffMember: StaffMember | null) => {
    setEditingStaff(staffMember);
    setIsFormOpen(true);
  };
  
  const handleOpenDeleteDialog = (staffMember: StaffMember) => {
    setStaffToDelete(staffMember);
    setIsDeleteDialogOpen(true);
  };

  const isLoading = schoolLoading || staffLoading;

    return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
              <h1 className="text-lg font-semibold md:text-2xl">Ressources Humaines</h1>
              <p className="text-muted-foreground">Gérez le personnel administratif et de service de votre école.</p>
          </div>
            <Button onClick={() => handleOpenFormDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Membre
            </Button>
        </div>
        
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Rôle</TableHead>
                            <TableHead>Salaire Mensuel</TableHead>
                            <TableHead>Embauché le</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading ? (
                        [...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-9 w-28 ml-auto" /></TableCell>
                            </TableRow>
                        ))
                    ) : staff.length > 0 ? (
                        staff.map((member) => {
                            const fallback = member.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
                            return (
                                <TableRow key={member.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={`https://picsum.photos/seed/${member.id}/100`} alt={member.name} data-ai-hint="person face" />
                                                <AvatarFallback>{fallback}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{member.name}</p>
                                                <p className="text-xs text-muted-foreground">{member.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{member.role}</TableCell>
                                    <TableCell className="font-mono">{member.salary ? `${member.salary.toLocaleString('fr-FR')} CFA` : 'N/A'}</TableCell>
                                    <TableCell>{format(parseISO(member.hireDate), 'd MMM yyyy', { locale: fr })}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="outline" size="sm" onClick={() => handleGeneratePayslip(member)}>
                                                <FileText className="mr-2 h-3 w-3" /> Bulletin
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleOpenFormDialog(member)}>Modifier</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(member)}>Supprimer</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                Aucun membre du personnel n'a été ajouté pour le moment.
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
      
       <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingStaff(null); }}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStaff ? "Modifier un Membre" : "Ajouter un Membre du Personnel"}</DialogTitle>
              <DialogDescription>
                {editingStaff ? `Mettez à jour les informations de ${editingStaff.name}.` : "Renseignez les informations du nouveau membre."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Nom</Label>
                    <Input id="name" value={formState.name} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">Rôle/Poste</Label>
                    <Input id="role" value={formState.role} onChange={handleInputChange} className="col-span-3" placeholder="Ex: Comptable" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">Email</Label>
                    <Input id="email" type="email" value={formState.email} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone" className="text-right">Téléphone</Label>
                    <Input id="phone" type="tel" value={formState.phone} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="salary" className="text-right">Salaire (CFA)</Label>
                    <Input id="salary" type="number" value={formState.salary} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="hireDate" className="text-right">Date d'embauche</Label>
                    <Input id="hireDate" type="date" value={formState.hireDate} onChange={handleInputChange} className="col-span-3" />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                <Button onClick={handleSubmit}>Enregistrer</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le membre du personnel <strong>{staffToDelete?.name}</strong> sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isPayslipOpen} onOpenChange={setIsPayslipOpen}>
        <DialogContent className="max-w-4xl p-0">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>Bulletin de paie</DialogTitle>
              <DialogDescription>
                Aperçu du bulletin de paie pour {payslipDetails?.employeeInfo.name}.
              </DialogDescription>
            </DialogHeader>
            {isGeneratingPayslip ? (
                <div className="flex items-center justify-center h-96">
                    <p>Génération du bulletin de paie...</p>
                </div>
            ) : payslipDetails ? (
                <div className="mt-4 max-h-[70vh] overflow-y-auto">
                    <PayslipTemplate payslipDetails={payslipDetails} />
                </div>
            ) : (
                 <div className="flex items-center justify-center h-96">
                    <p className="text-red-500">Impossible de charger le bulletin de paie.</p>
                </div>
            )}
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function HRPage() {
    const { isLoading: isAuthLoading, AuthProtectionLoader } = useAuthProtection();
    const { subscription, loading: subscriptionLoading } = useSubscription();

    const isLoading = isAuthLoading || subscriptionLoading;

    if (isLoading) {
        return <AuthProtectionLoader />;
    }

    if (subscription?.plan !== 'Pro') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Card className="max-w-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">
                            <Lock className="h-6 w-6 text-primary" />
                            Fonctionnalité du Plan Pro
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            La gestion des ressources humaines et de la paie est une fonctionnalité avancée. Pour y accéder, veuillez mettre à niveau votre abonnement.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/settings/subscription">
                                Mettre à niveau vers le Plan Pro
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    return <HRContent />;
}
