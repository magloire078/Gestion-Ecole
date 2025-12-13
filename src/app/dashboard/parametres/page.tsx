
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useSchoolData } from "@/hooks/use-school-data";
import { useUser, useFirestore, useAuth } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, AlertCircle, Upload, FileSignature, LogOut, Trash2, Users, Check, User, Phone, Globe, Loader2, CheckCircle } from "lucide-react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ImageUploader } from "@/components/image-uploader";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const settingsSchema = z.object({
  name: z.string().min(1, "Le nom de l'école est requis."),
  matricule: z.string().regex(/^[A-Z0-9\/-]*$/, { message: "Format de matricule invalide" }).optional().or(z.literal('')),
  cnpsEmployeur: z.string().regex(/^[0-9]*$/, { message: "Le numéro CNPS doit contenir uniquement des chiffres" }).optional().or(z.literal('')),
  directorFirstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  directorLastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  directorPhone: z.string().regex(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/, "Numéro de téléphone invalide").optional().or(z.literal('')),
  address: z.string().max(200).optional(),
  phone: z.string().regex(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/, "Numéro de téléphone invalide").optional().or(z.literal('')),
  website: z.string().url({ message: "URL invalide" }).optional().or(z.literal('')),
  mainLogoUrl: z.string().url({ message: "URL invalide" }).optional().or(z.literal('')),
  email: z.string().email("Email invalide").optional().or(z.literal('')),
});


type SettingsFormValues = z.infer<typeof settingsSchema>;

const InvitationCode = ({ code, onCopy }: { code: string; onCopy: () => void }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Code d'Invitation
        </CardTitle>
        <CardDescription>
          Partagez ce code avec vos collaborateurs pour leur permettre de rejoindre votre école.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-white dark:bg-card px-4 py-3 rounded-md border font-mono text-lg tracking-wider text-center">
            {code}
          </code>
          <Button 
            variant={copied ? "default" : "outline"} 
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Copié !
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Copier
              </span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};


