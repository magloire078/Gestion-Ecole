
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { createCheckoutLink } from '@/services/payment-service';
import { Loader2, AlertCircle, CreditCard, Smartphone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

function PaymentPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const { schoolId, schoolName, loading: schoolLoading } = useSchoolData();

    const [isLoadingProvider, setIsLoadingProvider] = useState<null | 'orangemoney' | 'stripe' | 'wave'>(null);
    const [error, setError] = useState<string | null>(null);

    const plan = searchParams.get('plan');
    const price = searchParams.get('price');
    const description = searchParams.get('description');

    useEffect(() => {
        if (!userLoading && !schoolLoading && (!plan || !price || !description)) {
            setTimeout(() => {
                if (!searchParams.get('plan') || !searchParams.get('price') || !searchParams.get('description')) {
                    setError("Les informations de la transaction sont manquantes. Veuillez retourner à la page d'abonnement et réessayer.");
                }
            }, 500);
        }
    }, [plan, price, description, userLoading, schoolLoading, searchParams]);

    const handlePayment = async (provider: 'orangemoney' | 'stripe' | 'wave') => {
        setIsLoadingProvider(provider);
        setError(null);

        if (!plan || !price || !description || !user || !schoolId) {
            setError("Impossible de lancer le paiement. Données manquantes.");
            setIsLoadingProvider(null);
            return;
        }

        const { url, error: serviceError } = await createCheckoutLink(provider, {
            plan,
            price,
            description,
            user: user.authUser,
            schoolId,
        });

        if (url) {
            window.location.href = url;
        } else {
            setError(serviceError);
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
                            className="w-full h-16 text-lg bg-[#01a79e] hover:bg-[#01a79e]/90 text-white" 
                            onClick={() => handlePayment('wave')}
                            disabled={!!isLoadingProvider}
                        >
                            {isLoadingProvider === 'wave' ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                <div className="flex items-center justify-center gap-4">
                                     <svg className="h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.14 11.258c-.377-.384-.814-.58-1.306-.583-.493 0-.93.199-1.306.583-.377.384-.57.828-.57 1.32v.568c0 .49.193.935.57 1.319.375.384.813.583 1.306.583.492 0 .929-.199 1.306-.583.376-.384.57-.828.57-1.32v-.568c0-.49-.194-.935-.57-1.319zm-3.411 0c-.377-.384-.814-.58-1.306-.583-.493 0-.93.199-1.306.583-.377.384-.57.828-.57 1.32v.568c0 .49.193.935.57 1.319.375.384.813.583 1.306.583.492 0 .929-.199 1.306-.583.376-.384.57-.828.57-1.32v-.568c0-.49-.194-.935-.57-1.319z" fill="#fff"></path><path d="M23.36 12c0 2.235-.503 4.288-1.503 6.135-1.002 1.848-2.45 3.39-4.28 4.545-1.833 1.154-3.95 1.74-6.264 1.74-2.235 0-4.288-.503-6.135-1.503-1.848-1.002-3.39-2.45-4.545-4.28-1.154-1.833-1.74-3.95-1.74-6.264C.64 6.63 4.27 1.487 9.873.742A12.011 12.011 0 0112 .64c2.235 0 4.288.503 6.135 1.503 1.848 1.002 3.39 2.45 4.545 4.28 1.154 1.833 1.74 3.95 1.74 6.264l-.06.675zm-6.25 1.888v-.568c0-1.12-.45-2.096-1.22-2.825-.768-.73-1.768-1.117-2.834-1.117-1.066 0-2.066.387-2.834 1.117-.77.73-1.22 1.706-1.22 2.825v.568c0 1.12.45 2.096 1.22 2.825.768.73 1.768 1.117 2.834 1.117 1.066 0 2.066-.387 2.834-1.117.77-.73 1.22-1.706 1.22-2.825zm-6.821 0v-.568c0-1.12-.45-2.096-1.22-2.825-.768-.73-1.768-1.117-2.834-1.117S4.85 9.44 4.08 10.17c-.77.73-1.22 1.706-1.22 2.825v.568c0 1.12.45 2.096 1.22 2.825.768.73 1.768 1.117 2.834 1.117s2.066-.387 2.834-1.117c.77-.73 1.22-1.706 1.22-2.825z" fill="#fff"></path></svg>
                                     <span>Payer avec Wave</span>
                                </div>
                            )}
                        </Button>
                        <Button 
                            className="w-full h-16 text-lg" 
                            onClick={() => handlePayment('orangemoney')}
                            disabled={!!isLoadingProvider}
                        >
                            {isLoadingProvider === 'orangemoney' ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                <div className="flex items-center justify-center gap-4">
                                     <Smartphone className="h-6 w-6" />
                                     <span>Payer avec Orange Money</span>
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
                            onClick={() => handlePayment('stripe')}
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
