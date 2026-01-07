'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { doc, getDocs, collection, query, where, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { Loader2 } from 'lucide-react';
import type { staff as Staff } from '@/lib/data-types';

export default function OnboardingPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, loading, reloadUser } = useUser();
  const { toast } = useToast();
  const [loadingAction, setLoadingAction] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user && user.schoolId) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);


  const handleCreateSchool = () => {
    router.push('/onboarding/create-school');
  };

  const handleJoinSchool = async () => {
    if (!schoolCode.trim()) {
      setError('Veuillez entrer un code d\'école');
      return;
    }
    setLoadingAction(true);
    setError('');

    try {
      const authUser = auth.currentUser;
      if (!authUser) {
        router.push('/auth/login');
        return;
      }

      const schoolsRef = collection(firestore, 'ecoles');
      const q = query(schoolsRef, where('schoolCode', '==', schoolCode.trim().toUpperCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('Aucune école trouvée avec ce code');
        setLoadingAction(false);
        return;
      }

      const schoolDoc = snapshot.docs[0];
      const schoolId = schoolDoc.id;

      const userRef = doc(firestore, 'users', authUser.uid);
      const memberRef = doc(firestore, `ecoles/${schoolId}/personnel`, authUser.uid);
      
      const batch = writeBatch(firestore);

      batch.update(userRef, { schoolId: schoolId, schoolRole: 'staff' });
      
      const memberData: Partial<Staff> = {
        uid: authUser.uid,
        firstName: authUser.displayName?.split(' ')[0] || 'Nouveau',
        lastName: authUser.displayName?.split(' ').slice(1).join(' ') || 'Membre',
        displayName: authUser.displayName,
        email: authUser.email,
        role: 'enseignant', // Rôle par défaut
        hireDate: new Date().toISOString(),
        baseSalary: 0,
        status: 'Actif',
        schoolId: schoolId,
      };
      
      batch.set(memberRef, memberData, { merge: true });

      await batch.commit();

      if (reloadUser) {
        await reloadUser();
      }
      await authUser.getIdToken(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({ title: 'Bienvenue !', description: 'Vous avez rejoint une école.'});
      router.replace('/dashboard');

    } catch (error: any) {
      console.error('Erreur:', error);
      setError(error.message);
      setLoadingAction(false);
    }
  };
  
   if (loading || (user && user.schoolId)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <div className="mx-auto mb-4"><Logo /></div>
          <CardTitle className="text-center">Bienvenue, {user?.displayName || 'Utilisateur'}!</CardTitle>
          <CardDescription className="text-center">
            Vous n'êtes associé à aucune école pour le moment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="create">Créer une école</TabsTrigger>
              <TabsTrigger value="join">Rejoindre une école</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="space-y-4 pt-4 text-center">
              <p className="text-muted-foreground text-sm">
                Vous êtes le premier de votre établissement ? Créez votre école et devenez administrateur.
              </p>
              <Button onClick={handleCreateSchool} className="w-full">
                Commencer la création
              </Button>
            </TabsContent>
            
            <TabsContent value="join" className="space-y-4 pt-4">
              <p className="text-muted-foreground text-sm">
                Rejoignez une école existante avec un code fourni par l'administrateur.
              </p>
              <Input
                placeholder="Code de l'école (ex: ABC-1234)"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                disabled={loadingAction}
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button 
                onClick={handleJoinSchool} 
                className="w-full"
                disabled={loadingAction || !schoolCode.trim()}
              >
                {loadingAction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loadingAction ? 'Recherche...' : 'Rejoindre l\'école'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
