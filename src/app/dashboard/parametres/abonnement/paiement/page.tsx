
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { getCinetPayPaymentLink } from '@/lib/cinetpay';
import { createStripeCheckoutSession } from '@/lib/stripe';
import { Loader2, AlertCircle, CreditCard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import placeholderImages from '@/lib/placeholder-images.json';
import { Separator } from '@/components/ui/separator';

function PaymentPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const { schoolId, schoolName, loading: schoolLoading } = useSchoolData();

    const [isLoadingProvider, setIsLoadingProvider] = useState<null | 'cinetpay' | 'stripe'>(null);
    const [error, setError] = useState<string | null>(null);

    const plan = searchParams.get('plan');
    const price = searchParams.get('price');
    const description = searchParams.get('description');

    useEffect(() => {
        if (!userLoading && !schoolLoading && (!plan || !price || !description)) {
            setError("Les informations de la transaction sont manquantes. Veuillez retourner à la page d'abonnement et réessayer.");
        }
    }, [plan, price, description, userLoading, schoolLoading]);

    const handleCinetPay = async () => {
        setIsLoadingProvider('cinetpay');
        setError(null);
        if (!plan || !price || !description || !user || !schoolId) return;

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

        const paymentLink = await getCinetPayPaymentLink(paymentData);

        if (paymentLink) {
            window.location.href = paymentLink;
        } else {
            setError("Impossible de générer le lien de paiement CinetPay. Veuillez contacter le support.");
            setIsLoadingProvider(null);
        }
    };
    
    const handleStripe = async () => {
        setIsLoadingProvider('stripe');
        setError(null);
        if (!plan || !price || !description || !user || !schoolId) return;

        // Stripe works with cents, and prefers EUR for CIV
        const priceInCents = Math.round(parseInt(price, 10) / 655.957 * 100);

        const sessionData = {
            priceInCents: priceInCents,
            planName: plan,
            description: description,
            clientReferenceId: schoolId,
            customerEmail: user.email,
        };
        
        const { url, error } = await createStripeCheckoutSession(sessionData);

        if (url) {
            window.location.href = url;
        } else {
            setError(error || "Impossible de générer le lien de paiement Stripe. Veuillez contacter le support.");
            setIsLoadingProvider(null);
        }
    };


    if (userLoading || schoolLoading) {
        return (
             <div className="flex items-center justify-center pt-20">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader> <Skeleton className="h-8 w-3/4 mx-auto" /> <Skeleton className="h-4 w-1/2 mx-auto mt-2" /> </CardHeader>
                    <CardContent className="space-y-4 pt-10 pb-10">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                        <p>Chargement des informations...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
         return (
             <div className="flex items-center justify-center h-[calc(100vh-160px)]">
                <Card className="w-full max-w-md">
                    <CardHeader> <CardTitle>Erreur</CardTitle> <CardDescription>Une erreur est survenue.</CardDescription> </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" /> <AlertTitle>Échec</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    </CardContent>
                    <CardFooter> <Button onClick={() => router.back()} className="w-full">Retour</Button> </CardFooter>
                </Card>
             </div>
         )
    }

    return (
        <div className="flex items-center justify-center h-full pt-10">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Finaliser votre Paiement</CardTitle>
                    <CardDescription>Vous êtes sur le point de souscrire au <strong>Plan {plan}</strong>.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 border rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Montant à Payer</p>
                        <p className="text-3xl font-bold">{parseInt(price || '0').toLocaleString('fr-FR')} CFA</p>
                    </div>

                    <div className="space-y-4">
                        <Button 
                            className="w-full h-16 text-lg" 
                            onClick={handleCinetPay} 
                            disabled={!!isLoadingProvider}
                        >
                            {isLoadingProvider === 'cinetpay' ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                <div className="flex items-center justify-center gap-4">
                                     <Image src={placeholderImages.cinetpayLogo} alt="CinetPay" width={100} height={30} />
                                     <span>(Mobile Money, Wave...)</span>
                                </div>
                            )}
                        </Button>

                         <div className="relative">
                            <Separator />
                            <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-card px-2 text-xs text-muted-foreground">OU</span>
                        </div>

                         <Button 
                            variant="outline" 
                            className="w-full h-16 text-lg"
                            onClick={handleStripe}
                            disabled={!!isLoadingProvider}
                        >
                             {isLoadingProvider === 'stripe' ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                <div className="flex items-center justify-center gap-2">
                                    <CreditCard className="h-6 w-6" />
                                    <span>Payer par Carte Bancaire</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function PaymentPage() {
    return (
        <Suspense fallback={
             <div className="flex items-start justify-center pt-20">
                <Skeleton className="h-96 w-full max-w-lg" />
            </div>
        }>
            <PaymentPageContent />
        </Suspense>
    )
}
