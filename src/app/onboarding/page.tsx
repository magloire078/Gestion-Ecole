
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useAuth } from "@/firebase";
import { doc, writeBatch } from "firebase/firestore";
import { Logo } from '@/components/logo';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export default function OnboardingPage() {
  const { user, loading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
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

    const schoolId = schoolName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const schoolData = { name: schoolName, directorId: user.uid, createdAt: new Date() };
    const schoolRef = doc(firestore, `schools/${schoolId}`);
    
    // This is the user document inside the school's subcollection
    const schoolUserRef = doc(firestore, `schools/${schoolId}/users/${user.uid}`);
    const schoolUserData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        schoolId: schoolId,
        role: 'director',
    };

    try {
        const batch = writeBatch(firestore);
        
        // Set the school document
        batch.set(schoolRef, schoolData);

        // Set the user document in the school's subcollection
        batch.set(schoolUserRef, schoolUserData);
        
        await batch.commit();

        toast({
            title: 'École créée avec succès !',
            description: `Bienvenue à ${schoolName}. Vous allez être redirigé.`,
        });
        
        // No need to refresh token as we are not using custom claims for this logic
        // Use a full page reload to ensure auth state and component state is fully refreshed
        window.location.href = '/dashboard';

    } catch (error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `[BATCH WRITE] schools/${schoolId} and schools/${schoolId}/users/${user.uid}`,
                operation: 'write',
                requestResourceData: { school: schoolData, user: schoolUserData },
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
             console.error("Error creating school:", error);
            toast({
                variant: 'destructive',
                title: 'Erreur lors de la création',
                description: 'Impossible de créer l\'école. Veuillez réessayer.',
            });
        }
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
