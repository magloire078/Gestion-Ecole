
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser } from '@/hooks/use-user';
import { useFirestore } from "@/firebase";
import { doc, writeBatch, collection, query, where, getDocs, getDoc, updateDoc } from "firebase/firestore";
import { Logo } from '@/components/logo';
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { staff as Staff, user_root, parent as Parent, parent_session } from '@/lib/data-types';
import { Loader2, PlayCircle } from 'lucide-react';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { DEMO_DIRECTOR_EMAIL, DEMO_SCHOOL_NAME } from '@/lib/demo-data';
import { SchoolCreationService } from '@/services/school-creation';
import { seedDemoData } from '@/services/demo-seeding';

type OnboardingMode = "create" | "join" | "parent";

function DemoOnboarding({ onSetupDemo, isProcessing }: { onSetupDemo: () => void, isProcessing: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl">Bienvenue sur la Démo</CardTitle>
          <CardDescription>
            Prêt à explorer GèreEcole ? Cliquez ci-dessous pour initialiser un environnement de démonstration complet.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Cela créera automatiquement une école fictive, "Groupe Scolaire Les Lauréats", avec des élèves, du personnel et des données pré-remplies pour vous permettre de tester toutes les fonctionnalités.
          </p>
        </CardContent>
        <CardFooter>
          <Button className="w-full h-12 text-base" onClick={onSetupDemo} disabled={isProcessing}>
            {isProcessing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Initialisation...</>
            ) : (
              <><PlayCircle className="mr-2 h-5 w-5" />Initialiser l'environnement de démo</>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading, hasSchool, reloadUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<OnboardingMode>("create");
  const [schoolCode, setSchoolCode] = useState('');
  const [role, setRole] = useState('enseignant');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parentAccessCode, setParentAccessCode] = useState('');
  
  const handleSetupDemo = async () => {
    if (!user || !user.uid) return;
    setIsProcessing(true);

    const schoolService = new SchoolCreationService(firestore);
    try {
      const directorNameParts = user.displayName?.split(' ') || ['Directeur', ''];
      const result = await schoolService.createSchool({
        name: DEMO_SCHOOL_NAME,
        drena: 'DRENA Abidjan 1',
        directorId: user.uid,
        directorFirstName: directorNameParts[0],
        directorLastName: directorNameParts.slice(1).join(' '),
        directorEmail: user.email!,
      });
      
      if (result.success && result.schoolId) {
        toast({ title: "École de démo créée...", description: "Remplissage des données en cours." });
        await seedDemoData(firestore, result.schoolId);
        toast({ title: 'Environnement de démo prêt !', description: 'Redirection vers votre tableau de bord.' });
        await reloadUser();
        router.push('/dashboard');
      } else {
        throw new Error(result.error || "La création de l'école de démo a échoué.");
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
      setIsProcessing(false);
    }
  };

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

  if (user && user.email === DEMO_DIRECTOR_EMAIL && !hasSchool) {
    return <DemoOnboarding onSetupDemo={handleSetupDemo} isProcessing={isProcessing} />;
  }
  
  const handleJoinSchool = async () => {
    if (!user || !user.uid || !user.displayName || !user.email) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Utilisateur non authentifié ou informations manquantes.' });
      return;
    }
    
    if (!schoolCode.trim()) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le code de l\'établissement est requis.' });
      return;
    }
    
    if (!role) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner votre rôle dans l\'établissement.' });
      return;
    }

    setIsProcessing(true);

    try {
      const schoolsRef = collection(firestore, 'ecoles');
      const q = query(schoolsRef, where("schoolCode", "==", schoolCode.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ variant: 'destructive', title: 'Code Invalide', description: 'Aucun établissement trouvé avec ce code. Veuillez vérifier et réessayer.' });
        setIsProcessing(false);
        return;
      }

      const schoolDoc = querySnapshot.docs[0];
      const schoolId = schoolDoc.id;
      const nameParts = user.displayName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const userRootRef = doc(firestore, `users/${user.uid}`);
      const staffProfileRef = doc(firestore, `ecoles/${schoolId}/personnel/${user.uid}`);
      
      const batch = writeBatch(firestore);

      const staffProfileData: Omit<Staff, 'id'> = {
        uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL || '',
        schoolId: schoolId, role: role as any, firstName: firstName, lastName: lastName,
        hireDate: new Date().toISOString().split('T')[0], baseSalary: 0, status: 'Actif',
      };
      batch.set(staffProfileRef, staffProfileData);
      
      const userRootSnap = await getDoc(userRootRef);
      const currentSchools = userRootSnap.exists() ? (userRootSnap.data() as user_root).schools || {} : {};
      const updatedSchools = { ...currentSchools, [schoolId]: role };

      const userRootData: Partial<user_root> = { schools: updatedSchools, activeSchoolId: schoolId };
      batch.set(userRootRef, userRootData, { merge: true });

      await batch.commit();
      await reloadUser();

      toast({ title: 'Bienvenue !', description: `Vous avez rejoint l'établissement ${schoolDoc.data().name}. Redirection en cours...` });
      
      router.replace('/dashboard');

    } catch(error: any) {
      console.error('Erreur lors de la jonction:', error);
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `[BATCH] /users/... & /ecoles/...`, operation: 'write', requestResourceData: { schoolCode }}));
      toast({ variant: 'destructive', title: 'Erreur', description: error.message || 'Une erreur est survenue.' });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleParentJoin = async () => {
    if (!user || !user.uid) { toast({ variant: 'destructive', title: 'Erreur', description: 'Utilisateur non authentifié.' }); return; }
    if (!parentAccessCode.trim()) { toast({ variant: 'destructive', title: 'Erreur', description: 'Le code d\'accès parent est requis.' }); return; }
    setIsProcessing(true);
    try {
        const sessionsRef = collection(firestore, 'sessions_parents');
        const q = query(sessionsRef, where("accessCode", "==", parentAccessCode.trim()), where("isActive", "==", true));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            toast({ variant: 'destructive', title: 'Code Invalide', description: 'Ce code d\'accès est invalide, expiré ou a déjà été utilisé.' });
            setIsProcessing(false);
            return;
        }
        const sessionDoc = querySnapshot.docs[0];
        const sessionData = sessionDoc.data() as parent_session;
        if (sessionData.expiresAt && new Date(sessionData.expiresAt) < new Date()) {
            await updateDoc(sessionDoc.ref, { isActive: false });
            toast({ variant: 'destructive', title: 'Code Expiré', description: 'Ce code d\'accès a expiré. Veuillez en demander un nouveau.' });
            setIsProcessing(false);
            return;
        }
        const schoolId = sessionData.schoolId!;
        const studentIds = sessionData.studentIds!;
        const batch = writeBatch(firestore);
        const userRootRef = doc(firestore, `users/${user.uid}`);
        const userRootSnap = await getDoc(userRootRef);
        const currentSchools = userRootSnap.exists() ? (userRootSnap.data() as user_root).schools || {} : {};
        const updatedSchools = { ...currentSchools, [schoolId]: 'parent' };
        batch.set(userRootRef, { schools: updatedSchools, activeSchoolId: schoolId }, { merge: true });
        const parentProfileRef = doc(firestore, `ecoles/${schoolId}/parents/${user.uid}`);
        const parentProfileSnap = await getDoc(parentProfileRef);
        const existingStudentIds = parentProfileSnap.exists() ? (parentProfileSnap.data() as Parent).studentIds || [] : [];
        const newStudentIds = [...new Set([...existingStudentIds, ...studentIds])];
        batch.set(parentProfileRef, { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL, schoolId: schoolId, studentIds: newStudentIds }, { merge: true });
        for (const studentId of studentIds) {
            const studentRef = doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`);
            const studentSnap = await getDoc(studentRef);
            if (studentSnap.exists()) {
                const studentData = studentSnap.data();
                const parentIds = [...new Set([...(studentData.parentIds || []), user.uid])];
                batch.update(studentRef, { parentIds: parentIds });
            }
        }
        batch.update(sessionDoc.ref, { isActive: false });
        await batch.commit();
        await reloadUser();
        toast({ title: 'Accès parent activé!', description: 'Vous pouvez maintenant consulter les informations de votre enfant.'});
        router.replace('/dashboard');
    } catch(error: any) {
        console.error('Erreur lors de la liaison parent:', error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue.' });
    } finally {
        setIsProcessing(false);
    }
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl">Bienvenue sur GèreEcole</CardTitle>
          <CardDescription>
            Commencez par créer votre établissement ou rejoignez-en un.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup 
            defaultValue="create" 
            onValueChange={(value: any) => setMode(value)} 
            className="grid grid-cols-3 gap-4"
            disabled={isProcessing}
          >
            <div>
              <RadioGroupItem value="create" id="create" className="peer sr-only" />
              <Label 
                htmlFor="create" 
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors h-full"
              >
                Créer une école
              </Label>
            </div>
            <div>
              <RadioGroupItem value="join" id="join" className="peer sr-only" />
              <Label 
                htmlFor="join" 
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors h-full"
              >
                Rejoindre (Personnel)
              </Label>
            </div>
             <div>
              <RadioGroupItem value="parent" id="parent" className="peer sr-only" />
              <Label 
                htmlFor="parent" 
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors h-full"
              >
                Accès Parent
              </Label>
            </div>
          </RadioGroup>
          {mode === 'create' && ( <div className="text-center space-y-4 animate-in fade-in-50"> <p className="text-sm text-muted-foreground"> Vous serez guidé(e) pour configurer votre nouvelle école et en deviendrez le directeur. </p> </div> )}
          {mode === 'join' && ( <div className="space-y-4 animate-in fade-in-50"> <div className="grid gap-2"> <Label htmlFor="school-code">Code de l'établissement</Label> <Input id="school-code" placeholder="Ex: LAU-1234" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value.toUpperCase())} disabled={isProcessing} /> <p className="text-xs text-muted-foreground"> Demandez ce code à l'administrateur de l'école. </p> </div> <div className="grid gap-2"> <Label htmlFor="role">Votre Rôle</Label> <Select onValueChange={setRole} defaultValue={role} disabled={isProcessing}> <SelectTrigger id="role"> <SelectValue placeholder="Sélectionnez votre rôle..." /> </SelectTrigger> <SelectContent> <SelectItem value="enseignant">Enseignant(e)</SelectItem> <SelectItem value="secretaire">Secrétaire</SelectItem> <SelectItem value="comptable">Comptable</SelectItem> <SelectItem value="surveillant">Surveillant(e)</SelectItem> <SelectItem value="bibliothecaire">Bibliothécaire</SelectItem> <SelectItem value="infirmier">Infirmier(e)</SelectItem> <SelectItem value="chauffeur">Chauffeur</SelectItem> <SelectItem value="personnel">Autre Personnel</SelectItem> </SelectContent> </Select> </div> </div> )}
          {mode === 'parent' && ( <div className="space-y-4 animate-in fade-in-50"> <div className="grid gap-2"> <Label htmlFor="parent-code">Code d'accès Parent</Label> <Input id="parent-code" placeholder="Code à 6 chiffres" value={parentAccessCode} onChange={(e) => setParentAccessCode(e.target.value)} disabled={isProcessing} maxLength={6} /> <p className="text-xs text-muted-foreground"> Ce code vous a été fourni par l'administration de l'école. </p> </div> </div> )}
          <CardFooter className="p-0 pt-4"> <Button className="w-full" onClick={ mode === 'create' ? () => router.push('/onboarding/create-school') : mode === 'join' ? handleJoinSchool : handleParentJoin } disabled={ isProcessing || (mode === 'join' && !schoolCode.trim()) || (mode === 'parent' && parentAccessCode.length < 6) } > {isProcessing ? ( <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Vérification en cours... </> ) : ( 'Continuer' )} </Button> </CardFooter>
        </CardContent>
      </Card>
    </div>
  );
}
