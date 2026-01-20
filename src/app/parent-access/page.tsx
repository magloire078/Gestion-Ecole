
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound, School, Sparkles, CheckCircle, Clock, BookOpen, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import Link from 'next/link';

export default function ParentAccessPage() {
    const [accessCode, setAccessCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();

    const handleLogin = async () => {
        if (!accessCode.trim()) {
            toast({ variant: 'destructive', title: 'Code requis', description: 'Veuillez saisir votre code d\'accès.' });
            return;
        }
        setIsLoading(true);

        try {
            const sessionsRef = collection(firestore, 'sessions_parents');
            const q = query(sessionsRef, where("accessCode", "==", accessCode.trim().toUpperCase()), where('isActive', '==', true));
            const sessionSnap = await getDocs(q);

            if (sessionSnap.empty) {
                toast({ variant: 'destructive', title: 'Code invalide ou expiré', description: 'Veuillez vérifier votre code et réessayer.' });
                setIsLoading(false);
                return;
            }

            const sessionDoc = sessionSnap.docs[0];
            const sessionData = sessionDoc.data();
            
            // Note: In a real-world scenario, you might want to adjust the expiration check to use server time if possible.
            // For this client-side check, it's generally sufficient.
            if (new Date(sessionData.expiresAt.toDate()) < new Date()) {
                toast({ variant: 'destructive', title: 'Code expiré', description: 'Ce code d\'accès a expiré.' });
                await updateDoc(doc(firestore, 'sessions_parents', sessionDoc.id), { isActive: false });
                setIsLoading(false);
                return;
            }

            await updateDoc(doc(firestore, 'sessions_parents', sessionDoc.id), { isActive: false });
            
            localStorage.setItem('parent_session_id', sessionDoc.id);
            localStorage.setItem('parent_school_id', sessionData.schoolId);
            localStorage.setItem('parent_student_ids', JSON.stringify(sessionData.studentIds));

            toast({ title: 'Accès autorisé', description: 'Redirection vers votre portail...' });
            
            router.push('/dashboard');

        } catch (error) {
            console.error("Erreur de connexion parent:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue lors de la connexion.' });
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row">
            {/* Côté gauche - Illustration */}
            <div className="lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden text-white">
                <div className="absolute inset-0 bg-primary/10 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
                
                <div className="relative z-10">
                    <Link href="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors">
                        <School className="h-6 w-6" />
                        <span className="text-lg font-semibold">GèreEcole</span>
                    </Link>
                    
                    <div className="mt-16 lg:mt-24 max-w-lg">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="h-5 w-5 text-white/80" />
                            <span className="text-sm font-medium text-white/80">VOTRE ESPACE DÉDIÉ</span>
                        </div>
                        
                        <h1 className="text-4xl lg:text-5xl font-bold mb-6">
                            Suivez la réussite scolaire
                            <span className="block text-white/90 mt-2">de votre enfant</span>
                        </h1>
                        
                        <p className="text-lg text-white/80 mb-8">
                            Le portail parents vous donne un accès direct aux informations essentielles concernant la vie scolaire de vos enfants.
                        </p>
                        
                        <div className="space-y-4">
                            {[
                                { icon: BookOpen, text: "Consultez les notes et résultats" },
                                { icon: Clock, text: "Suivez les absences et retards" },
                                { icon: Wallet, text: "Gérez les paiements de scolarité" },
                                { icon: CheckCircle, text: "Recevez les annonces de l'école" }
                            ].map((feature, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <feature.icon className="h-5 w-5 text-white/80" />
                                    <span className="text-white/90">{feature.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Côté droit - Formulaire */}
            <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-background">
                <Card className="w-full max-w-sm shadow-none border-none lg:border lg:shadow-sm">
                    <CardHeader className="text-center">
                        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-4 mx-auto">
                            <KeyRound className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight">Portail Parents</CardTitle>
                        <CardDescription>
                            Entrez le code d'accès qui vous a été fourni par l'établissement.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="access-code" className="sr-only">Code d'Accès</Label>
                            <Input
                                id="access-code"
                                placeholder="ABC-123"
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                                disabled={isLoading}
                                onKeyUp={(e) => e.key === 'Enter' && handleLogin()}
                                className="h-14 uppercase tracking-widest text-center font-mono text-lg"
                                autoComplete="one-time-code"
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full h-12 text-base" onClick={handleLogin} disabled={isLoading || !accessCode.trim()}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                    Vérification...
                                </>
                            ) : (
                                'Accéder au portail'
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
