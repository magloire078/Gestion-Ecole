

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
import { Copy, AlertCircle, Upload, FileSignature, LogOut, Trash2 } from "lucide-react";
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


const settingsSchema = z.object({
  name: z.string().min(1, { message: "Le nom de l'école est requis." }),
  matricule: z.string().optional(),
  cnpsEmployeur: z.string().optional(),
  directorFirstName: z.string().min(1, "Le prénom du directeur est requis."),
  directorLastName: z.string().min(1, "Le nom du directeur est requis."),
  directorPhone: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  mainLogoUrl: z.string().url({ message: "Veuillez entrer une URL valide." }).optional().or(z.literal('')),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const { 
    schoolData,
    loading, 
    updateSchoolData 
  } = useSchoolData();
  const [error, setError] = useState<string | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

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
    },
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
      });
    }
  }, [schoolData, form]);

  const handleSaveChanges = async (values: SettingsFormValues) => {
    setError(null);
    try {
      await updateSchoolData(values);
      toast({
        title: "Paramètres enregistrés",
        description: "Les informations de l'école ont été mises à jour.",
      });
    } catch (error) {
       setError("Impossible d'enregistrer les paramètres. Vérifiez vos permissions.");
    }
  };
  
  const handleLogoUploadComplete = (url: string) => {
      form.setValue('mainLogoUrl', url);
      form.handleSubmit(handleSaveChanges)();
  }

  const handleCopyCode = () => {
    if (schoolData?.schoolCode) {
      navigator.clipboard.writeText(schoolData.schoolCode);
      toast({
        title: "Code copié !",
        description: "Le code de l'établissement a été copié dans le presse-papiers.",
      });
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
  
  const renderSkeleton = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Paramètres Généraux</h1>
        <p className="text-muted-foreground">
          Gérez les paramètres de votre compte et de votre école.
        </p>
      </div>
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Skeleton className="h-10 w-48" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  if (loading) {
      return renderSkeleton();
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-lg font-semibold md:text-2xl">Paramètres Généraux</h1>
            <p className="text-muted-foreground">
              Gérez les paramètres de votre compte et de votre école.
            </p>
        </div>
         <Button variant="outline" onClick={() => router.push('/dashboard/parametres/fiche-etablissement')}>
            <FileSignature className="mr-2 h-4 w-4" />
            Voir la Fiche de l'Établissement
        </Button>
      </div>

       {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSaveChanges)}>
            <CardHeader>
              <CardTitle>École</CardTitle>
              <CardDescription>Modifiez les détails de votre établissement et consultez son code.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de l'École</FormLabel><FormControl><Input placeholder="Nom de votre école" {...field} /></FormControl><FormMessage /></FormItem>)} />
              
              <FormField
                control={form.control}
                name="mainLogoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo de l'École</FormLabel>
                    <div className="flex items-center gap-2">
                         <FormControl>
                            <Input type="url" placeholder="https://example.com/logo.png" {...field} />
                        </FormControl>
                        <ImageUploader 
                            onUploadComplete={handleLogoUploadComplete}
                            storagePath={`ecoles/${schoolData?.schoolCode || 'logos'}/`}
                        >
                            <Button type="button" variant="outline"><Upload className="mr-2 h-4 w-4"/> Télécharger</Button>
                        </ImageUploader>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField control={form.control} name="matricule" render={({ field }) => (<FormItem><FormLabel>Matricule de l'Établissement</FormLabel><FormControl><Input placeholder="Ex: 0123/ETAB/2024" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="cnpsEmployeur" render={({ field }) => (<FormItem><FormLabel>N° CNPS Employeur</FormLabel><FormControl><Input placeholder="Numéro d'immatriculation CNPS de l'école" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Adresse de l'École</FormLabel><FormControl><Input placeholder="Ex: 123, Avenue de l'Indépendance" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Téléphone de l'École</FormLabel><FormControl><Input type="tel" placeholder="Numéro de téléphone général" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>Site Web de l'École</FormLabel><FormControl><Input type="url" placeholder="https://www.mon-ecole.com" {...field} /></FormControl><FormMessage /></FormItem>)}/>
               
               {schoolData?.schoolCode && (
                <div className="space-y-2">
                  <Label htmlFor="school-code">Code d'Invitation</Label>
                  <div className="flex items-center gap-2">
                    <Input id="school-code" value={schoolData.schoolCode} readOnly className="bg-muted" />
                    <Button type="button" variant="outline" size="icon" onClick={handleCopyCode}>
                      <Copy className="h-4 w-4" />
                      <span className="sr-only">Copier le code</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Partagez ce code avec les enseignants pour leur permettre de rejoindre votre école.</p>
                </div>
               )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="directorFirstName" render={({ field }) => (<FormItem><FormLabel>Prénom du Directeur</FormLabel><FormControl><Input placeholder="Prénom" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={form.control} name="directorLastName" render={({ field }) => (<FormItem><FormLabel>Nom du Directeur</FormLabel><FormControl><Input placeholder="Nom" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              </div>
              <FormField control={form.control} name="directorPhone" render={({ field }) => (<FormItem><FormLabel>Téléphone du Directeur</FormLabel><FormControl><Input type="tel" placeholder="Numéro de téléphone" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Enregistrement..." : "Enregistrer les Modifications"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>Les informations de votre profil (non modifiables ici).</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={user?.displayName || ''} disabled />
            </div>
            <div className="space-y-2 mt-4">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled />
            </div>
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>Zone de Danger</CardTitle>
          <CardDescription>Actions irréversibles. Soyez prudent.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setIsResetDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Réinitialiser Mon Compte
          </Button>
           <p className="text-xs text-muted-foreground mt-2">
            Cette action supprimera le lien entre votre compte et cette école. Vous serez déconnecté et pourrez créer une nouvelle école ou en rejoindre une autre.
           </p>
        </CardContent>
      </Card>
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
