
'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { allSubjects } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useFirestore, useAuth, useUser } from '@/firebase';
import { doc, setDoc, getDoc, writeBatch, collection, addDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import type { staff as Staff, class_type as Class, admin_role as AdminRole, school as OrganizationSettings } from '@/lib/data-types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { format, parseISO, isValid } from 'date-fns';
import { ImageUploader } from '../image-uploader';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Upload, Loader2, FileText, Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getPayslipDetails, type PayslipDetails } from '@/lib/bulletin-de-paie';
import { useSchoolData } from '@/hooks/use-school-data';
import { PayslipPreview } from '@/components/payroll/payslip-template';

const staffSchema = z.object({
  firstName: z.string().min(1, { message: "Le prénom est requis." }),
  lastName: z.string().min(1, { message: "Le nom est requis." }),
  photoURL: z.string().optional(),
  role: z.string().min(1, { message: "Le rôle est requis." }),
  email: z.string().email({ message: "L'adresse email est invalide." }),
  uid: z.string().optional(),
  phone: z.string().optional(),
  baseSalary: z.coerce.number().min(0, { message: 'Le salaire doit être positif.' }),
  hireDate: z.string().min(1, { message: "La date d'embauche est requise." }),
  // --- Teacher-specific fields ---
  subject: z.string().optional(),
  classId: z.string().optional(),
  adminRole: z.string().optional(),
  // --- Payroll fields ---
  situationMatrimoniale: z.string().optional(),
  enfants: z.coerce.number().min(0).optional(),
  categorie: z.string().optional(),
  cnpsEmploye: z.string().optional(),
  CNPS: z.boolean().default(false),
  indemniteTransportImposable: z.coerce.number().min(0).optional(),
  indemniteResponsabilite: z.coerce.number().min(0).optional(),
  indemniteLogement: z.coerce.number().min(0).optional(),
  indemniteSujetion: z.coerce.number().min(0).optional(),
  indemniteCommunication: z.coerce.number().min(0).optional(),
  indemniteRepresentation: z.coerce.number().min(0).optional(),
  transportNonImposable: z.coerce.number().min(0).optional(),
  banque: z.string().optional(),
  CB: z.string().optional(),
  CG: z.string().optional(),
  numeroCompte: z.string().optional(),
  Cle_RIB: z.string().optional(),
}).refine(data => data.role !== 'enseignant' || (data.role === 'enseignant' && data.subject), {
  message: "La matière principale est requise pour un enseignant.",
  path: ["subject"],
});

type StaffFormValues = z.infer<typeof staffSchema>;

interface StaffEditFormProps {
    schoolId: string | null;
    editingStaff: (Staff & { id: string }) | null;
    classes: Class[];
    adminRoles: (AdminRole & {id: string})[];
    onFormSubmit: () => void;
}

