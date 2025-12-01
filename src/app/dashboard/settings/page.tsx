
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useSchoolData } from "@/hooks/use-school-data";
import { useUser } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy } from "lucide-react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const settingsSchema = z.object({
  name: z.string().min(1, { message: "Le nom de l'école est requis." }),
  matricule: z.string().optional(),
  directorName: z.string().min(1, { message: "Le nom du directeur est requis." }),
  directorPhone: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const { 
    schoolData,
    loading, 
    updateSchoolData 
  } = useSchoolData();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: "",
      directorName: "",
      matricule: "",
      directorPhone: "",
    },
  });

  useEffect(() => {
    if (schoolData) {
      form.reset({
        name: schoolData.name || "",
        directorName: schoolData.directorName || "",
        matricule: schoolData.matricule || "",
        directorPhone: schoolData.directorPhone || "",
      });
    }
  }, [schoolData, form]);

  const handleSaveChanges = async (values: SettingsFormValues) => {
    try {
      await updateSchoolData({
        name: values.name,
        directorName: values.directorName,
        matricule: values.matricule,
        directorPhone: values.directorPhone,
      });
      toast({
        title: "Paramètres enregistrés",
        description: "Les informations de l'école ont été mises à jour.",
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'enregistrer les paramètres. Vérifiez vos permissions.",
      });
    }
  };

  const handleCopyCode = () => {
    if (schoolData?.schoolCode) {
      navigator.clipboard.writeText(schoolData.schoolCode);
      toast({
        title: "Code copié !",
        description: "Le code de l'établissement a été copié dans le presse-papiers.",
      });
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
      {[...Array(2)].map((_, i) => (
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
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Paramètres Généraux</h1>
        <p className="text-muted-foreground">
          Gérez les paramètres de votre compte et de votre école.
        </p>
      </div>
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSaveChanges)}>
            <CardHeader>
              <CardTitle>École</CardTitle>
              <CardDescription>Modifiez les détails de votre établissement et consultez son code.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'École</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom de votre école" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="matricule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matricule de l'Établissement</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 0123/ETAB/2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <FormField
                control={form.control}
                name="directorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du Directeur</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom du directeur ou de la directrice" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="directorPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone du Directeur</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Numéro de téléphone" {...field} />
                    </FormControl>
                     <FormMessage />
                  </FormItem>
                )}
              />
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
    </div>
  );
}
