
'use client';

import { useUser } from '@/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ShieldAlert, Loader2 } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import Link from 'next/link';
import { useState, useEffect, FormEvent } from 'react';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


function AdminPasswordGate({ onVerified }: { onVerified: () => void }) {
    const { user } = useUser();
    const { toast } = useToast();
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!user?.authUser?.email) {
            setError("Impossible de vérifier l'utilisateur. E-mail non trouvé.");
            setIsLoading(false);
            return;
        }

        try {
            const credential = EmailAuthProvider.credential(user.authUser.email, password);
            await reauthenticateWithCredential(user.authUser, credential);
            toast({ title: 'Accès autorisé', description: "Identité vérifiée avec succès." });
            onVerified();
        } catch (authError: any) {
            console.error("Re-authentication failed", authError);
            setError("Mot de passe incorrect. Veuillez réessayer.");
            toast({
                variant: "destructive",
                title: "Accès refusé",
                description: "Le mot de passe fourni est incorrect.",
            });
        } finally {
            setIsLoading(false);
            setPassword('');
        }
    };

    return (
        <Dialog open={true} >
            <DialogContent className="sm:max-w-md" hideCloseButton onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-primary" />
                        Vérification Requise
                    </DialogTitle>
                    <DialogDescription>
                        Pour accéder à la section d&apos;administration, veuillez confirmer votre mot de passe.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="password">Mot de Passe</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoFocus
                            />
                            {error && <p className="text-sm text-destructive">{error}</p>}
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-between gap-2">
                        <Button type="button" variant="outline" asChild>
                            <Link href="/dashboard">Quitter</Link>
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmer et Entrer
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


function AdminLayoutContent({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading: userLoading } = useUser();
    const [isVerified, setIsVerified] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    // Check session storage on initial load, only on the client
    useEffect(() => {
        try {
            const verificationTimestamp = sessionStorage.getItem('adminVerificationTimestamp');
            if (verificationTimestamp) {
                const lastVerified = parseInt(verificationTimestamp, 10);
                const now = new Date().getTime();
                // Session valid for 15 minutes
                if (now - lastVerified < 15 * 60 * 1000) {
                    setIsVerified(true);
                } else {
                    sessionStorage.removeItem('adminVerificationTimestamp');
                }
            }
        } catch (e) {
            console.error("Could not access session storage:", e);
        } finally {
            setIsCheckingSession(false);
        }
    }, []);

    const handleVerification = () => {
        try {
            sessionStorage.setItem('adminVerificationTimestamp', new Date().getTime().toString());
            setIsVerified(true);
        } catch (e) {
            console.error("Could not access session storage:", e);
            // If session storage is not available, just allow for the current session in memory
            setIsVerified(true);
        }
    };

    if (userLoading || isCheckingSession) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    // This part will eventually check for a super admin role in the user profile.
    if (!user?.profile?.isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-muted text-center p-8">
                <Card className="max-w-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">
                            <Lock className="h-6 w-6 text-destructive" />
                            Accès Restreint
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Vous n&apos;avez pas les permissions nécessaires pour accéder à cette section. Elle est réservée aux super-administrateurs de la plateforme.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full">
                            <Link href="/dashboard">
                                Retour au Tableau de Bord
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Détecter le provider d'authentification
    const authProvider = user?.authUser?.providerData?.[0]?.providerId;
    const requiresPasswordReauth = authProvider === 'password';

    // Pour les utilisateurs Google, marquer comme vérifié automatiquement
    if (!isVerified && authProvider === 'google.com') {
        handleVerification();
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    // Pour les utilisateurs email/password, demander la réauthentification
    if (!isVerified && requiresPasswordReauth) {
        return <AdminPasswordGate onVerified={handleVerification} />;
    }

    return <>{children}</>;
}


export default function RootAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <AdminLayoutContent>
                {children}
            </AdminLayoutContent>
        </AuthGuard>
    )
}
