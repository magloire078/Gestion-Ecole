'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    confirmPassword: '',
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({ variant: 'destructive', title: 'Les mots de passe ne correspondent pas' });
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: formData.displayName,
      });

      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: formData.displayName,
        createdAt: new Date().toISOString(),
        schoolId: null,
        schoolRole: null,
      };

      await setDoc(doc(firestore, 'users', user.uid), userData);

      toast({ title: 'Compte créé avec succès !' });
      router.push('/dashboard/onboarding');

    } catch (error: any) {
      console.error('Erreur d\'inscription:', error);
      toast({ variant: 'destructive', title: 'Erreur d\'inscription', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Créer un compte GèreEcole</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="displayName">Nom complet</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Jean Dupont"
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  required
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemple.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                  minLength={6}
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  required
                />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? 'Création...' : 'Créer mon compte'}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm">
            Déjà un compte ?{' '}
            <Button variant="link" className="p-0" asChild>
                <Link href="/auth/login">Se connecter</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
