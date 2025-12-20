
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
// This function would be in a service file to check the status from your backend
// For now, we'll just simulate it.
// import { checkMtnMomoTransactionStatus } from '@/services/payment-service'; 

function PaymentStatusPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const provider = searchParams.get('provider');
    const transactionId = searchParams.get('tid');

    const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending');

    useEffect(() => {
        if (!provider || !transactionId) {
            setStatus('failed');
            return;
        }

        const interval = setInterval(async () => {
            try {
                // In a real app, you would call your backend here to check the status
                // const result = await checkMtnMomoTransactionStatus(transactionId);
                // For this example, we'll simulate a success after a few seconds.
                console.log("Checking status for", transactionId);

                // MOCK LOGIC
                if (Math.random() > 0.3) { // Simulate success
                    setStatus('success');
                    clearInterval(interval);
                    setTimeout(() => {
                        router.push('/dashboard/parametres/abonnement?payment_status=success');
                    }, 3000);
                }
                
            } catch (error) {
                console.error("Failed to check transaction status", error);
                setStatus('failed');
                clearInterval(interval);
            }
        }, 5000); // Check every 5 seconds

        const timeout = setTimeout(() => {
            if (status === 'pending') {
                clearInterval(interval);
                setStatus('failed');
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
                        {status === 'pending' && "Veuillez confirmer le paiement sur votre téléphone."}
                        {status === 'success' && "Votre abonnement a été activé avec succès."}
                        {status === 'failed' && "Le paiement n'a pas pu être confirmé. Veuillez réessayer."}
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
