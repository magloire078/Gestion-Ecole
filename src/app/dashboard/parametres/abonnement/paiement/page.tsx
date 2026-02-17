
'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { createCheckoutLink } from '@/services/payment-service';
import { Loader2, AlertCircle, CreditCard, Smartphone, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSubscription } from '@/hooks/use-subscription';
import { addMonths } from 'date-fns';
import { doc } from 'firebase/firestore';

function PaymentPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const { schoolId, schoolName, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();
    const { updateSubscription } = useSubscription();

    const settingsRef = useMemo(() => doc(firestore, 'system_settings/default'), [firestore]);
    const { data: settingsData, loading: settingsLoading } = useDoc(settingsRef);

    const [isLoadingProvider, setIsLoadingProvider] = useState<null | 'orangemoney' | 'stripe' | 'wave' | 'mtn' | 'paydunya' | 'genius' | 'free'>(null);
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

    const handleFreeUpgrade = async () => {
        if (!plan) return;
        setIsLoadingProvider('free');
        try {
            const endDate = addMonths(new Date(), selectedDuration).toISOString();
            await updateSubscription({
                plan: plan as any,
                status: 'active',
                endDate,
            });
            router.push('/dashboard/parametres/abonnement/paiement-en-attente?payment_status=success');
        } catch (e) {
            console.error(e);
            setError("Erreur lors de l'activation de l'abonnement gratuit.");
            setIsLoadingProvider(null);
        }
    };

    const handlePayment = async (provider: 'orangemoney' | 'stripe' | 'wave' | 'mtn' | 'paydunya' | 'genius') => {
        setIsLoadingProvider(provider);
        setError(null);

        if (!plan || !totalPrice || !description || !user?.authUser || !schoolId) {
            setError("Impossible de lancer le paiement. Données manquantes ou utilisateur non authentifié.");
            setIsLoadingProvider(null);
            return;
        }

        const { url, error: serviceError } = await createCheckoutLink(provider, {
            type: 'subscription',
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

                    {totalPrice === 0 ? (
                        <Button
                            className="w-full h-16 text-lg bg-primary hover:bg-primary/90 text-white"
                            onClick={handleFreeUpgrade}
                            disabled={!!isLoadingProvider}
                        >
                            {isLoadingProvider === 'free' ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                <div className="flex items-center justify-center gap-4">
                                    <CheckCircle className="h-6 w-6" />
                                    <span>Confirmer l'abonnement (Gratuit)</span>
                                </div>
                            )}
                        </Button>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-4 bg-muted/30 rounded-lg space-y-2 border">
                                <p className="text-sm font-medium">💡 Comment ça marche ?</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    En cliquant sur le bouton de paiement, vous serez redirigé vers l&apos;interface sécurisée de <strong>Genius Pay</strong>.
                                    C&apos;est sur leur plateforme que vous saisirez vos informations de paiement (Orange Money, Wave, MTN ou Carte Bancaire) en toute sécurité.
                                    GéreEcole ne stocke aucune de vos coordonnées bancaires.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {/* Seul Genius Pay est activé pour le moment */}
                                <Button
                                    className="w-full h-16 text-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg transition-all hover:scale-[1.01]"
                                    onClick={() => handlePayment('genius')}
                                    disabled={!!isLoadingProvider}
                                >
                                    {isLoadingProvider === 'genius' ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                        <div className="flex items-center justify-center gap-4">
                                            <Image src="/custom-assets/genius-pay-logo.png" alt="Genius Pay" width={30} height={30} className="rounded-sm" />
                                            <div className="text-left">
                                                <div className="font-bold">Payer avec Genius Pay</div>
                                                <div className="text-[10px] opacity-80 uppercase tracking-wider font-medium">Recommandé (Wave, Orange, MTN, Visa)</div>
                                            </div>
                                        </div>
                                    )}
                                </Button>

                                <div className="relative my-6">
                                    <Separator />
                                    <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-2 text-[10px] text-muted-foreground font-semibold uppercase">Autres options bientôt disponibles</span>
                                </div>

                                <Button
                                    variant="outline"
                                    className="w-full h-14 text-sm opacity-50 grayscale cursor-not-allowed"
                                    disabled
                                >
                                    <CreditCard className="mr-2 h-5 w-5" />
                                    Paiement par Carte Direct (Stripe)
                                </Button>
                            </div>
                        </div>
                    )}
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