export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const { schoolData, loading, updateSchoolData } = useSchoolData();
  const [error, setError] = useState<string | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
        name: "",
        directorFirstName: "",
        directorLastName: "",
        matricule: "",
        cnpsEmployeur: "",
        directorPhone: "",
        address: "",
        phone: "",
        website: "",
        mainLogoUrl: "",
        email: "",
    }
  });

  useEffect(() => {
    if (schoolData) {
      form.reset({
        name: schoolData.name || "",
        directorFirstName: schoolData.directorFirstName || "",
        directorLastName: schoolData.directorLastName || "",
        matricule: schoolData.matricule || "",
        cnpsEmployeur: schoolData.cnpsEmployeur || "",
        directorPhone: schoolData.directorPhone || "",
        address: schoolData.address || "",
        phone: schoolData.phone || "",
        website: schoolData.website || "",
        mainLogoUrl: schoolData.mainLogoUrl || "",
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
        form.reset(values, { keepValues: true }); // Re-synchronise l'état dirty après la sauvegarde
        toast({
            title: "✅ Paramètres enregistrés",
            description: "Les informations ont été mises à jour avec succès.",
            duration: 3000,
        });
    } catch (error: any) {
        let errorMessage = "Impossible d'enregistrer les paramètres. Vérifiez vos permissions.";
        if (error.code === 'permission-denied') {
            errorMessage = "Permission refusée. Vérifiez que vous êtes bien directeur de cette école.";
        } else if (error.code === 'not-found') {
            errorMessage = "L'école n'existe plus ou a été supprimée.";
        }
        setError(errorMessage);
        toast({
            variant: "destructive",
            title: "❌ Erreur de sauvegarde",
            description: errorMessage,
            duration: 5000,
        });
    } finally {
        setIsSaving(false);
    }
};
  
  const handleLogoUploadComplete = (url: string) => {
      form.setValue('mainLogoUrl', url, { shouldDirty: true });
      form.handleSubmit(handleSaveChanges)();
  }

  const handleCopyCode = () => {
    if (schoolData?.schoolCode) {
      navigator.clipboard.writeText(schoolData.schoolCode);
      toast({ title: "Code copié !", description: "Le code de l'établissement a été copié dans le presse-papiers." });
    }
  };

  const handleResetAccount = async () => {
    if (!user || !firestore) {
      toast({ variant: "destructive", title: "Erreur", description: "Utilisateur non authentifié." });
      return;
    }
    try {
      const userRootRef = doc(firestore, 'utilisateurs', user.uid);
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
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-[70vh] w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-muted-foreground">Gérez les informations de votre établissement scolaire.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/parametres/fiche-etablissement')}>
            <span className="flex items-center gap-2">
              <FileSignature className="h-4 w-4" />
              Fiche établissement
            </span>
          </Button>
        </div>
      </div>

       {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSaveChanges)}>
                <Tabs defaultValue="school" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="school">École</TabsTrigger>
                    <TabsTrigger value="director">Direction</TabsTrigger>
                    <TabsTrigger value="contact">Contact</TabsTrigger>
                    <TabsTrigger value="danger">Zone Danger</TabsTrigger>
                  </TabsList>
                  
                  <Card className="mt-6">
                    <CardContent className="p-6">
                      <TabsContent value="school" className="space-y-6 mt-0">
                         <FormField control={form.control} name="mainLogoUrl" render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center gap-4">
                                {field.value && <img src={field.value} alt="Logo" className="w-20 h-20 object-contain border rounded-md p-1" />}
                                 <div className="space-y-2 flex-1">
                                    <FormLabel>Logo de l'école</FormLabel>
                                    <ImageUploader onUploadComplete={handleLogoUploadComplete} storagePath={`ecoles/${schoolData?.schoolCode || 'logos'}/`}>
                                        <Button type="button" variant="outline">
                                          <span className="flex items-center gap-2">
                                            <Upload className="h-4 w-4"/> {field.value ? "Changer" : "Télécharger"}
                                          </span>
                                        </Button>
                                    </ImageUploader>
                                 </div>
                                </div>
                            </FormItem>
                         )} />
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de l'École</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="matricule" render={({ field }) => (<FormItem><FormLabel>Matricule de l'Établissement</FormLabel><FormControl><Input placeholder="Ex: 0123/ETAB/2024" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="cnpsEmployeur" render={({ field }) => (<FormItem><FormLabel>N° CNPS Employeur</FormLabel><FormControl><Input placeholder="Numéro d'immatriculation CNPS de l'école" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                      </TabsContent>
                      <TabsContent value="director" className="space-y-6 mt-0">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField control={form.control} name="directorFirstName" render={({ field }) => (<FormItem><FormLabel>Prénom du Directeur</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                          <FormField control={form.control} name="directorLastName" render={({ field }) => (<FormItem><FormLabel>Nom du Directeur</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                        <FormField control={form.control} name="directorPhone" render={({ field }) => (<FormItem><FormLabel>Téléphone du Directeur</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                      </TabsContent>
                      <TabsContent value="contact" className="space-y-6 mt-0">
                         <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Adresse de l'École</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                         <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Téléphone de l'École</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                         <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>Site Web</FormLabel><FormControl><Input type="url" placeholder="https://www.mon-ecole.com" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                         <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email de contact</FormLabel><FormControl><Input type="email" placeholder="contact@ecole.com" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                      </TabsContent>
                      <TabsContent value="danger" className="mt-0">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Attention</AlertTitle>
                            <AlertDescription>
                                Les actions dans cette section sont irréversibles.
                            </AlertDescription>
                        </Alert>
                         <div className="mt-4">
                           <Button type="button" variant="destructive" onClick={() => setIsResetDialogOpen(true)}>
                                <span className="flex items-center gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Réinitialiser Mon Compte
                                </span>
                           </Button>
                           <p className="text-xs text-muted-foreground mt-2">
                                Dissocie votre compte de l'école et vous déconnecte.
                           </p>
                        </div>
                      </TabsContent>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                       <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
                        {isSaving ? (
                          <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sauvegarde...</span>
                        ) : !form.formState.isDirty ? (
                          <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Enregistré</span>
                        ) : (
                          "Enregistrer les Modifications"
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </Tabs>
              </form>
            </Form>
        </div>
        <div className="space-y-6">
           <InvitationCode code={schoolData?.schoolCode || '...'} onCopy={handleCopyCode} />
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Mon Profil</CardTitle>
                    <CardDescription>Vos informations personnelles.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Nom complet</Label>
                        <Input value={user?.displayName || ''} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={user?.email || ''} disabled />
                    </div>
                     <div className="space-y-2">
                        <Label>Rôle</Label>
                        <Input value={user?.profile?.role || 'Directeur'} className="capitalize" disabled />
                    </div>
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
