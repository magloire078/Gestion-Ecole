'use client';

import { useRouter, useParams } from 'next/navigation';
import { Suspense, useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc, type DocumentReference, type DocumentData } from 'firebase/firestore';
import type { student as Student } from '@/lib/data-types';
import { createCheckoutLink } from '@/services/payment-service';
import { formatCurrency, getCurrencySymbol } from '@/lib/currency-utils';

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
    const params = useParams();
    const studentId = params.studentId as string;
    const { user, schoolId, loading: userLoading } = useUser();
    const firestore = useFirestore();

    const studentRef = useMemo(() =>
        (schoolId && studentId) ? doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`) as DocumentReference<Student, DocumentData> : null,
        [firestore, schoolId, studentId]);

    const settingsRef = useMemo(() => doc(firestore, 'system_settings/default'), [firestore]);

    const { data: student, loading: studentLoading } = useDoc<Student>(studentRef);
    const { data: settingsData, loading: settingsLoading } = useDoc(settingsRef);

    const [amountToPay, setAmountToPay] = useState<number>(0);
    const [isLoadingProvider, setIsLoadingProvider] = useState<null | 'genius'>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (student?.amountDue) {
            setAmountToPay(student.amountDue);
        }
    }, [student]);

    const handlePayment = async (provider: 'genius') => {
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
        <div className="flex items-center justify-center h-full pt-10">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Payer la Scolarité</CardTitle>
                    <CardDescription>Pour <strong>{student.firstName} {student.lastName}</strong></CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 border rounded-lg text-center space-y-4">
                        <div>
                            <Label htmlFor="amount-to-pay">Montant à Payer ({getCurrencySymbol()})</Label>
                            <Input id="amount-to-pay" type="number" value={amountToPay} onChange={(e) => setAmountToPay(Number(e.target.value))} max={student.amountDue} className="text-2xl font-bold h-14 text-center mt-2" />
                            <p className="text-xs text-muted-foreground mt-1">Solde total dû: {formatCurrency(student.amountDue)}</p>
                        </div>
                    </div>
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erreur de paiement</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <div className="space-y-4">
                        <Button
                            className="w-full h-16 text-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                            onClick={() => handlePayment('genius')}
                            disabled={!!isLoadingProvider || !amountToPay}
                        >
                            {isLoadingProvider === 'genius' ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                <div className="flex items-center justify-center gap-3">
                                    <Sparkles className="h-6 w-6" />
                                    <span>Payer avec GeniusPay</span>
                                </div>
                            )}
                        </Button>
                        <p className="text-center text-xs text-muted-foreground">
                            Mobile Money (Wave, Orange Money, MTN…) et cartes bancaires via GeniusPay.
                        </p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => router.back()} className="w-full" variant="outline">Retour</Button>
                </CardFooter>
            </Card>
        </div>
    )
}

export default function TuitionPaymentClient() {
    return (<Suspense fallback={<PaymentPageSkeleton />}><TuitionPaymentPageContent /></Suspense>)
}
