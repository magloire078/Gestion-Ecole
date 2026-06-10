'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { createCheckoutLink } from '@/services/payment-service';
import {
    Loader2, AlertCircle, CreditCard, Smartphone, CheckCircle, ShieldCheck,
    Sparkles, ChevronLeft, Lock,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/currency-utils';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSubscription } from '@/hooks/use-subscription';
import { addMonths } from 'date-fns';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

type Provider = 'orangemoney' | 'stripe' | 'wave' | 'mtn' | 'paydunya' | 'genius';

interface ProviderOption {
    id: Provider;
    name: string;
    description: string;
    logo?: string;
    icon?: typeof CreditCard;
    accent: string;
    category: 'aggregator' | 'card' | 'mobile';
    recommended?: boolean;
    requiresPhone?: boolean;
}

const PROVIDERS: ProviderOption[] = [
    {
        id: 'paydunya',
        name: 'PayDunya',
        description: 'Wave, Orange Money, MTN MoMo et cartes via un seul point d’entrée.',
        logo: '/custom-assets/paydunya-logo.png',
        accent: 'from-emerald-500 to-teal-600',
        category: 'aggregator',
        recommended: true,
    },
    {
        id: 'genius',
        name: 'Genius Pay',
        description: 'Agrégateur ivoirien (Mobile Money + cartes).',
        icon: Sparkles,
        accent: 'from-amber-500 to-orange-500',
        category: 'aggregator',
    },
    {
        id: 'stripe',
        name: 'Stripe',
        description: 'Cartes bancaires internationales (Visa, Mastercard, Amex).',
        logo: '/custom-assets/stripe-logo.png',
        accent: 'from-indigo-500 to-violet-600',
        category: 'card',
    },
    {
        id: 'wave',
        name: 'Wave',
        description: 'Paiement direct via Wave (XOF).',
        icon: Smartphone,
        accent: 'from-sky-400 to-blue-500',
        category: 'mobile',
    },
    {
        id: 'orangemoney',
        name: 'Orange Money',
        description: 'Paiement direct depuis votre compte Orange Money.',
        icon: Smartphone,
        accent: 'from-orange-500 to-red-500',
        category: 'mobile',
    },
    {
        id: 'mtn',
        name: 'MTN Mobile Money',
        description: 'Push de paiement vers votre numéro MTN MoMo.',
        icon: Smartphone,
        accent: 'from-yellow-400 to-amber-500',
        category: 'mobile',
        requiresPhone: true,
    },
];

const DURATIONS = [
    { value: 1, label: '1 mois', discount: 0 },
    { value: 3, label: '3 mois', discount: 0 },
    { value: 12, label: '12 mois', discount: 0 },
];

function StepIndicator({ current }: { current: number }) {
    const steps = ['Plan', 'Durée', 'Paiement'];
    return (
        <ol className="flex items-center justify-center gap-2 text-xs">
            {steps.map((label, i) => {
                const idx = i + 1;
                const done = idx < current;
                const active = idx === current;
                return (
                    <li key={label} className="flex items-center gap-2">
                        <div
                            className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold transition-all',
                                done && 'border-emerald-500 bg-emerald-500 text-white',
                                active && 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30',
                                !done && !active && 'border-slate-200 bg-white text-slate-400',
                            )}
                        >
                            {done ? <CheckCircle className="h-4 w-4" /> : idx}
                        </div>
                        <span
                            className={cn(
                                'font-semibold uppercase tracking-wider',
                                active ? 'text-primary' : done ? 'text-emerald-600' : 'text-slate-400',
                            )}
                        >
                            {label}
                        </span>
                        {i < steps.length - 1 && (
                            <div className={cn('h-px w-8', done ? 'bg-emerald-500' : 'bg-slate-200')} />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

function ProviderButton({
    option,
    isLoading,
    disabled,
    onClick,
}: {
    option: ProviderOption;
    isLoading: boolean;
    disabled: boolean;
    onClick: () => void;
}) {
    const Icon = option.icon;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'group relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all',
                'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
            )}
        >
            <div className="flex items-center gap-4">
                <div
                    className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                        option.accent,
                    )}
                >
                    {option.logo ? (
                        <Image src={option.logo} alt={option.name} width={28} height={28} className="rounded" />
                    ) : Icon ? (
                        <Icon className="h-6 w-6" />
                    ) : null}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{option.name}</span>
                        {option.recommended && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                Recommandé
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{option.description}</p>
                </div>
                <div className="shrink-0">
                    {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                        <div className="h-8 w-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <ChevronLeft className="h-4 w-4 rotate-180" />
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
}

function PaymentPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const { schoolId, schoolName, schoolData, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();
    const { updateSubscription } = useSubscription();

    const settingsRef = useMemo(() => doc(firestore, 'system_settings/default'), [firestore]);
    const { data: settingsData, loading: settingsLoading } = useDoc(settingsRef);

    const [isLoadingProvider, setIsLoadingProvider] = useState<null | Provider | 'free'>(null);
    const [error, setError] = useState<string | null>(null);
    const [mtnPhoneNumber, setMtnPhoneNumber] = useState('');
    const [selectedDuration, setSelectedDuration] = useState(1);

    const plan = searchParams.get('plan');
    const price = searchParams.get('price');
    const description = searchParams.get('description');

    const monthlyPrice = parseInt(price || '0', 10);
    const totalPrice = monthlyPrice * selectedDuration;

    useEffect(() => {
        if (!userLoading && !schoolLoading && (!plan || !price || !description)) {
            const id = setTimeout(() => {
                if (!searchParams.get('plan') || !searchParams.get('price') || !searchParams.get('description')) {
                    setError("Les informations de la transaction sont manquantes. Veuillez retourner à la page d'abonnement et réessayer.");
                }
            }, 500);
            return () => clearTimeout(id);
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

    const handlePayment = async (provider: Provider) => {
        setError(null);

        if (provider === 'mtn' && !/^\d{8,15}$/.test(mtnPhoneNumber)) {
            setError("Veuillez saisir un numéro MTN valide (8 à 15 chiffres) pour le paiement MoMo.");
            return;
        }

        if (!plan || !totalPrice || !description || !user?.authUser || !schoolId) {
            setError("Impossible de lancer le paiement. Données manquantes ou utilisateur non authentifié.");
            return;
        }

        setIsLoadingProvider(provider);

        const { url, error: serviceError } = await createCheckoutLink(provider, {
            type: 'subscription',
            planName: plan || undefined,
            amount: totalPrice.toString(),
            description: `${description} (${selectedDuration} mois)`,
            user: user.authUser,
            schoolId,
            phoneNumber: provider === 'mtn' ? mtnPhoneNumber : undefined,
            duration: selectedDuration,
        });

        if (url) {
            window.location.href = url;
            return;
        }
        if (provider === 'mtn' && serviceError === null) {
            router.push('/payment/pending?type=subscription');
            return;
        }
        setError(serviceError);
        setIsLoadingProvider(null);
    };

    const isLoading = userLoading || schoolLoading || settingsLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center pt-20">
                <Card className="w-full max-w-xl text-center">
                    <CardHeader>
                        <Skeleton className="h-8 w-3/4 mx-auto" />
                        <Skeleton className="h-4 w-1/2 mx-auto mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4 pt-10 pb-10">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                        <p>Chargement des informations...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error && !plan) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-160px)]">
                <Card className="w-full max-w-md">
                    <CardHeader><CardTitle>Erreur</CardTitle></CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" /><AlertTitle>Échec</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const availableProviders = useMemo(() => {
        if (!settingsData || !settingsData.paymentProviders) return PROVIDERS;
        return PROVIDERS.filter(p => {
            // 'orangemoney' is stored as 'orangeMoney' in settings
            const key = p.id === 'orangemoney' ? 'orangeMoney' : p.id;
            return settingsData.paymentProviders[key] !== false;
        });
    }, [settingsData]);

    const aggregators = availableProviders.filter(p => p.category === 'aggregator');
    const cards = availableProviders.filter(p => p.category === 'card');
    const mobiles = availableProviders.filter(p => p.category === 'mobile');

    return (
        <div className="mx-auto max-w-4xl space-y-6 pb-12 pt-6">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground">
                <ChevronLeft className="mr-1 h-4 w-4" /> Retour aux plans
            </Button>

            <StepIndicator current={3} />

            <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
                {/* Colonne paiement */}
                <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-br from-slate-50 to-white border-b">
                        <CardTitle className="text-xl">Choisissez votre moyen de paiement</CardTitle>
                        <CardDescription>
                            Vous serez redirigé vers la page sécurisée du fournisseur choisi pour saisir vos informations.
                            GèreEcole ne stocke jamais vos coordonnées bancaires.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        {totalPrice === 0 ? (
                            <Button
                                className="w-full h-14 text-base"
                                onClick={handleFreeUpgrade}
                                disabled={!!isLoadingProvider}
                            >
                                {isLoadingProvider === 'free' ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle className="mr-2 h-5 w-5" />
                                        Confirmer l'abonnement (Gratuit)
                                    </>
                                )}
                            </Button>
                        ) : (
                            <>
                                {aggregators.length > 0 && (
                                    <section className="space-y-3">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Agrégateurs (recommandé)</h3>
                                        {aggregators.map(opt => (
                                            <ProviderButton
                                                key={opt.id}
                                                option={opt}
                                                isLoading={isLoadingProvider === opt.id}
                                                disabled={!!isLoadingProvider}
                                                onClick={() => handlePayment(opt.id)}
                                            />
                                        ))}
                                    </section>
                                )}

                                {mobiles.length > 0 && (
                                    <section className="space-y-3">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Mobile Money (direct)</h3>
                                        {mobiles.map(opt => (
                                            <div key={opt.id} className="space-y-2">
                                                <ProviderButton
                                                    option={opt}
                                                    isLoading={isLoadingProvider === opt.id}
                                                    disabled={!!isLoadingProvider}
                                                    onClick={() => handlePayment(opt.id)}
                                                />
                                                {opt.id === 'mtn' && (
                                                    <div className="pl-16 pr-2 space-y-1">
                                                        <Label htmlFor="mtn-phone" className="text-xs text-muted-foreground">
                                                            Numéro MTN MoMo (sans indicatif)
                                                        </Label>
                                                        <Input
                                                            id="mtn-phone"
                                                            value={mtnPhoneNumber}
                                                            onChange={e => setMtnPhoneNumber(e.target.value.replace(/[^\d]/g, ''))}
                                                            placeholder="Ex: 67123456"
                                                            inputMode="numeric"
                                                            maxLength={15}
                                                            className="h-9"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </section>
                                )}

                                {cards.length > 0 && (
                                    <section className="space-y-3">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Carte bancaire</h3>
                                        {cards.map(opt => (
                                            <ProviderButton
                                                key={opt.id}
                                                option={opt}
                                                isLoading={isLoadingProvider === opt.id}
                                                disabled={!!isLoadingProvider}
                                                onClick={() => handlePayment(opt.id)}
                                            />
                                        ))}
                                    </section>
                                )}
                            </>
                        )}

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            <span>Connexion chiffrée — paiement traité hors GèreEcole.</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Colonne récap */}
                <div className="space-y-4 md:sticky md:top-6 self-start">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Récapitulatif</CardTitle>
                            <CardDescription className="truncate">
                                {schoolName || 'Votre établissement'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-xl border bg-slate-50/50 p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Plan</span>
                                    <span className="font-bold text-slate-900">{plan}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Mensuel</span>
                                    <span className="text-sm font-semibold">{formatCurrency(monthlyPrice, schoolData?.country)}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Durée</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {DURATIONS.map(d => (
                                        <button
                                            key={d.value}
                                            type="button"
                                            onClick={() => setSelectedDuration(d.value)}
                                            className={cn(
                                                'rounded-xl border px-3 py-2 text-sm font-semibold transition-all',
                                                selectedDuration === d.value
                                                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                                            )}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 space-y-1">
                                <p className="text-xs text-primary/70 uppercase tracking-wider font-bold">Total à régler</p>
                                <p className="text-3xl font-black text-primary">
                                    {formatCurrency(totalPrice, schoolData?.country)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Sur {selectedDuration} mois — payable en une fois.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs text-emerald-700">
                        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>
                            Tous les paiements sont traités par des prestataires certifiés PCI-DSS.
                            GèreEcole ne voit ni ne stocke vos données de paiement.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PaymentPage() {
    return (
        <Suspense fallback={
            <div className="flex items-start justify-center pt-20">
                <Skeleton className="h-96 w-full max-w-xl" />
            </div>
        }>
            <PaymentPageContent />
        </Suspense>
    );
}
