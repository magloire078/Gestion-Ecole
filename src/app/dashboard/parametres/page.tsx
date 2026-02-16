

'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useSchoolData } from "@/hooks/use-school-data";
import { useUser, useAuth, useFirestore } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, AlertCircle, Upload, FileSignature, LogOut, Trash2, Users, Check, User, Phone, Globe, Loader2, CheckCircle, School, Building, Mail, Briefcase, Calendar } from "lucide-react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ImageUploader } from '@/components/image-uploader';
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { doc, deleteDoc } from 'firebase/firestore';
import { signOut } from "firebase/auth";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { SafeImage } from '@/components/ui/safe-image';
import { InvitationCode } from '@/components/settings/invitation-code';

const settingsSchema = z.object({
  name: z.string().min(1, "Le nom de l'école est requis."),
  currentAcademicYear: z.string().regex(/^\d{4}-\d{4}$/, "Format invalide (ex: 2024-2025)").optional().or(z.literal('')),
  matricule: z.string().regex(/^[A-Z0-9\/-]*$/, { message: "Format de matricule invalide" }).optional().or(z.literal('')),
  cnpsEmployeur: z.string().regex(/^[0-9]*$/, { message: "Le numéro CNPS doit contenir uniquement des chiffres" }).optional().or(z.literal('')),
  directorFirstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  directorLastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  directorPhone: z.string().regex(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/, "Numéro de téléphone invalide").optional().or(z.literal('')),
  address: z.string().max(200).optional(),
  phone: z.string().regex(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/, "Numéro de téléphone invalide").optional().or(z.literal('')),
  website: z.string().url({ message: "URL invalide" }).optional().or(z.literal('')),
  mainLogoUrl: z.string().url({ message: "URL invalide" }).optional().or(z.literal('')),
  digitalSignatureUrl: z.string().url({ message: "URL invalide" }).optional().or(z.literal('')),
  email: z.string().email("Email invalide").optional().or(z.literal('')),
});


type SettingsFormValues = z.infer<typeof settingsSchema>;


