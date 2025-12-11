

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useAuth } from "@/firebase";
import { doc, writeBatch, collection, query, where, getDocs } from "firebase/firestore";
import { Logo } from '@/components/logo';
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type OnboardingMode = "create" | "join";

export default function OnboardingPage() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<OnboardingMode>("create");
  const [schoolCode, setSchoolCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleJoinSchool = async () => {
    if (!user || !user.uid || !user.displayName) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Utilisateur non authentifié ou nom d\'affichage manquant.' });
        return;
    }
    if (!schoolCode.trim()) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Le code de l\'établissement est requis.' });
        return;
    }

    setIsProcessing(true);

    try {
        const schoolsRef = collection(firestore, 'ecoles');
        const q = query(schoolsRef, where("schoolCode", "==", schoolCode.trim()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            toast({ variant: 'destructive', title: 'Code Invalide', description: 'Aucun établissement trouvé avec ce code. Veuillez vérifier et réessayer.' });
            setIsProcessing(false);
            return;
        }

        const schoolDoc = querySnapshot.docs[0];
        const schoolId = schoolDoc.id;
        const nameParts = user.displayName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');


        const rootUserRef = doc(firestore, `utilisateurs/${user.uid}`);
        const staffProfileRef = doc(firestore, `ecoles/${schoolId}/personnel/${user.uid}`);
        
        const rootUserData = { schoolId: schoolId };
        const staffProfileData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            schoolId: schoolId,
            role: 'enseignant', // Default role for joining users
            firstName: firstName,
            lastName: lastName,
            hireDate: new Date().toISOString().split('T')[0],
        };

        const batch = writeBatch(firestore);
        batch.set(rootUserRef, rootUserData);
        batch.set(staffProfileRef, staffProfileData);
        await batch.commit();

        await auth.currentUser?.getIdToken(true);

        toast({
            title: 'Bienvenue !',
            description: `Vous avez rejoint l'établissement ${schoolDoc.data().name}.`,
        });

        window.location.href = '/dashboard';

    } catch(error: any) {
         const permissionError = new FirestorePermissionError({
            path: `/utilisateurs/${user.uid} and /personnel/${user.uid}`,
            operation: 'write',
            requestResourceData: { schoolCode },
        });
        errorEmitter.emit('permission-error', permissionError);
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
          <CardTitle className="text-2xl">Bienvenue sur GèreEcole</CardTitle>
          <CardDescription>
            Commencez par créer votre établissement ou rejoignez-en un existant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <RadioGroup defaultValue="create" onValueChange={(value: OnboardingMode) => setMode(value)} className="grid grid-cols-2 gap-4">
                <div>
                    <RadioGroupItem value="create" id="create" className="peer sr-only" />
                    <Label htmlFor="create" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                        Créer une école
                    </Label>
                </div>
                <div>
                    <RadioGroupItem value="join" id="join" className="peer sr-only" />
                    <Label htmlFor="join" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                        Rejoindre une école
                    </Label>
                </div>
            </RadioGroup>

            {mode === 'create' && (
                <div className="text-center space-y-4 animate-in fade-in-50">
                    <p className="text-sm text-muted-foreground">
                        Vous serez guidé(e) à travers un assistant pour configurer votre nouvelle école.
                    </p>
                </div>
            )}

            {mode === 'join' && (
                 <div className="space-y-4 animate-in fade-in-50">
                    <div className="grid gap-2">
                        <Label htmlFor="school-code">Code de l'établissement</Label>
                        <Input
                        id="school-code"
                        placeholder="Ex: LAU-1234"
                        value={schoolCode}
                        onChange={(e) => setSchoolCode(e.target.value)}
                        disabled={isProcessing}
                        />
                    </div>
                </div>
            )}

        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={mode === 'create' ? () => router.push('/dashboard/onboarding/create-school') : handleJoinSchool} 
            disabled={isProcessing}
          >
             {isProcessing 
                ? 'Traitement en cours...' 
                : (mode === 'create' ? 'Continuer vers la Création' : 'Rejoindre l\'établissement')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
