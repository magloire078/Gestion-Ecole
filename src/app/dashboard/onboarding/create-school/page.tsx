
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { 
  School, 
  User as UserIcon,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { SchoolCreationService } from '@/services/school-creation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUploader } from '@/components/image-uploader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';


const createSchoolSchema = z.object({
  schoolName: z.string().min(3, "Le nom de l'école doit avoir au moins 3 caractères."),
  address: z.string().optional(),
  directorFirstName: z.string().min(2, "Le prénom est requis."),
  directorLastName: z.string().min(2, "Le nom est requis."),
  logoUrl: z.string().optional(),
});

type CreateSchoolFormValues = z.infer<typeof createSchoolSchema>;


export default function CreateSchoolPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const form = useForm<CreateSchoolFormValues>({
    resolver: zodResolver(createSchoolSchema),
    defaultValues: {
      schoolName: '',
      address: '',
      directorFirstName: user?.displayName?.split(' ')[0] || '',
      directorLastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
      logoUrl: '',
    }
  });
  
  // Sync user name to form once loaded
  useState(() => {
    if (user && !userLoading) {
      form.reset({
        directorFirstName: user.displayName?.split(' ')[0] || '',
        directorLastName: user.displayName?.split(' ').slice(1).join(' ') || '',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading, form.reset]);


  const handleSubmit = async (values: CreateSchoolFormValues) => {
    if (!user || !user.uid || !user.email) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Utilisateur non valide.' });
        return;
    }
    setLoading(true);

    const schoolCreationService = new SchoolCreationService(firestore);
    try {
      const result = await schoolCreationService.createSchool({
        name: values.schoolName,
        address: values.address || '',
        mainLogoUrl: logoUrl || '',
        directorId: user.uid,
        directorFirstName: values.directorFirstName,
        directorLastName: values.directorLastName,
        directorEmail: user.email,
        // Default values for other fields
        city: '', country: '', phone: '', email: '', academicYear: '2024-2025', language: 'fr', currency: 'XOF',
      }, user.uid);
      
      await auth.currentUser?.getIdToken(true); 
      
      toast({
        title: 'École créée avec succès !',
        description: `Le code de votre établissement est : ${result.schoolCode}. Vous allez être redirigé...`,
        duration: 5000,
      });

      window.location.assign('/dashboard');

    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: `La création de l'école a échoué. ${error.message}` });
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogoUploadComplete = (url: string) => {
    setLogoUrl(url);
    form.setValue('logoUrl', url, { shouldDirty: true });
  }

  const storagePath = user?.uid ? `temp-logos/${user.uid}/` : 'temp-logos/unknown/';

  return (
    <div className="min-h-screen bg-muted/40 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Créer votre établissement
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Renseignez les informations de base pour démarrer.
          </p>
        </div>
        
        <Card className="animate-in fade-in-50">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><School className="h-5 w-5 text-primary" /> Informations de l'école</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="flex items-center gap-6">
                    <ImageUploader 
                        onUploadComplete={handleLogoUploadComplete}
                        storagePath={storagePath}
                    >
                        <Avatar className={cn("h-24 w-24 cursor-pointer hover:opacity-80 transition-opacity", logoUrl && "border-2 border-primary")}>
                            <AvatarImage src={logoUrl || undefined} alt="Logo de l'école" />
                            <AvatarFallback className="flex flex-col items-center justify-center space-y-1">
                                <Upload className="h-6 w-6 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Logo</span>
                            </AvatarFallback>
                        </Avatar>
                    </ImageUploader>
                    <div className="flex-1 space-y-2">
                        <FormField control={form.control} name="schoolName" render={({ field }) => (<FormItem><FormLabel>Nom de l'établissement *</FormLabel><FormControl><Input placeholder="Ex: École Les Lauréats" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Adresse</FormLabel><FormControl><Input placeholder="Ex: Abidjan, Cocody Angré" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </div>

                <div className="space-y-4 pt-6 border-t">
                   <h3 className="font-medium flex items-center gap-2 text-lg"><UserIcon className="h-5 w-5 text-primary" /> Informations du Directeur/Fondateur</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField control={form.control} name="directorFirstName" render={({ field }) => (<FormItem><FormLabel>Votre prénom *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                       <FormField control={form.control} name="directorLastName" render={({ field }) => (<FormItem><FormLabel>Votre nom *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </div>

              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit" disabled={loading || userLoading}>
                  {loading ? 'Création en cours...' : 'Créer mon école'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
};