export function StaffEditForm({ schoolId, editingStaff, classes, adminRoles, onFormSubmit }: StaffEditFormProps) {
    const firestore = useFirestore();
    const auth = useAuth();
    const { user: currentUser } = useUser();
    const { toast } = useToast();
    const [todayDateString, setTodayDateString] = useState('');
    const [photoUrl, setPhotoUrl] = useState<string | null>(editingStaff?.photoURL || null);
    
    const [isPayslipOpen, setIsPayslipOpen] = useState(false);
    const [payslipDetails, setPayslipDetails] = useState<PayslipDetails | null>(null);
    const [isGeneratingPayslip, setIsGeneratingPayslip] = useState(false);
    const { schoolData } = useSchoolData();

    useEffect(() => {
        setTodayDateString(format(new Date(), 'yyyy-MM-dd'));
    }, []);

    const form = useForm<StaffFormValues>({
        resolver: zodResolver(staffSchema),
        defaultValues: {
          firstName: '', lastName: '', role: '', email: '', phone: '', uid: '', photoURL: '', baseSalary: 0, hireDate: '', subject: '', classId: '', adminRole: '', situationMatrimoniale: 'Célibataire', enfants: 0, categorie: '', cnpsEmploye: '', CNPS: true, indemniteTransportImposable: 0, indemniteResponsabilite: 0, indemniteLogement: 0, indemniteSujetion: 0, indemniteCommunication: 0, indemniteRepresentation: 0, transportNonImposable: 0, banque: '', CB: '', CG: '', numeroCompte: '', Cle_RIB: '',
        },
    });

    useEffect(() => {
        async function loadPrivateData() {
            if (editingStaff && schoolId) {
                const staffRef = doc(firestore, `ecoles/${schoolId}/personnel/${editingStaff.id}`);
                const docSnap = await getDoc(staffRef);
                const fullData = docSnap.exists() ? docSnap.data() as Staff : {};
                
                const hireDate = fullData.hireDate || editingStaff.hireDate;
                const formattedHireDate = hireDate && isValid(parseISO(hireDate)) 
                    ? format(parseISO(hireDate), 'yyyy-MM-dd') 
                    : todayDateString;

                form.reset({
                    ...editingStaff,
                    ...fullData,
                    baseSalary: fullData.baseSalary || 0,
                    hireDate: formattedHireDate,
                    adminRole: fullData.adminRole || '',
                });
                setPhotoUrl(editingStaff.photoURL || null);
            } else {
                form.reset({
                    firstName: '', lastName: '', role: 'enseignant', email: '', phone: '', uid: '', photoURL: '', baseSalary: 0, hireDate: todayDateString, subject: '', classId: '', adminRole: '', situationMatrimoniale: 'Célibataire', enfants: 0, categorie: '', cnpsEmploye: '', CNPS: true, indemniteTransportImposable: 0, indemniteResponsabilite: 0, indemniteLogement: 0, indemniteSujetion: 0, indemniteCommunication: 0, indemniteRepresentation: 0, transportNonImposable: 0, banque: '', CB: '', CG: '', numeroCompte: '', Cle_RIB: '',
                });
                setPhotoUrl(null);
            }
        }
        loadPrivateData();
    }, [editingStaff, schoolId, firestore, form, todayDateString]);
    
    const watchedRole = useWatch({ control: form.control, name: 'role' });

    useEffect(() => {
        if (watchedRole !== 'enseignant') {
            form.setValue('subject', undefined);
        }
    }, [watchedRole, form]);

    const handleSubmit = async (values: StaffFormValues) => {
        if (!schoolId) {
          toast({ variant: 'destructive', title: 'Erreur', description: "ID de l'école non trouvé." });
          return;
        }
        
        const dataToSave: Staff = {
            ...values,
            uid: editingStaff?.uid || '', // UID is set by the user upon joining, not here.
            schoolId,
            photoURL: photoUrl || '',
            matricule: editingStaff?.matricule || `STAFF-${Math.floor(1000 + Math.random() * 9000)}`,
            status: editingStaff?.status || 'Actif',
            displayName: `${values.firstName} ${values.lastName}`
        };

        if (editingStaff) {
            // Mise à jour d'un membre existant
            const staffDocRef = doc(firestore, `ecoles/${schoolId}/personnel/${editingStaff.id}`);
            setDoc(staffDocRef, dataToSave, { merge: true })
            .then(() => {
                toast({ title: "Membre du personnel modifié", description: `Les informations de ${values.firstName} ${values.lastName} ont été mises à jour.` });
                onFormSubmit();
            }).catch((serverError) => {
                 const permissionError = new FirestorePermissionError({
                    path: staffDocRef.path, operation: 'update', requestResourceData: dataToSave,
                });
                errorEmitter.emit('permission-error', permissionError);
            })
        } else {
            // Ajout d'un nouveau membre (profil seulement, sans compte auth)
            const staffCollectionRef = collection(firestore, `ecoles/${schoolId}/personnel`);
            addDoc(staffCollectionRef, dataToSave)
            .then(() => {
                 toast({ title: "Membre du personnel ajouté", description: `${values.firstName} ${values.lastName} a été ajouté(e). L'utilisateur pourra rejoindre l'école en utilisant cette adresse email.` });
                 onFormSubmit();
            })
            .catch((error) => {
                 const permissionError = new FirestorePermissionError({
                    path: staffCollectionRef.path, operation: 'create', requestResourceData: dataToSave,
                });
                errorEmitter.emit('permission-error', permissionError);
            })
        }
    };
    
    const handlePreviewPayslip = async () => {
        if (!schoolData) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Données de l\'école non chargées.'});
            return;
        }
        
        setIsGeneratingPayslip(true);
        setPayslipDetails(null);
        setIsPayslipOpen(true);

        try {
            const currentFormData = form.getValues();
            const payslipDate = new Date().toISOString();
            const details = await getPayslipDetails(currentFormData as Staff, payslipDate, schoolData as OrganizationSettings);
            setPayslipDetails(details);
        } catch (e) {
            console.error(e);
            toast({
                variant: "destructive",
                title: "Erreur de génération",
                description: "Impossible de calculer le bulletin de paie. Vérifiez que toutes les données sont renseignées.",
            });
            setIsPayslipOpen(false);
        } finally {
            setIsGeneratingPayslip(false);
        }
    };
    
    return (
        <>
        <Form {...form}>
            <form id="staff-form" onSubmit={form.handleSubmit(handleSubmit)}>
                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="general">Général</TabsTrigger>
                        <TabsTrigger value="payroll">Paie</TabsTrigger>
                        <TabsTrigger value="personal">Personnel</TabsTrigger>
                        <TabsTrigger value="banking">Bancaire</TabsTrigger>
                    </TabsList>
                    <div className="py-6 max-h-[60vh] overflow-y-auto px-1">
                        <TabsContent value="general" className="mt-0 space-y-4">
                            <div className="flex items-center gap-6">
                                <FormField control={form.control} name="photoURL" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Photo</FormLabel>
                                        <FormControl>
                                            <ImageUploader 
                                                onUploadComplete={(url) => { field.onChange(url); setPhotoUrl(url); }}
                                                storagePath={`ecoles/${schoolId}/staff-photos/`}
                                                currentImageUrl={field.value}
                                            >
                                                <Avatar className="h-24 w-24 cursor-pointer hover:opacity-80 transition-opacity">
                                                    <AvatarImage src={photoUrl || undefined} alt="Photo" />
                                                    <AvatarFallback className="flex flex-col items-center justify-center space-y-1">
                                                        <Upload className="h-6 w-6 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground">Photo</span>
                                                    </AvatarFallback>
                                                </Avatar>
                                            </ImageUploader>
                                        </FormControl>
                                    </FormItem>
                                )} />
                                <div className="flex-1 space-y-4">
                                    <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input placeholder="Prénom" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Nom de famille" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            </div>

                            <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Rôle/Poste</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un rôle..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="directeur">Directeur</SelectItem><SelectItem value="directeur_pedagogique">Directeur Pédagogique</SelectItem><SelectItem value="secretaire">Secrétaire</SelectItem><SelectItem value="enseignant">Enseignant</SelectItem><SelectItem value="enseignant_principal">Enseignant Principal</SelectItem><SelectItem value="comptable">Comptable</SelectItem><SelectItem value="bibliothecaire">Bibliothécaire</SelectItem><SelectItem value="surveillant">Surveillant</SelectItem><SelectItem value="infirmier">Infirmier(e)</SelectItem><SelectItem value="personnel">Autre Personnel</SelectItem><SelectItem value="chauffeur">Chauffeur</SelectItem><SelectItem value="accompagnateur">Accompagnateur</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="adminRole" render={({ field }) => (<FormItem><FormLabel>Rôle Administratif (Permissions)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Aucun rôle admin" /></SelectTrigger></FormControl><SelectContent><SelectItem value="">Aucun</SelectItem>{adminRoles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                            {watchedRole === 'enseignant' && (
                                <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-muted/50">
                                    <FormField control={form.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Matière principale</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger></FormControl><SelectContent>{allSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="classId" render={({ field }) => (<FormItem><FormLabel>Classe principale</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="(Optionnel)" /></SelectTrigger></FormControl><SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="email@exemple.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name="uid" render={({ field }) => (<FormItem><FormLabel>UID</FormLabel><FormControl><Input placeholder="Généré automatiquement" {...field} disabled={true} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                             <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" placeholder="(Optionnel)" {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="hireDate" render={({ field }) => (<FormItem><FormLabel>Date d'embauche</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </TabsContent>
                        <TabsContent value="payroll" className="mt-0 space-y-4">
                            <FormField control={form.control} name="baseSalary" render={({ field }) => (<FormItem><FormLabel>Salaire de base (CFA)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="indemnities">
                                <AccordionTrigger>Indemnités et Primes</AccordionTrigger>
                                <AccordionContent>
                                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                                      <FormField control={form.control} name="indemniteTransportImposable" render={({ field }) => (<FormItem><FormLabel>Transport (imposable)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                      <FormField control={form.control} name="transportNonImposable" render={({ field }) => (<FormItem><FormLabel>Transport (non-imposable)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                      <FormField control={form.control} name="indemniteLogement" render={({ field }) => (<FormItem><FormLabel>Logement</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                      <FormField control={form.control} name="indemniteResponsabilite" render={({ field }) => (<FormItem><FormLabel>Responsabilité</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                      <FormField control={form.control} name="indemniteSujetion" render={({ field }) => (<FormItem><FormLabel>Sujétion</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                      <FormField control={form.control} name="indemniteCommunication" render={({ field }) => (<FormItem><FormLabel>Communication</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                      <FormField control={form.control} name="indemniteRepresentation" render={({ field }) => (<FormItem><FormLabel>Représentation</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                             <Button type="button" variant="secondary" onClick={handlePreviewPayslip} className="w-full">
                                <FileText className="mr-2 h-4 w-4" />
                                Prévisualiser le Bulletin de Paie
                            </Button>
                        </TabsContent>
                         <TabsContent value="personal" className="mt-0 space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="situationMatrimoniale" render={({ field }) => (<FormItem><FormLabel>Situation Matrimoniale</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Célibataire">Célibataire</SelectItem><SelectItem value="Marié(e)">Marié(e)</SelectItem><SelectItem value="Divorcé(e)">Divorcé(e)</SelectItem><SelectItem value="Veuf(ve)">Veuf(ve)</SelectItem></SelectContent></Select></FormItem>)} />
                                <FormField control={form.control} name="enfants" render={({ field }) => (<FormItem><FormLabel>Enfants à charge</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                             </div>
                             <FormField control={form.control} name="categorie" render={({ field }) => (<FormItem><FormLabel>Catégorie</FormLabel><FormControl><Input placeholder="Ex: Catégorie 7" {...field} /></FormControl></FormItem>)} />
                            <h4 className="font-semibold text-sm pt-2">Informations CNPS</h4>
                            <FormField control={form.control} name="cnpsEmploye" render={({ field }) => (<FormItem><FormLabel>N° CNPS Employé</FormLabel><FormControl><Input placeholder="Numéro CNPS" {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="CNPS" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Soumis aux cotisations CNPS</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                        </TabsContent>
                        <TabsContent value="banking" className="mt-0 space-y-4">
                             <FormField control={form.control} name="banque" render={({ field }) => (<FormItem><FormLabel>Banque</FormLabel><FormControl><Input placeholder="Nom de la banque" {...field} /></FormControl></FormItem>)} />
                             <div className="grid grid-cols-3 gap-4">
                                <FormField control={form.control} name="CB" render={({ field }) => (<FormItem><FormLabel>Code Banque</FormLabel><FormControl><Input placeholder="CB" {...field} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="CG" render={({ field }) => (<FormItem><FormLabel>Code Guichet</FormLabel><FormControl><Input placeholder="CG" {...field} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="Cle_RIB" render={({ field }) => (<FormItem><FormLabel>Clé RIB</FormLabel><FormControl><Input placeholder="Clé" {...field} /></FormControl></FormItem>)} />
                             </div>
                             <FormField control={form.control} name="numeroCompte" render={({ field }) => (<FormItem><FormLabel>Numéro de Compte</FormLabel><FormControl><Input placeholder="Numéro de compte" {...field} /></FormControl></FormItem>)} />
                        </TabsContent>
                    </div>
                </Tabs>
                <DialogFooter className="pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onFormSubmit}>Annuler</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enregistrement...
                          </>
                        ) : 'Enregistrer'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
        <Dialog open={isPayslipOpen} onOpenChange={setIsPayslipOpen}>
            <DialogContent className="max-w-4xl p-0">
                <DialogHeader className="p-6 pb-0">
                  <DialogTitle>Aperçu du Bulletin de paie</DialogTitle>
                  <DialogDescription>
                    Ceci est une prévisualisation basée sur les données actuelles du formulaire.
                  </DialogDescription>
                </DialogHeader>
                <div className="p-6 pt-2">
                  {isGeneratingPayslip ? (
                      <div className="flex items-center justify-center h-96">
                          <p>Génération du bulletin de paie...</p>
                      </div>
                  ) : payslipDetails ? (
                      <PayslipPreview details={payslipDetails} />
                  ) : (
                      <div className="flex items-center justify-center h-96">
                          <p className="text-muted-foreground">La prévisualisation du bulletin n'a pas pu être générée.</p>
                      </div>
                  )}
                </div>
            </DialogContent>
          </Dialog>
        </>
    );
}
