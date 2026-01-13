'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore } from "@/firebase";
import { doc, writeBatch, collection, query, where, getDocs } from "firebase/firestore";
import { Logo } from '@/components/logo';
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { staff as Staff, user_root } from '@/lib/data-types';
import { Loader2 } from 'lucide-react';
import { LoadingScreen } from '@/components/ui/loading-screen';

type OnboardingMode = "create" | "join";

export default function OnboardingPageClient() {
  const router = useRouter();
  const { user, loading, hasSchool, reloadUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<OnboardingMode>("create");
  const [schoolCode, setSchoolCode] = useState('');
  const [role, setRole] = useState('enseignant');
  const [isProcessing, setIsProcessing] = useState(false);
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    router.replace('/auth/login');
    return <LoadingScreen />;
  }

  if (hasSchool) {
      router.replace('/dashboard');
      return <LoadingScreen />;
  }
  
  const handleJoinSchool = async () => {
    if (!user || !user.uid || !user.displayName || !user.email) {
      toast({ 
        variant: 'destructive', 
        title: 'Erreur', 
        description: 'Utilisateur non authentifié ou informations manquantes.' 
      });
      return;
    }
    
    if (!schoolCode.trim()) {
      toast({ 
        variant: 'destructive', 
        title: 'Erreur', 
        description: 'Le code de l\'établissement est requis.' 
      });
      return;
    }
    
    if (!role) {
      toast({ 
        variant: 'destructive', 
        title: 'Erreur', 
        description: 'Veuillez sélectionner votre rôle dans l\'établissement.' 
      });
      return;
    }

    setIsProcessing(true);

    try {
      const schoolsRef = collection(firestore, 'ecoles');
      const q = query(schoolsRef, where("schoolCode", "==", schoolCode.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ 
          variant: 'destructive', 
          title: 'Code Invalide', 
          description: 'Aucun établissement trouvé avec ce code. Veuillez vérifier et réessayer.' 
        });
        setIsProcessing(false);
        return;
      }

      const schoolDoc = querySnapshot.docs[0];
      const schoolId = schoolDoc.id;
      const nameParts = user.displayName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const rootUserRef = doc(firestore, `users/${user.uid}`);
      const staffProfileRef = doc(firestore, `ecoles/${schoolId}/personnel/${user.uid}`);
      
      const rootUserData: user_root = { schoolId: schoolId, isAdmin: false };
      const staffProfileData: Omit<Staff, 'id'> = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL || '',
        schoolId: schoolId,
        role: role as any, 
        firstName: firstName,
        lastName: lastName,
        hireDate: new Date().toISOString().split('T')[0],
        baseSalary: 0,
        status: 'Actif',
      };

      const batch = writeBatch(firestore);
      batch.set(rootUserRef, rootUserData);
      batch.set(staffProfileRef, staffProfileData);
      await batch.commit();
      
      await reloadUser();

      toast({
        title: 'Bienvenue !',
        description: `Vous avez rejoint l'établissement ${schoolDoc.data().name}. Redirection en cours...`,
      });
      
      router.replace('/dashboard');

    } catch(error: any) {
      console.error('Erreur lors de la jonction:', error);
      
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `[BATCH] /users/${user.uid} & /ecoles/${schoolCode}/personnel/${user.uid}`,
        operation: 'write',
        requestResourceData: { schoolCode },
      }));
      
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la jonction.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
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
          <RadioGroup 
            defaultValue="create" 
            onValueChange={(value: any) => setMode(value)} 
            className="grid grid-cols-2 gap-4"
            disabled={isProcessing}
          >
            <div>
              <RadioGroupItem value="create" id="create" className="peer sr-only" />
              <Label 
                htmlFor="create" 
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
              >
                Créer une école
              </Label>
            </div>
            <div>
              <RadioGroupItem value="join" id="join" className="peer sr-only" />
              <Label 
                htmlFor="join" 
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
              >
                Rejoindre une école
              </Label>
            </div>
          </RadioGroup>

          {mode === 'create' && (
            <div className="text-center space-y-4 animate-in fade-in-50">
              <p className="text-sm text-muted-foreground">
                Vous serez guidé(e) à travers un assistant pour configurer votre nouvelle école.
                Vous serez automatiquement désigné comme directeur.
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
                  onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  Demandez ce code à l'administrateur de l'école
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Votre Rôle</Label>
                <Select onValueChange={setRole} defaultValue={role} disabled={isProcessing}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Sélectionnez votre rôle..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enseignant">Enseignant(e)</SelectItem>
                    <SelectItem value="secretaire">Secrétaire</SelectItem>
                    <SelectItem value="comptable">Comptable</SelectItem>
                    <SelectItem value="surveillant">Surveillant(e)</SelectItem>
                    <SelectItem value="bibliothecaire">Bibliothécaire</SelectItem>
                    <SelectItem value="infirmier">Infirmier(e)</SelectItem>
                    <SelectItem value="chauffeur">Chauffeur</SelectItem>
                    <SelectItem value="personnel">Autre Personnel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <CardFooter className="p-0 pt-4">
              <Button 
                className="w-full" 
                onClick={mode === 'create' 
                  ? () => router.push('/onboarding/create-school') 
                  : handleJoinSchool
                } 
                disabled={isProcessing || (mode === 'join' && !schoolCode.trim())}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Traitement en cours...
                  </>
                ) : mode === 'create' ? (
                  'Continuer vers la Création'
                ) : (
                  'Rejoindre l\'établissement'
                )}
              </Button>
          </CardFooter>
        </CardContent>
      </Card>
    </div>
  );
}
