
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { SchoolCreationService } from '@/services/school-creation';
import { Logo } from '@/components/logo';
import { ImageUploader } from '@/components/image-uploader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ArrowLeft, Upload, Building, MapPin, Phone, Mail } from 'lucide-react';
import Link from 'next/link';
import { DRENA_LIST } from '@/lib/drena-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Schéma de validation amélioré
const createSchoolSchema = z.object({
  name: z.string()
    .min(3, "Le nom de l'école doit comporter au moins 3 caractères.")
    .max(100, "Le nom de l'école est trop long."),
  drena: z.string().min(1, "La DRENA de tutelle est requise."),
  address: z.string()
    .min(5, "L'adresse doit comporter au moins 5 caractères.")
    .max(200, "L'adresse est trop longue.")
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .regex(/^(?:\+225|225)?(01|05|07|25|27)[0-9]{8}$/, "Numéro de téléphone ivoirien invalide.")
    .optional()
    .or(z.literal('')),
  email: z.string()
    .email("L'adresse e-mail est invalide.")
    .max(100, "L'email est trop long.")
    .optional()
    .or(z.literal('')),
  mainLogoUrl: z.string().url().optional().or(z.literal('')),
});

type CreateSchoolFormValues = z.infer<typeof createSchoolSchema>;

