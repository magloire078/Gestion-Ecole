'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { Loader2, AlertCircle, CreditCard, Smartphone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc, type DocumentReference, type DocumentData } from 'firebase/firestore';
import type { student as Student } from '@/lib/data-types';
import { formatCurrency, getCurrencySymbol } from '@/lib/currency-utils';
import { cn } from '@/lib/utils';
import { AnimatedHighlight } from '@/components/ui/animated-highlight';
import { CheckCircle2, QrCode } from 'lucide-react';
import { createCheckoutLink } from '@/services/payment-service';

function PaymentPageSkeleton() {
    return (
        <div className="flex items-center justify-center pt-20">
            <Card className="w-full max-w-lg text-center">
                <CardHeader> <Skeleton className="h-8 w-3/4 mx-auto" /> <Skeleton className="h-4 w-1/2 mx-auto mt-2" /> </CardHeader>
                <CardContent className="space-y-4 pt-10 pb-10">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p>Chargement des informations de paiement...</p>
                </CardContent>
            </Card>
        </div>
    );
}

function TuitionPaymentPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('id') as string;
    const { user, schoolId, loading: userLoading } = useUser();
    const firestore = useFirestore();

    const studentRef = useMemo(() =>
        (schoolId && studentId) ? doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`) as DocumentReference<Student, DocumentData> : null,
        [firestore, schoolId, studentId]);

    const settingsRef = useMemo(() => doc(firestore, 'system_settings/default'), [firestore]);

    const { data: student, loading: studentLoading } = useDoc<Student>(studentRef);
    const { data: settingsData, loading: settingsLoading } = useDoc(settingsRef);

    const [amountToPay, setAmountToPay] = useState<number>(0);
    const [isLoadingProvider, setIsLoadingProvider] = useState<null | 'orangemoney' | 'stripe' | 'wave' | 'mtn' | 'paydunya' | 'genius'>(null);
    const [error, setError] = useState<string | null>(null);
    const [mtnPhoneNumber, setMtnPhoneNumber] = useState('');

    useEffect(() => {
        if (student?.amountDue) {
            setAmountToPay(student.amountDue);
        }
    }, [student]);

    const handlePayment = async (provider: 'orangemoney' | 'stripe' | 'wave' | 'mtn' | 'paydunya' | 'genius') => {
        setIsLoadingProvider(provider);
        setError(null);

        if (!student || !amountToPay || !user || !schoolId || !studentId) {
            setError("Impossible de lancer le paiement. Données manquantes.");
            setIsLoadingProvider(null);
            return;
        }

        const { url, error: serviceError } = await createCheckoutLink(provider, {
            type: 'tuition',
            amount: amountToPay.toString(),
            description: `Paiement scolarité pour ${student.firstName} ${student.lastName}`,
            user: user.authUser!,
            schoolId,
            studentId,
            phoneNumber: provider === 'mtn' ? mtnPhoneNumber : undefined,
        });

        if (url) {
            window.location.href = url;
        } else {
            setError(serviceError);
            setIsLoadingProvider(null);
        }
    };

    const isLoading = userLoading || studentLoading || settingsLoading;

    if (isLoading) {
        return <PaymentPageSkeleton />;
    }

    if (!student) {
        return (
            <div className="flex items-center justify-center h-full pt-10">
                <Card className="w-full max-w-md">
                    <CardHeader><CardTitle>Erreur</CardTitle><CardDescription>Élève non trouvé.</CardDescription></CardHeader>
                    <CardFooter><Button onClick={() => router.back()} className="w-full">Retour</Button></CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl overflow-hidden border-none shadow-2xl relative bg-white/80 backdrop-blur-xl">
                <AnimatedHighlight className="h-1.5 opacity-60" />
                <CardHeader className="text-center pb-2 pt-8">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                            <CreditCard className="h-8 w-8" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-black tracking-tight text-slate-900">Paiement de Scolarité</CardTitle>
                    <CardDescription className="text-base">
                        Réglement pour <span className="font-bold text-slate-900">{student.firstName} {student.lastName}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-blue-600/5 blur-xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-center space-y-2">
                            <Label htmlFor="amount-to-pay" className="text-xs uppercase font-black tracking-widest text-muted-foreground">Montant à régler ({getCurrencySymbol()})</Label>
                            <Input 
                                id="amount-to-pay" 
                                type="number" 
                                value={amountToPay} 
                                onChange={(e) => setAmountToPay(Number(e.target.value))} 
                                max={student.amountDue} 
                                className="text-4xl font-black h-16 border-none bg-transparent text-center focus-visible:ring-0" 
                            />
                            <div className="flex items-center justify-center gap-2">
                                <div className="h-1 w-1 rounded-full bg-slate-300" />
                                <p className="text-sm font-medium text-muted-foreground italic">Solde total dû: {formatCurrency(student.amountDue)}</p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <Alert variant="destructive" className="rounded-2xl border-rose-100 bg-rose-50 text-rose-900">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="font-bold">Un problème est survenu</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-center text-muted-foreground mb-6">Moyens de paiement disponibles</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { id: 'wave' as const, name: 'Wave', color: 'bg-[#01a79e]/5 border-[#01a79e]/20 hover:bg-[#01a79e]/10', icon: '🌊', enabled: settingsData?.paymentProviders?.wave },
                                { id: 'orangemoney' as const, name: 'Orange Money', color: 'bg-orange-50 border-orange-200 hover:bg-orange-100', icon: '📱', enabled: settingsData?.paymentProviders?.orangeMoney },
                                { id: 'genius' as const, name: 'Genius Pay', color: 'bg-amber-50 border-amber-200 hover:bg-amber-100', icon: '✨', enabled: settingsData?.paymentProviders?.genius },
                                { id: 'paydunya' as const, name: 'PayDunya', color: 'bg-blue-50 border-blue-200 hover:bg-blue-100', icon: '🌍', enabled: settingsData?.paymentProviders?.paydunya },
                            ].filter(p => p.enabled).map((provider) => (
                                <button
                                    key={provider.id}
                                    onClick={() => handlePayment(provider.id)}
                                    disabled={!!isLoadingProvider}
                                    className={cn(
                                        "flex items-center gap-4 p-5 rounded-[1.5rem] border text-left transition-all duration-300 transform active:scale-95",
                                        provider.color,
                                        isLoadingProvider === provider.id ? "opacity-50" : "opacity-100"
                                    )}
                                >
                                    <div className="h-12 w-12 flex items-center justify-center bg-white rounded-2xl shadow-sm text-2xl">
                                        {provider.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-base font-black text-slate-900">{provider.name}</div>
                                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Mobile Money</div>
                                    </div>
                                    {isLoadingProvider === provider.id ? (
                                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                    ) : (
                                        <CheckCircle2 className="h-5 w-5 text-slate-300" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {settingsData?.paymentProviders?.mtn && (
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                                    <Label htmlFor="mtn-phone" className="text-xs font-black uppercase tracking-widest text-muted-foreground">MTN MoMo</Label>
                                </div>
                                <div className="flex gap-3">
                                    <Input 
                                        id="mtn-phone" 
                                        placeholder="05xxxxxxxx" 
                                        value={mtnPhoneNumber} 
                                        onChange={(e) => setMtnPhoneNumber(e.target.value)}
                                        className="h-14 rounded-2xl bg-white border-slate-200 text-lg font-bold"
                                    />
                                    <Button
                                        className="h-14 px-8 rounded-2xl bg-[#FFCC00] hover:bg-[#FFCC00]/90 text-black font-black"
                                        onClick={() => handlePayment('mtn')}
                                        disabled={!!isLoadingProvider || !mtnPhoneNumber}
                                    >
                                        {isLoadingProvider === 'mtn' ? <Loader2 className="h-6 w-6 animate-spin" /> : "Payer"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {settingsData?.paymentProviders?.stripe && (
                            <Button
                                variant="outline"
                                className="w-full h-16 rounded-[1.5rem] border-slate-200 hover:bg-slate-50 group transition-all"
                                onClick={() => handlePayment('stripe')}
                                disabled={!!isLoadingProvider}
                            >
                                {isLoadingProvider === 'stripe' ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="h-8 w-12 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[8px] font-black group-hover:scale-110 transition-transform">CARD</div>
                                        <span className="font-bold text-slate-700">Payer par Carte Bancaire</span>
                                    </div>
                                )}
                            </Button>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 p-8 border-t border-slate-100 group">
                    <Button 
                        onClick={() => router.back()} 
                        className="w-full h-14 rounded-2xl border-none bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold transition-all" 
                        variant="ghost"
                    >
                        Annuler et retourner au profil
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

export default function TuitionPaymentClient() {
    return (<Suspense fallback={<PaymentPageSkeleton />}><TuitionPaymentPageContent /></Suspense>)
}
