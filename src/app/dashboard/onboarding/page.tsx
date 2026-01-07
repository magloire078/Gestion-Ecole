
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { doc, setDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { Loader2 } from 'lucide-react';
import type { staff as Staff, user_root } from '@/lib/data-types';

export default function OnboardingPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, loading, reloadUser } = useUser();
  const { toast } = useToast();
  const [loadingAction, setLoadingAction] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');
  const [error, setError] = useState('');

  const handleCreateSchool = () => {
    router.push('/dashboard/onboarding/create-school');
  };

  const handleJoinSchool = async () => {
    if (!schoolCode.trim()) {
      setError('Veuillez entrer un code d\'école');
      return;
    }

    setLoadingAction(true);
    setError('');

    try {
      if (!user || !user.uid) {
        router.push('/login');
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
      
      const batch = writeBatch(firestore);

      const userRootRef = doc(firestore, `utilisateurs/${user.uid}`);
      batch.set(userRootRef, { schoolId: schoolId }, { merge: true });
      
      const nameParts = user.displayName?.split(' ') || ['Utilisateur', 'Inconnu'];
      
      const staffProfileRef = doc(firestore, `ecoles/${schoolId}/personnel`, user.uid);
       const staffProfileData: Omit<Staff, 'id'> = {
            uid: user.uid,
            email: user.email!,
            displayName: user.displayName!,
            photoURL: user.photoURL || '',
            schoolId: schoolId,
            role: 'enseignant', // Rôle par défaut
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(' '),
            hireDate: new Date().toISOString().split('T')[0],
            baseSalary: 0,
            status: 'Actif',
        };
      batch.set(staffProfileRef, staffProfileData);
      
      await batch.commit();
      
      if(reloadUser) await reloadUser();

      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({ title: 'Bienvenue !', description: 'Vous avez rejoint une école.'});
      router.replace('/dashboard');

    } catch (error: any) {
      console.error('Erreur:', error);
      setError(error.message);
      setLoadingAction(false);
    }
  };
  
   if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
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
            
            <TabsContent value="create" className="space-y-4 pt-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Vous êtes le premier de votre établissement ? Créez votre école et devenez administrateur.
              </p>
              <Button onClick={handleCreateSchool} className="w-full">
                Commencer la création
              </Button>
            </TabsContent>
            
            <TabsContent value="join" className="space-y-4 pt-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Rejoignez une école existante avec un code fourni par l'administrateur.
              </p>
              <Input
                placeholder="Code de l'école (ex: ECOLE123)"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                disabled={loadingAction}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button 
                onClick={handleJoinSchool} 
                className="w-full"
                disabled={loadingAction || !schoolCode.trim()}
              >
                {loadingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loadingAction ? 'Recherche...' : 'Rejoindre l\'école'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
