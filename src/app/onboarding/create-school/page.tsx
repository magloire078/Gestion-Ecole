'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { 
  School, 
  User as UserIcon,
  Upload,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { doc, setDoc, addDoc, collection, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImageUploader } from '@/components/image-uploader';

// Schéma de validation
const createSchoolSchema = z.object({
  name: z.string()
    .min(3, "Le nom de l'école doit avoir au moins 3 caractères.")
    .max(100, "Le nom est trop long."),
  address: z.string()
    .min(5, "L'adresse doit avoir au moins 5 caractères.")
    .optional()
    .or(z.literal('')),
  directorFirstName: z.string()
    .min(2, "Le prénom est requis (2 caractères minimum).")
    .max(50, "Le prénom est trop long."),
  directorLastName: z.string()
    .min(2, "Le nom est requis (2 caractères minimum).")
    .max(50, "Le nom est trop long."),
  phone: z.string()
    .regex(/^[\d\s\-()+.]{8,20}$/, "Numéro de téléphone invalide.")
    .optional()
    .or(z.literal('')),
  email: z.string()
    .email("Email invalide.")
    .optional()
    .or(z.literal('')),
});

type CreateSchoolFormValues = z.infer<typeof createSchoolSchema>;

// Service simplifié intégré dans le composant
const generateSchoolCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function CreateSchoolPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, loading: userLoading, reloadUser } = useUser();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CreateSchoolFormValues>({
    resolver: zodResolver(createSchoolSchema),
    defaultValues: {
      name: '',
      address: '',
      directorFirstName: '',
      directorLastName: '',
      phone: '',
      email: '',
    }
  });
  
  // Pré-remplir avec les infos de l'utilisateur seulement côté client
  useEffect(() => {
    if (user?.authUser && !userLoading) {
      const nameParts = user.authUser.displayName?.split(' ') || [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      form.reset({
        ...form.getValues(),
        directorFirstName: firstName,
        directorLastName: lastName,
        email: user.authUser.email || '',
        phone: user.authUser.phoneNumber || '',
      });
    }
  }, [user, userLoading, form]);

  // Rediriger si l'utilisateur a déjà une école
  useEffect(() => {
    if (!userLoading && user?.schoolId) {
      router.push('/dashboard');
    }
  }, [user, userLoading, router]);

  const handleSubmit = async (values: CreateSchoolFormValues) => {
    if (!user || !user.authUser) {
      toast({ 
        variant: 'destructive', 
        title: 'Erreur', 
        description: 'Veuillez vous reconnecter.' 
      });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const userUid = user.authUser.uid;
      const userEmail = user.authUser.email;
      
      if (!userUid || !userEmail) {
        throw new Error('Informations utilisateur incomplètes');
      }

      const batch = writeBatch(firestore);

      // 1. Générer un code d'école unique
      const schoolCode = generateSchoolCode();

      // 2. Créer le document de l'école
      const schoolRef = doc(collection(firestore, 'ecoles'));
      const schoolId = schoolRef.id;

      const schoolData = {
        name: values.name.trim(),
        schoolCode: schoolCode,
        address: values.address?.trim() || '',
        mainLogoUrl: logoUrl || '',
        directorId: userUid,
        directorFirstName: values.directorFirstName.trim(),
        directorLastName: values.directorLastName.trim(),
        phone: values.phone?.trim() || '',
        email: values.email?.trim() || userEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active',
        isSetupComplete: false,
        subscription: {
          plan: 'Essentiel',
          status: 'trialing',
          startDate: new Date().toISOString(),
          endDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
          maxStudents: 50,
          maxCycles: 5,
        }
      };
      
      batch.set(schoolRef, schoolData);


      // 3. Mettre à jour le document utilisateur
      const userRef = doc(firestore, 'users', userUid);
      const userUpdateData = {
        schoolId: schoolId,
        schoolRole: 'director',
        updatedAt: serverTimestamp(),
      };
      batch.set(userRef, userUpdateData, { merge: true });
      
      // 4. Créer l'entrée dans les membres du personnel de l'école
      const memberRef = doc(firestore, `ecoles/${schoolId}/personnel`, userUid);
      const memberData = {
        uid: userUid,
        firstName: values.directorFirstName.trim(),
        lastName: values.directorLastName.trim(),
        displayName: `${values.directorFirstName.trim()} ${values.directorLastName.trim()}`,
        email: userEmail,
        role: 'directeur',
        adminRole: 'directeur',
        hireDate: new Date().toISOString(),
        baseSalary: 0,
        status: 'Actif',
        schoolId: schoolId,
      };
      batch.set(memberRef, memberData);
      
      // Commit all writes
      await batch.commit();

      toast({
        title: 'École créée avec succès !',
        description: (
          <div className="mt-2">
            <p>Votre code d'école: <strong className="text-lg">{schoolCode}</strong></p>
            <p className="text-sm text-muted-foreground mt-1">
              Partagez ce code avec vos collaborateurs pour qu'ils puissent vous rejoindre.
            </p>
          </div>
        ),
        duration: 10000,
      });

      // Recharger les données utilisateur et le token
      if (reloadUser) {
        await reloadUser();
      }
      await auth.currentUser?.getIdToken(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      router.replace('/dashboard');

    } catch (error: any) {
      console.error('Erreur création école:', error);
      
      let errorMessage = "Une erreur est survenue lors de la création de l'école.";
      
      if (error.code === 'permission-denied') {
        errorMessage = "Vous n'avez pas la permission de créer une école. Vérifiez vos droits.";
      }
      
      setError(errorMessage);
      toast({ 
        variant: 'destructive', 
        title: 'Erreur', 
        description: errorMessage 
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleLogoUploadComplete = (url: string) => {
    setLogoUrl(url);
  };

  const storagePath = user?.authUser?.uid 
    ? `school-logos/${user.authUser.uid}/${Date.now()}` 
    : 'school-logos/temp';

  // Afficher un loader pendant le chargement initial pour éviter l'hydratation
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-lg font-semibold">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  // Si pas d'utilisateur, rediriger (devrait être géré par AuthGuard mais sécurité supplémentaire)
  if (!user) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-8">
      <div className="w-full max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Créer votre établissement
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Configurez les informations de base pour lancer votre école sur GèreEcole
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border shadow-lg">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <School className="h-5 w-5 text-primary" />
                  Informations de base
                </CardTitle>
                <CardDescription>
                  Remplissez les informations principales de votre établissement
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-8">
                {/* Section Logo */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Logo de l'école</h3>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="flex-shrink-0">
                      <ImageUploader 
                        onUploadComplete={handleLogoUploadComplete}
                        storagePath={storagePath}
                        currentImageUrl={logoUrl || undefined}
                      >
                        <Avatar className={cn(
                          "h-32 w-32 cursor-pointer border-2 border-dashed hover:border-primary transition-all",
                          logoUrl ? "border-solid" : "border-muted-foreground/30"
                        )}>
                          <AvatarImage src={logoUrl || undefined} alt="Logo de l'école" />
                          <AvatarFallback className="flex flex-col items-center justify-center bg-muted">
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                            <span className="text-sm text-center text-muted-foreground px-2">
                              Cliquer pour uploader
                            </span>
                          </AvatarFallback>
                        </Avatar>
                      </ImageUploader>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        Téléchargez le logo de votre école. Format recommandé : PNG ou JPG, max 2MB.
                        La taille idéale est 256x256 pixels.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {/* Informations de l'école */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Informations de l'établissement</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <FormField 
                        control={form.control} 
                        name="name" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom de l'établissement *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ex: École Les Lauréats" 
                                {...field} 
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />
                      
                      <FormField 
                        control={form.control} 
                        name="address" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Adresse complète</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ex: 123 Avenue de l'Éducation, Cocody, Abidjan" 
                                {...field} 
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />
                    </div>
                  </div>

                  {/* Informations de contact */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Coordonnées de contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField 
                        control={form.control} 
                        name="phone" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Téléphone</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="+225 01 23 45 67 89" 
                                {...field} 
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />
                      
                      <FormField 
                        control={form.control} 
                        name="email" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email de contact</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="contact@ecole.fr" 
                                {...field} 
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />
                    </div>
                  </div>

                  {/* Informations du directeur */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <UserIcon className="h-5 w-5 text-primary" />
                      Informations du directeur
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField 
                        control={form.control} 
                        name="directorFirstName" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prénom *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Jean" 
                                {...field} 
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />
                      
                      <FormField 
                        control={form.control} 
                        name="directorLastName" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Dupont" 
                                {...field} 
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col sm:flex-row justify-between gap-4 border-t pt-6">
                <div className="text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Vous serez automatiquement désigné comme directeur de l'établissement.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                  >
                    Retour
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !form.formState.isValid}
                    className="min-w-[140px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Création...
                      </>
                    ) : (
                      'Créer mon école'
                    )}
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Informations supplémentaires */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-2">🎓 Rôle de directeur</h4>
              <p className="text-sm text-muted-foreground">
                En tant que directeur, vous aurez un accès complet à toutes les fonctionnalités et pourrez gérer les permissions des autres utilisateurs.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-2">🔑 Code d'accès</h4>
              <p className="text-sm text-muted-foreground">
                Un code unique sera généré pour votre école. Partagez-le avec vos collaborateurs pour qu'ils puissent vous rejoindre.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-2">⚙️ Configuration</h4>
              <p className="text-sm text-muted-foreground">
                Vous pourrez configurer les cycles, classes, et autres paramètres après la création de l'école.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
