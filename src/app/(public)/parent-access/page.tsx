
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
import { doc, getDoc } from 'firebase/firestore';
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
            // In a real app, you would call a serverless function here
            // to exchange the access code for a custom Firebase auth token.
            // For this prototype, we'll simulate this flow.
            
            // 1. Find the session document using the access code (This is insecure client-side)
            // This logic should be on a serverless function.
            // const sessionQuery = query(collection(firestore, 'sessions_parents'), where('accessCode', '==', accessCode));
            // const sessionSnap = await getDocs(sessionQuery);

            // SIMULATION: We'll assume the access code is the session ID for now.
            const sessionId = accessCode.trim();
            const sessionRef = doc(firestore, 'sessions_parents', sessionId);
            const sessionSnap = await getDoc(sessionRef);

            if (!sessionSnap.exists() || new Date(sessionSnap.data().expiresAt.toDate()) < new Date()) {
                toast({ variant: 'destructive', title: 'Code invalide ou expiré', description: 'Veuillez vérifier votre code et réessayer.' });
                setIsLoading(false);
                return;
            }
            
            // 2. Simulate getting a custom token from a backend
            // In a real app: const response = await fetch('/api/create-parent-token', { body: {sessionId} })
            // For now, we will just redirect, as we don't have a secure backend to generate tokens.
            // The firestore rules will handle authorization based on this simulated session.
            
            toast({ title: 'Accès autorisé', description: 'Redirection vers votre portail...' });
            
            // We would use signInWithCustomToken(auth, customToken) here.
            // For now, we'll just navigate. The rules assume a token is present.
            // This will require પોલીસrules changes to work without real auth.
            
            // Let's store session info in localStorage for the prototype to work
            localStorage.setItem('parent_session_id', sessionId);
            localStorage.setItem('parent_school_id', sessionSnap.data().schoolId);
            localStorage.setItem('parent_student_ids', JSON.stringify(sessionSnap.data().studentIds));
            
            router.push('/dashboard');

        } catch (error) {
            console.error("Parent login error:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue lors de la connexion.' });
        } finally {
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