export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const { schoolId, schoolData, loading, updateSchoolData } = useSchoolData();
  const [error, setError] = useState<string | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: "", directorFirstName: "", directorLastName: "", currentAcademicYear: "", matricule: "", cnpsEmployeur: "", directorPhone: "", address: "", phone: "", website: "", mainLogoUrl: "", digitalSignatureUrl: "", email: "",
    }
  });

  useEffect(() => {
    if (schoolData) {
      form.reset({
        name: schoolData.name || "",
        currentAcademicYear: schoolData.currentAcademicYear || "",
        directorFirstName: schoolData.directorFirstName || "",
        directorLastName: schoolData.directorLastName || "",
        matricule: schoolData.matricule || "",
        cnpsEmployeur: schoolData.cnpsEmployeur || "",
        directorPhone: schoolData.directorPhone || "",
        address: schoolData.address || "",
        phone: schoolData.phone || "",
        website: schoolData.website || "",
        mainLogoUrl: schoolData.mainLogoUrl || "",
        digitalSignatureUrl: schoolData.digitalSignatureUrl || "",
        email: schoolData.email || "",
      });
    }
  }, [schoolData, form]);

  const handleSaveChanges = async (values: SettingsFormValues) => {
    setError(null);
    setIsSaving(true);
    try {
      const dataToSave = { ...values };
      await updateSchoolData(dataToSave);
      form.reset(values, { keepValues: true, keepDirty: false });
      toast({
        title: "✅ Paramètres enregistrés", description: "Les informations ont été mises à jour avec succès.", duration: 3000,
      });
    } catch (error: any) {
      let errorMessage = "Impossible d'enregistrer les paramètres. Vérifiez vos permissions.";
      if (error.code === 'permission-denied') errorMessage = "Permission refusée. Vérifiez que vous êtes bien directeur de cette école.";
      else if (error.code === 'not-found') errorMessage = "L'école n'existe plus ou a été supprimée.";

      setError(errorMessage);
      toast({
        variant: "destructive", title: "❌ Erreur de sauvegarde", description: errorMessage, duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUploadComplete = (url: string) => {
    form.setValue('mainLogoUrl', url, { shouldDirty: true });
    form.handleSubmit(handleSaveChanges)();
  }

  const handleSignatureUploadComplete = (url: string) => {
    form.setValue('digitalSignatureUrl', url, { shouldDirty: true });
    form.handleSubmit(handleSaveChanges)();
  }

  const handleCopyCode = () => {
    if (schoolData?.schoolCode) {
      navigator.clipboard.writeText(schoolData.schoolCode);
      toast({ title: "Code copié !", description: "Le code de l'établissement a été copié dans le presse-papiers." });
    }
  };

  const handleResetAccount = async () => {
    if (!user || !user.authUser || !firestore) {
      toast({ variant: "destructive", title: "Erreur", description: "Utilisateur non authentifié." });
      return;
    }
    try {
      const userRootRef = doc(firestore, 'users', user.authUser.uid);
      await deleteDoc(userRootRef);
      await signOut(auth);
      toast({ title: "Compte réinitialisé", description: "Vous allez être redirigé vers la page de connexion." });
      window.location.href = '/login';
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de réinitialiser le compte." });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-[70vh] w-full" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive"> <AlertCircle className="h-4 w-4" /> <AlertTitle>Erreur</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSaveChanges)} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Informations et Logo</CardTitle>
                    <CardDescription>Mettez à jour les informations principales de l'école.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField control={form.control} name="mainLogoUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo de l'école</FormLabel>
                        <FormDescription>Le logo officiel de votre établissement. Recommandé : 200x200px, PNG transparent.</FormDescription>
                        <div className="flex items-center gap-4 pt-2">
                          <div className="h-20 w-20 flex-shrink-0 rounded-md border bg-muted p-1 flex items-center justify-center">
                            <SafeImage src={field.value} alt="Logo" width={72} height={72} className="object-contain" />
                          </div>
                          <ImageUploader
                            onUploadComplete={handleLogoUploadComplete}
                            storagePath={`ecoles/${schoolId}/logos/`}
                            resizeWidth={300}
                            maxSize={1 * 1024 * 1024} // 1MB
                          >
                            <Button type="button" variant="outline" disabled={!schoolId}>
                              <Upload className="h-4 w-4 mr-2" />
                              {field.value ? "Changer le logo" : "Télécharger un logo"}
                            </Button>
                          </ImageUploader>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de l'École</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Adresse de l'École</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="currentAcademicYear" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Calendar className="h-4 w-4" />Année Académique en Cours</FormLabel><FormControl><Input placeholder="Ex: 2024-2025" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </CardContent>
                </Card>

                <Accordion type="multiple" className="w-full space-y-6">
                  <AccordionItem value="item-1">
                    <Card><AccordionTrigger className="p-6"><CardTitle>Détails Administratifs</CardTitle></AccordionTrigger>
                      <AccordionContent>
                        <div className="px-6 pb-6 pt-0 space-y-6">
                          <FormField control={form.control} name="matricule" render={({ field }) => (<FormItem><FormLabel>Matricule Établissement</FormLabel><FormControl><Input placeholder="Ex: 0123/ETAB/2024" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="cnpsEmployeur" render={({ field }) => (<FormItem><FormLabel>N° CNPS Employeur</FormLabel><FormControl><Input placeholder="Numéro d'immatriculation CNPS de l'école" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <Card><AccordionTrigger className="p-6"><CardTitle>Informations de Contact</CardTitle></AccordionTrigger>
                      <AccordionContent>
                        <div className="px-6 pb-6 pt-0 space-y-6">
                          <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Téléphone de l'École</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>Site Web</FormLabel><FormControl><Input type="url" placeholder="https://www.mon-ecole.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email de contact</FormLabel><FormControl><Input type="email" placeholder="contact@ecole.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <Card><AccordionTrigger className="p-6"><CardTitle>Mon Profil Directeur</CardTitle></AccordionTrigger>
                      <AccordionContent>
                        <div className="px-6 pb-6 pt-0 space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="directorFirstName" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="directorLastName" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                          </div>
                          <FormField control={form.control} name="directorPhone" render={({ field }) => (<FormItem><FormLabel>Téléphone (Directeur)</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <Separator />
                          <FormField control={form.control} name="digitalSignatureUrl" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <FileSignature className="h-4 w-4" />
                                Signature Numérique
                              </FormLabel>
                              <FormDescription>Votre signature sera apposée sur les bulletins et fiches de renseignements. Utilisez un fond transparent (PNG) si possible.</FormDescription>
                              <div className="flex items-center gap-4 pt-2">
                                <div className="h-24 w-48 flex-shrink-0 rounded-md border bg-white p-1 flex items-center justify-center">
                                  {field.value ? (
                                    <img src={field.value} alt="Signature" className="max-h-full max-w-full object-contain" />
                                  ) : (
                                    <div className="text-muted-foreground text-xs flex flex-col items-center">
                                      <FileSignature className="h-4 w-4 mb-1 opacity-20" />
                                      Aucune signature
                                    </div>
                                  )}
                                </div>
                                <ImageUploader
                                  onUploadComplete={handleSignatureUploadComplete}
                                  storagePath={`ecoles/${schoolId}/signatures/`}
                                  resizeWidth={600}
                                  maxSize={1 * 1024 * 1024} // 1MB
                                >
                                  <Button type="button" variant="outline" disabled={!schoolId}>
                                    <Upload className="h-4 w-4 mr-2" />
                                    {field.value ? "Changer la signature" : "Télécharger ma signature"}
                                  </Button>
                                </ImageUploader>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                </Accordion>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
                    {isSaving ? (<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sauvegarde...</span>)
                      : ("Enregistrer les Modifications")}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {schoolData?.schoolCode && (
              <InvitationCode code={schoolData.schoolCode} onCopy={handleCopyCode} />
            )}

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Zone de Danger</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={() => setIsResetDialogOpen(true)}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Réinitialiser mon compte / Quitter l'école
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Cette action vous dissociera de l'école actuelle. Utile si vous avez rejoint une école par erreur.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous absolument sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Votre compte sera dissocié de l'école actuelle et vous serez déconnecté. Vous pourrez ensuite créer une nouvelle école ou en rejoindre une autre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetAccount} className="bg-destructive hover:bg-destructive/90">
              Oui, réinitialiser mon compte
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

