
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore } from "@/firebase";
import { doc, setDoc, writeBatch } from "firebase/firestore";
import { Logo } from '@/components/logo';

export default function OnboardingPage() {
  const { user, loading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [schoolName, setSchoolName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreateSchool = async () => {
    if (!user || !user.uid) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Utilisateur non authentifié.' });
        return;
    }
    if (!schoolName.trim()) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Le nom de l\'école est requis.' });
        return;
    }

    setIsProcessing(true);

    try {
        // In a real application, this part should be handled by a Cloud Function
        // that creates the school, sets the custom claim, and then returns.
        // For this demo, we will simulate this by directly writing to Firestore
        // and assuming the claim will be set externally or in a subsequent step.
        
        // This is a placeholder for the schoolId. In a real app, you'd generate a truly unique ID.
        const schoolId = schoolName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

        const batch = writeBatch(firestore);

        // 1. Create a document for the school
        const schoolRef = doc(firestore, `schools/${schoolId}`);
        batch.set(schoolRef, { name: schoolName, directorId: user.uid, createdAt: new Date() });

        // 2. Create the user's profile within that school
        const userRef = doc(firestore, `schools/${schoolId}/users/${user.uid}`);
        batch.set(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            schoolId: schoolId, // Denormalize for easy access
            role: 'director', // Assign a default role
        });
        
        await batch.commit();

        toast({
            title: 'École créée avec succès !',
            description: `Bienvenue à ${schoolName}. Vous allez être redirigé. Veuillez rafraîchir la page si la redirection ne fonctionne pas.`,
        });

        // This is the crucial part that's missing from a client-only flow:
        // await setCustomUserClaims(user.uid, { schoolId: schoolId });
        // Since we can't do this from the client, we'll inform the user.
        
        alert("IMPORTANT: Dans une application réelle, un processus serveur attribuerait maintenant votre école à votre compte. Pour cette démo, nous allons recharger la page. Vous devrez peut-être vous reconnecter pour que les changements prennent effet.");

        // Force a token refresh to try and get the new claims (if they were set by a function)
        await user.getIdToken(true);
        
        router.push('/dashboard');

    } catch (error) {
        console.error("Error creating school:", error);
        toast({
            variant: 'destructive',
            title: 'Erreur lors de la création',
            description: 'Impossible de créer l\'école. Veuillez réessayer.',
        });
    } finally {
        setIsProcessing(false);
    }
  };
  
  if (loading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="text-center">
                <p className="text-lg font-semibold">Chargement...</p>
                <p className="text-muted-foreground">Vérification de votre compte.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
                 <Logo />
            </div>
          <CardTitle className="text-2xl">Bienvenue !</CardTitle>
          <CardDescription>
            Créez votre école pour commencer à utiliser la plateforme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="school-name">Nom de votre établissement</Label>
            <Input
              id="school-name"
              placeholder="Ex: École Internationale Les Lauréats"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              disabled={isProcessing}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleCreateSchool} disabled={isProcessing}>
             {isProcessing ? 'Création en cours...' : 'Créer mon école'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

