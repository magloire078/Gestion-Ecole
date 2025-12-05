'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { useEffect, useState } from 'react';
import { getCinetPayPaymentLink } from '@/lib/cinetpay';
import { Loader2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';


function PaymentPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const { schoolId, schoolName, loading: schoolLoading } = useSchoolData();

    const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const plan = searchParams.get('plan');
    const price = searchParams.get('price');
    const description = searchParams.get('description');

    useEffect(() => {
        if (userLoading || schoolLoading) return;

        if (!plan || !price || !description || !user || !schoolId) {
            setErrorMessage("Les informations de la transaction sont incomplètes. Veuillez réessayer.");
            setStatus('error');
            return;
        }

        const handlePayment = async () => {
            const transactionId = `${schoolId}_${new Date().getTime()}`;
            const [firstName, ...lastNameParts] = user.displayName?.split(' ') || ['Utilisateur', 'Anonyme'];
            const lastName = lastNameParts.join(' ');
            
            const paymentData = {
                amount: parseInt(price, 10),
                currency: 'XOF',
                transaction_id: transactionId,
                description: description,
                customer_name: firstName,
                customer_surname: lastName,
                customer_email: user.email || 'no-email@example.com',
            };

            setStatus('redirecting');

            const paymentLink = await getCinetPayPaymentLink(paymentData);

            if (paymentLink) {
                // Rediriger vers la page de paiement CinetPay
                window.location.href = paymentLink;
            } else {
                setErrorMessage("Impossible de générer le lien de paiement. Veuillez contacter le support.");
                setStatus('error');
            }
        };

        handlePayment();

    }, [plan, price, description, user, schoolId, userLoading, schoolLoading]);


    if (status === 'loading') {
        return (
            <Card className="w-full max-w-md">
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </CardContent>
            </Card>
        );
    }
    
    if (status === 'error') {
         return (
             <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Erreur de Paiement</CardTitle>
                        <CardDescription>Une erreur est survenue.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Échec de la transaction</AlertTitle>
                            <AlertDescription>
                                {errorMessage || "Une erreur inconnue est survenue."}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={() => router.back()} className="w-full">Retour</Button>
                    </CardFooter>
                </Card>
             </div>
         )
    }

    return (
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Redirection vers le paiement</CardTitle>
                    <CardDescription>Veuillez patienter pendant que nous vous redirigeons vers notre partenaire de paiement sécurisé.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center space-y-4 p-10">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Préparation de votre transaction...</p>
                    <div className="text-center text-sm">
                        <p><strong>Plan:</strong> {plan}</p>
                        <p><strong>Montant:</strong> {parseInt(price || '0').toLocaleString('fr-FR')} CFA</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function PaymentPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
                <Skeleton className="h-96 w-full max-w-md" />
            </div>
        }>
            <PaymentPageContent />
        </Suspense>
    )
}
