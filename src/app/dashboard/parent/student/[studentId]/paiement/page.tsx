'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { Loader2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc } from 'firebase/firestore';
import type { student as Student } from '@/lib/data-types';

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
        (schoolId && studentId) ? doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`) : null, 
    [firestore, schoolId, studentId]);

    const { data: student, loading: studentLoading } = useDoc<Student>(studentRef);

    const [amountToPay, setAmountToPay] = useState<number>(0);

    useEffect(() => {
        if (student?.amountDue) {
            setAmountToPay(student.amountDue);
        }
    }, [student]);

    const isLoading = userLoading || studentLoading;

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
                            <Label htmlFor="amount-to-pay">Montant à Payer (CFA)</Label>
                            <Input id="amount-to-pay" type="number" value={amountToPay} onChange={(e) => setAmountToPay(Number(e.target.value))} max={student.amountDue} className="text-2xl font-bold h-14 text-center mt-2" />
                            <p className="text-xs text-muted-foreground mt-1">Solde total dû: {student.amountDue?.toLocaleString('fr-FR')} CFA</p>
                        </div>
                    </div>
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Bientôt disponible</AlertTitle>
                        <AlertDescription>
                          Le paiement en ligne sera bientôt activé. Revenez prochainement pour payer directement depuis ce portail.
                        </AlertDescription>
                    </Alert>
                </CardContent>
                 <CardFooter>
                    <Button onClick={() => router.back()} className="w-full" variant="outline">Retour</Button>
                </CardFooter>
            </Card>
        </div>
    )
}

export default function TuitionPaymentPage() {
    return (<Suspense fallback={<PaymentPageSkeleton />}><TuitionPaymentPageContent /></Suspense>)
}
