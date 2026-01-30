
'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { createCheckoutLink } from '@/services/payment-service';
import { Loader2, AlertCircle, CreditCard, Smartphone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { doc } from 'firebase/firestore';

function PaymentPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const { schoolId, schoolName, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();

    const settingsRef = useMemo(() => doc(firestore, 'system_settings/default'), [firestore]);
    const { data: settingsData, loading: settingsLoading } = useDoc(settingsRef);

    const [isLoadingProvider, setIsLoadingProvider] = useState<null | 'orangemoney' | 'stripe' | 'wave' | 'mtn' | 'paydunya'>(null);
    const [error, setError] = useState<string | null>(null);
    const [mtnPhoneNumber, setMtnPhoneNumber] = useState('');
    const [selectedDuration, setSelectedDuration] = useState(1); // 1 mois par défaut
    const [totalPrice, setTotalPrice] = useState<number>(0);


    const plan = searchParams.get('plan');
    const price = searchParams.get('price');
    const description = searchParams.get('description');
    
    useEffect(() => {
        const basePrice = parseInt(price || '0', 10);
        setTotalPrice(basePrice * selectedDuration);
    }, [price, selectedDuration]);

    useEffect(() => {
        if (!userLoading && !schoolLoading && (!plan || !price || !description)) {
            setTimeout(() => {
                if (!searchParams.get('plan') || !searchParams.get('price') || !searchParams.get('description')) {
                    setError("Les informations de la transaction sont manquantes. Veuillez retourner à la page d'abonnement et réessayer.");
                }
            }, 500);
        }
    }, [plan, price, description, userLoading, schoolLoading, searchParams]);

    const handlePayment = async (provider: 'orangemoney' | 'stripe' | 'wave' | 'mtn' | 'paydunya') => {
        setIsLoadingProvider(provider);
        setError(null);

        if (!plan || !totalPrice || !description || !user || !schoolId) {
            setError("Impossible de lancer le paiement. Données manquantes.");
            setIsLoadingProvider(null);
            return;
        }

        const { url, error: serviceError } = await createCheckoutLink(provider, {
            plan,
            price: totalPrice.toString(),
            description: `${description} (${selectedDuration} mois)`,
            user: user.authUser,
            schoolId,
            phoneNumber: provider === 'mtn' ? mtnPhoneNumber : undefined,
            duration: selectedDuration, // Durée en mois
        });

        if (url) {
            window.location.href = url;
        } else {
            setError(serviceError);
            setIsLoadingProvider(null);
        }
    };


    const isLoading = userLoading || schoolLoading || settingsLoading;

    if (isLoading) {
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
                    <div className="p-4 border rounded-lg text-center space-y-4">
                        <div>
                             <Label>Durée de l'abonnement</Label>
                             <Select value={String(selectedDuration)} onValueChange={(v) => setSelectedDuration(parseInt(v, 10))}>
                                <SelectTrigger className="w-[180px] mx-auto mt-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 Mois</SelectItem>
                                    <SelectItem value="3">3 Mois</SelectItem>
                                    <SelectItem value="12">12 Mois</SelectItem>
                                </SelectContent>
                             </Select>
                        </div>
                         <div>
                            <p className="text-sm text-muted-foreground">Montant Total à Payer</p>
                            <p className="text-3xl font-bold">{totalPrice.toLocaleString('fr-FR')} CFA</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {settingsData?.paymentProviders?.wave && (
                            <Button 
                                className="w-full h-16 text-lg bg-[#01a79e] hover:bg-[#01a79e]/90 text-white" 
                                onClick={() => handlePayment('wave')}
                                disabled={!!isLoadingProvider}
                            >
                                {isLoadingProvider === 'wave' ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                    <div className="flex items-center justify-center gap-4">
                                         <svg className="h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.14 11.258c-.377-.384-.814-.58-1.306-.583-.493 0-.93.199-1.306.583-.377.384-.57.828-.57 1.32v.568c0 .49.193.935.57 1.319.375.384.813.583 1.306.583.492 0 .929-.199 1.306-.583.376-.384.57-.828.57-1.32v-.568c0-.49-.194-.935-.57-1.319zm-3.411 0c-.377-.384-.814-.58-1.306-.583-.493 0-.93.199-1.306.583-.377.384-.57.828-.57 1.32v.568c0 .49.193.935.57 1.319.375.384.813.583 1.306.583.492 0 .929-.199 1.306-.583.376-.384.57-.828.57-1.32v-.568c0-.49-.194-.935-.57-1.319z" fill="#fff"></path><path d="M23.36 12c0 2.235-.503 4.288-1.503 6.135-1.002 1.848-2.45 3.39-4.28 4.545-1.833 1.154-3.95 1.74-6.264 1.74-2.235 0-4.288-.503-6.135-1.503-1.848-1.002-3.39-2.45-4.545-4.28-1.154-1.833-1.74-3.95-1.74-6.264C.64 6.63 4.27 1.487 9.873.742A12.011 12.011 0 0112 .64c2.235 0 4.288.503 6.135 1.503 1.848 1.002 3.39 2.45 4.545 4.28 1.154 1.833 1.74 3.95 1.74 6.264l-.06.675zm-6.25 1.888v-.568c0-1.12-.45-2.096-1.22-2.825-.768-.73-1.768-1.117-2.834-1.117-1.066 0-2.066.387-2.834 1.117-.77.73-1.22 1.706-1.22 2.825v.568c0 1.12.45 2.096 1.22 2.825.768.73 1.768 1.117 2.834 1.117s2.066-.387 2.834-1.117c.77-.73 1.22-1.706 1.22-2.825zm-6.821 0v-.568c0-1.12-.45-2.096-1.22-2.825-.768-.73-1.768-1.117-2.834-1.117S4.85 9.44 4.08 10.17c-.77.73-1.22 1.706-1.22 2.825v.568c0 1.12.45 2.096 1.22 2.825.768.73 1.768 1.117 2.834 1.117s2.066-.387 2.834-1.117c.77-.73 1.22-1.706 1.22-2.825z" fill="#fff"></path></svg>
                                         <span>Payer avec Wave</span>
                                    </div>
                                )}
                            </Button>
                        )}
                        {settingsData?.paymentProviders?.orangeMoney && (
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
                        )}
                        
                        {settingsData?.paymentProviders?.paydunya && (
                            <Button 
                                className="w-full h-16 text-lg bg-blue-600 hover:bg-blue-700 text-white" 
                                onClick={() => handlePayment('paydunya')}
                                disabled={!!isLoadingProvider}
                            >
                                {isLoadingProvider === 'paydunya' ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="h-6" viewBox="0 0 114 29" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.44 28.52V0h6.64c2.28 0 4.16.293 5.64 1.04 1.48.627 2.627 1.6 3.44 2.92.813 1.32.96 2.853.96 4.6 0 1.28-.213 2.494-.64 3.64-.427 1.027-.973 1.947-1.64 2.76-1.147 1.28-2.653 2.227-4.52 2.84l5.92 10.72h-7.88L16.2 18.28h-3.76v10.24h-6.4zm6.16-16.12c1.333 0 2.373-.427 3.12-1.28.747-.853 1.12-2.027 1.12-3.52 0-1.6-.373-2.813-1.12-3.64-.747-.827-1.787-1.24-3.12-1.24h-2.4v9.68h2.4zM32.89 28.52V0h6.4v28.52h-6.4zM53.13 28.52V0h6.4v22.28h9.8v6.24h-16.2zM75.69 13.12c0-2.347.52-4.307 1.56-5.88.919-1.573 2.2-2.787 3.84-3.64 1.64-.853 3.48-1.28 5.52-1.28 2.04 0 3.867.427 5.48 1.28 1.613.853 2.893 2.067 3.84 3.64s1.42 3.533 1.42 5.88c0 2.347-.473 4.307-1.42 5.88-.947 1.573-2.227 2.787-3.84 3.64-1.613.853-3.44 1.28-5.48 1.28-2.04 0-3.88-.427-5.52-1.28-1.64-.853-2.92-2.067-3.84-3.64-1.04-1.573-1.56-3.533-1.56-5.88zm6.24 0c0 1.6.36 2.867 1.08 3.8-1.094 1.28-2.507 1.947-4.24 2-1.733.053-3.253-.4-4.56-1.36-1.307-.96-2.227-2.28-2.76-3.96-.533-1.68-.8-3.573-.8-5.68 0-2.107.267-3.987.8-5.64s1.453-2.987 2.76-3.92c1.307-.933 2.827-1.4 4.56-1.4 1.733 0 3.147.667 4.24 2 .72.933 1.08 2.2 1.08 3.8zm11.72 15.4V0h16.2v6.24h-9.8v3.6h9.08v6.24h-9.08v6.2h9.8v6.24h-16.2z" fill="#fff"></path></svg>
                                        <span>Payer avec PayDunya</span>
                                    </div>
                                )}
                            </Button>
                        )}

                         <div className="relative my-4">
                            <Separator />
                            <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-card px-2 text-xs text-muted-foreground">OU</span>
                        </div>

                        {settingsData?.paymentProviders?.mtn && (
                            <div className="space-y-2 pt-2">
                                 <Label htmlFor="mtn-phone">Numéro de téléphone MTN</Label>
                                 <div className="flex gap-2">
                                    <Input id="mtn-phone" placeholder="05xxxxxxxx" value={mtnPhoneNumber} onChange={(e) => setMtnPhoneNumber(e.target.value)} />
                                    <Button 
                                        className="bg-amber-400 hover:bg-amber-500 text-black"
                                        onClick={() => handlePayment('mtn')}
                                        disabled={!!isLoadingProvider || !mtnPhoneNumber}
                                    >
                                        {isLoadingProvider === 'mtn' ? <Loader2 className="h-5 w-5 animate-spin" /> : "Payer via MTN"}
                                    </Button>
                                 </div>
                            </div>
                        )}

                        {settingsData?.paymentProviders?.stripe && (
                            <>
                             <div className="relative my-4">
                                <Separator />
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
                           </>
                        )}
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
