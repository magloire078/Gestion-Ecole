'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { SchoolCreationService } from '@/services/school-creation';
import { Logo } from '@/components/logo';
import { ImageUploader } from '@/components/image-uploader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ArrowLeft, Upload } from 'lucide-react';
import Link from 'next/link';

const createSchoolSchema = z.object({
  name: z.string().min(3, "Le nom de l'école doit comporter au moins 3 caractères."),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("L'adresse e-mail est invalide.").optional().or(z.literal('')),
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

  const form = useForm<CreateSchoolFormValues>({
    resolver: zodResolver(createSchoolSchema),
  });
  
  useEffect(() => {
      if (!userLoading && hasSchool) {
          router.replace('/dashboard');
      }
  }, [userLoading, hasSchool, router]);


  const handleSubmit = async (values: CreateSchoolFormValues) => {
    if (!user || !user.uid || !user.displayName || !user.email) {
      toast({ 
        variant: 'destructive', 
        title: 'Erreur', 
        description: 'Utilisateur non authentifié ou informations manquantes.' 
      });
      return;
    }

    setIsProcessing(true);
    
    const nameParts = user.displayName.split(' ');
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
        directorEmail: user.email,
      });

      if (result.success) {
        await reloadUser();
        toast({
          title: 'École créée avec succès !',
          description: `Bienvenue à ${values.name}. Votre code d'invitation est : ${result.schoolCode}`,
          duration: 7000,
        });
        router.replace('/dashboard');
      }
    } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Échec de la création',
          description: error.message || "Une erreur est survenue.",
        });
    } finally {
        setIsProcessing(false);
    }
  };

  if (userLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl">Créer votre Établissement</CardTitle>
          <CardDescription>
            Renseignez les informations de base de votre école pour commencer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form id="create-school-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField control={form.control} name="mainLogoUrl" render={({ field }) => (
                    <FormItem className="flex flex-col items-center">
                        <FormLabel>Logo de l'école (optionnel)</FormLabel>
                         <FormControl>
                            <ImageUploader 
                                onUploadComplete={(url) => { field.onChange(url); setLogoUrl(url); }}
                                storagePath={`temp-logos/${user?.uid || 'anonymous'}/`}
                            >
                                <Avatar className="h-24 w-24 cursor-pointer hover:opacity-80 transition-opacity">
                                    <AvatarImage src={logoUrl || undefined} alt="Logo de l'école" />
                                    <AvatarFallback className="flex flex-col items-center justify-center space-y-1">
                                        <Upload className="h-6 w-6 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">Logo</span>
                                    </AvatarFallback>
                                </Avatar>
                            </ImageUploader>
                          </FormControl>
                    </FormItem>
                )} />

              <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Nom de l'école</FormLabel><FormControl><Input placeholder="Ex: Lycée d'Excellence de GèreEcole" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>Adresse</FormLabel><FormControl><Input placeholder="Ex: Yamoussoukro, Côte d'Ivoire" {...field} /></FormControl></FormItem>
              )} />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" placeholder="+225 xx xx xx xx xx" {...field} /></FormControl></FormItem>
                 )} />
                 <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email de contact</FormLabel><FormControl><Input type="email" placeholder="contact@ecole.com" {...field} /></FormControl><FormMessage/></FormItem>
                 )} />
               </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" form="create-school-form" className="w-full" disabled={isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isProcessing ? 'Création en cours...' : 'Créer l\'établissement'}
          </Button>
           <Button asChild variant="link" className="text-muted-foreground">
             <Link href="/onboarding">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
             </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
