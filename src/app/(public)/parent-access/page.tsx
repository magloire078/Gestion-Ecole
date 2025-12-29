
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

export default function ParentAccessPage() {
    const [accessCode, setAccessCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const auth = getAuth();
    const firestore = useFirestore();

    const handleLogin = async () => {
        if (!accessCode.trim()) {
            toast({ variant: 'destructive', title: 'Code requis', description: 'Veuillez saisir votre code d\'accès.' });
            return;
        }
        setIsLoading(true);

        try {
            // Dans une application de production, vous appelleriez une fonction Cloud
            // qui valide le code et génère un token personnalisé.
            // Ex: const response = await fetch('/api/parent-login', { body: { accessCode } });
            // const { customToken } = await response.json();
            // await signInWithCustomToken(auth, customToken);

            // --- Simulation pour le prototypage ---
            const sessionsRef = collection(firestore, 'sessions_parents');
            const q = query(sessionsRef, where('accessCode', '==', accessCode.trim()), where('isActive', '==', true));
            const sessionSnap = await getDocs(q);

            if (sessionSnap.empty) {
                toast({ variant: 'destructive', title: 'Code invalide ou expiré', description: 'Veuillez vérifier votre code et réessayer.' });
                setIsLoading(false);
                return;
            }

            const sessionDoc = sessionSnap.docs[0];
            const sessionData = sessionDoc.data();
            
            if (new Date(sessionData.expiresAt.toDate()) < new Date()) {
                toast({ variant: 'destructive', title: 'Code expiré', description: 'Ce code d\'accès a expiré.' });
                setIsLoading(false);
                return;
            }

            // Invalider le code d'accès après usage
            await updateDoc(doc(firestore, 'sessions_parents', sessionDoc.id), { isActive: false });

            // Pour simuler la connexion et la persistance, nous utilisons localStorage.
            // La sécurité réelle est gérée par les règles Firestore qui liraient le custom token.
            localStorage.setItem('parent_session_id', sessionDoc.id);
            localStorage.setItem('parent_school_id', sessionData.schoolId);
            localStorage.setItem('parent_student_ids', JSON.stringify(sessionData.studentIds));
            
            toast({ title: 'Accès autorisé', description: 'Redirection vers votre portail...' });
            
            // Recharger la page pour que useUser détecte la session parent
            window.location.href = '/dashboard';

        } catch (error) {
            console.error("Erreur de connexion parent:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue lors de la connexion.' });
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <div className="mb-4 flex justify-center">
                        <Logo />
                    </div>
                    <CardTitle className="text-2xl">Portail Parents</CardTitle>
                    <CardDescription>
                        Entrez le code d'accès qui vous a été fourni par l'établissement.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="access-code">Code d'Accès</Label>
                        <Input
                            id="access-code"
                            placeholder="ABC-123"
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            disabled={isLoading}
                            onKeyUp={(e) => e.key === 'Enter' && handleLogin()}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
                        {isLoading ? 'Vérification...' : 'Accéder au portail'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
