
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getMtnMomoTransactionStatus } from '@/lib/mtn-momo'; 

function PaymentStatusPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const provider = searchParams.get('provider');
    const transactionId = searchParams.get('tid');

    const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending');
    const [message, setMessage] = useState("Veuillez confirmer le paiement sur votre téléphone en composant le code USSD si nécessaire.");

    useEffect(() => {
        if (!provider || !transactionId) {
            setStatus('failed');
            setMessage("Informations de transaction manquantes.");
            return;
        }

        const interval = setInterval(async () => {
            try {
                if (provider === 'mtn') {
                    const result = await getMtnMomoTransactionStatus(transactionId);
                    if (result && result.status === 'SUCCESSFUL') {
                         setStatus('success');
                         setMessage("Votre abonnement a été activé avec succès.");
                         clearInterval(interval);
                         setTimeout(() => {
                            router.push('/dashboard/parametres/abonnement?payment_status=success');
                         }, 3000);
                    } else if (result && (result.status === 'FAILED' || result.status === 'REJECTED')) {
                        setStatus('failed');
                        setMessage(`Le paiement a échoué. Statut : ${result.status}. Raison: ${result.reason}`);
                        clearInterval(interval);
                    }
                }
            } catch (error) {
                console.error("Failed to check transaction status", error);
                setStatus('failed');
                setMessage("Une erreur est survenue lors de la vérification du paiement.");
                clearInterval(interval);
            }
        }, 5000); // Check every 5 seconds

        const timeout = setTimeout(() => {
            if (status === 'pending') {
                clearInterval(interval);
                setStatus('failed');
                setMessage("Le paiement n'a pas été confirmé à temps. Veuillez réessayer.");
            }
        }, 60000 * 2); // Timeout after 2 minutes

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [provider, transactionId, router, status]);

    return (
        <div className="flex items-center justify-center h-full pt-20">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="text-2xl">
                        {status === 'pending' && "En attente de confirmation"}
                        {status === 'success' && "Paiement Réussi"}
                        {status === 'failed' && "Paiement Échoué"}
                    </CardTitle>
                    <CardDescription>
                       {message}
                    </CardDescription>
                </CardHeader>
                <CardContent className="py-10">
                    {status === 'pending' && <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />}
                    {status === 'success' && <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />}
                    {status === 'failed' && <AlertCircle className="h-16 w-16 text-destructive mx-auto" />}
                </CardContent>
                <CardFooter>
                    {status !== 'pending' && (
                        <Button className="w-full" onClick={() => router.push('/dashboard/parametres/abonnement')}>
                            Retour à la page d'abonnement
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}


export default function PaymentPendingPage() {
    return (
        <Suspense fallback={<div>Chargement...</div>}>
            <PaymentStatusPageContent />
        </Suspense>
    )
}