export default function CreateSchoolPage() {
  const router = useRouter();
  const { user, loading: userLoading, hasSchool, reloadUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFirestoreReady, setIsFirestoreReady] = useState(false);

  const form = useForm<CreateSchoolFormValues>({
    resolver: zodResolver(createSchoolSchema),
    defaultValues: {
      name: '',
      drena: '',
      address: '',
      phone: '',
      email: user?.email || '',
      mainLogoUrl: '',
    },
    mode: 'onChange',
  });
  
  // Vérifier que Firestore est prêt
  useEffect(() => {
    if (firestore) {
      setIsFirestoreReady(true);
    }
  }, [firestore]);

  // Mettre à jour l'email si l'utilisateur est connecté
  useEffect(() => {
    if (user?.email) {
      form.setValue('email', user.email);
    }
  }, [user, form]);
  
  useEffect(() => {
      // Si `hasSchool` devient vrai après une mise à jour, redirigez.
      if (hasSchool) {
          router.replace('/dashboard');
      }
  }, [hasSchool, router]);


  const handleSubmit = async (values: CreateSchoolFormValues) => {
    if (!user || !user.uid) {
      toast({ 
        variant: 'destructive', 
        title: 'Erreur d\'authentification', 
        description: 'Veuillez vous reconnecter pour créer une école.' 
      });
      return;
    }

    if (!isFirestoreReady) {
      toast({ 
        variant: 'destructive', 
        title: 'Erreur', 
        description: 'Le système de base de données n\'est pas encore prêt.' 
      });
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    const nameParts = user.displayName?.split(' ') || ['Directeur', ''];
    const firstName = nameParts[0] || 'Directeur';
    const lastName = nameParts.slice(1).join(' ') || '';

    const schoolService = new SchoolCreationService(firestore);
    
    try {
      const result = await schoolService.createSchool({
        ...values,
        mainLogoUrl: logoUrl || '',
        directorId: user.uid,
        directorFirstName: firstName,
        directorLastName: lastName,
        directorEmail: user.email || values.email || '',
      });

      if (result.success) {
        toast({
          title: '🎉 École créée avec succès !',
          description: "Étape suivante : configuration de la structure.",
          duration: 5000,
        });
        
        // On redirige vers la page de configuration de la structure
        router.push('/onboarding/setup-structure');
      }
    } catch (error: any) {
      console.error('Erreur création école:', error);
      
      let errorMessage = "Une erreur inattendue est survenue.";
      if (error.message?.includes('permissions')) {
        errorMessage = "Permissions insuffisantes. Vérifiez les règles de sécurité Firestore.";
      } else if (error.message?.includes('already exists')) {
        errorMessage = "Cette école existe déjà ou vous avez déjà une école associée à votre compte.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Problème de connexion. Vérifiez votre connexion internet.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Échec de la création',
        description: errorMessage,
      });
      setIsProcessing(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Accès non autorisé</CardTitle>
            <CardDescription className="text-center">
              Vous devez être connecté pour créer une école.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/login">Se connecter</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Créer votre Établissement</h1>
          <p className="mt-2 text-muted-foreground">
            Commencez par renseigner les informations de base de votre école
          </p>
        </div>

        <Card className="border shadow-lg">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Informations de l'établissement
            </CardTitle>
            <CardDescription>
              Ces informations seront visibles par les parents, élèves et collaborateurs.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form id="create-school-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <FormLabel className="text-base">Logo de l'école</FormLabel>
                    <FormDescription className="text-sm">
                      Optionnel - Taille recommandée : 300×300px
                    </FormDescription>
                  </div>
                  
                  <FormField control={form.control} name="mainLogoUrl" render={({ field }) => (
                    <FormItem className="flex flex-col items-center">
                      <FormControl>
                        <ImageUploader 
                          onUploadComplete={(url) => { 
                            field.onChange(url); 
                            setLogoUrl(url); 
                          }}
                          storagePath={`temp-logos/${user.uid}/`}
                        >
                          <div className="relative group cursor-pointer">
                            <Avatar className="h-32 w-32 border-4 border-background shadow-lg group-hover:opacity-90 transition-opacity">
                              <AvatarImage src={logoUrl || undefined} alt="Logo de l'école" />
                              <AvatarFallback className="flex flex-col items-center justify-center bg-muted">
                                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                <span className="text-sm text-muted-foreground">Ajouter un logo</span>
                              </AvatarFallback>
                            </Avatar>
                            {logoUrl && (
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">Modifier</span>
                              </div>
                            )}
                          </div>
                        </ImageUploader>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                 <FormField control={form.control} name="drena" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            DRENA de tutelle *
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Sélectionnez votre DRENA" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {DRENA_LIST.map((drena) => (
                                    <SelectItem key={drena.name} value={drena.name}>
                                        {drena.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>
                            Direction Régionale de l'Éducation Nationale de tutelle.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Nom de l'école *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Lycée d'Excellence de GèreEcole" 
                        {...field} 
                        className="h-12"
                      />
                    </FormControl>
                    <FormDescription>
                      Le nom officiel de votre établissement
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Adresse
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Cocody Angré, Abidjan, Côte d'Ivoire" 
                        {...field} 
                        className="h-12"
                      />
                    </FormControl>
                    <FormDescription>
                      Adresse complète de l'établissement
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Téléphone
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="Ex: +2250707942880" 
                          {...field} 
                          className="h-12"
                        />
                      </FormControl>
                      <FormDescription>
                        Format: +225 XX XX XX XX XX
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email de contact
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="contact@ecole.com" 
                          {...field} 
                          className="h-12"
                        />
                      </FormControl>
                      <FormDescription>
                        Email principal pour les communications
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </form>
            </Form>
            <Alert className="bg-primary/5 border-primary/20">
              <AlertDescription className="text-sm">
                <strong>Important :</strong> Après la création, vous recevrez un code d'invitation unique 
                que vous pourrez partager avec vos collaborateurs pour les ajouter à l'école.
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 border-t pt-6">
            <Button 
              type="submit" 
              form="create-school-form" 
              className="w-full h-12 text-base"
              disabled={isProcessing || !form.formState.isValid}
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Création en cours...
                </>
              ) : (
                'Créer l\'établissement'
              )}
            </Button>
            
            <Button 
              asChild 
              variant="ghost" 
              className="text-muted-foreground hover:text-foreground"
            >
              <Link href="/onboarding">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à l'accueil
              </Link>
            </Button>
          </CardFooter>
        </Card>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Gratuit pour commencer</h3>
                <p className="text-sm text-muted-foreground">
                  Créez votre école gratuitement sans engagement
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Support inclus</h3>
                <p className="text-sm text-muted-foreground">
                  Assistance technique gratuite pendant 30 jours
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Évolutif</h3>
                <p className="text-sm text-muted-foreground">
                  Ajoutez des fonctionnalités selon vos besoins
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
