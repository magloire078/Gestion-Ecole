

'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Mail } from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';
import { addMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

function PaymentStatusPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const status = searchParams.get('payment_status');
    const durationMonthsParam = searchParams.get('duration_months');
    const { subscription, updateSubscription, loading } = useSchoolData();
    const { toast } = useToast();

    useEffect(() => {
        const handleSubscriptionUpdate = async () => {
            if (status === 'success' && durationMonthsParam && subscription) {
                const duration = parseInt(durationMonthsParam, 10);
                if (!isNaN(duration) && duration > 0) {
                    const currentEndDate = new Date(subscription.endDate || Date.now());
                    const newEndDate = addMonths(currentEndDate, duration);

                    try {
                        await updateSubscription({
                            endDate: newEndDate.toISOString(),
                            status: 'active',
                        });
                        toast({
                            title: 'Abonnement mis à jour !',
                            description: `Votre abonnement est maintenant valide jusqu'au ${newEndDate.toLocaleDateString('fr-FR')}.`,
                        });
                    } catch (error) {
                         toast({
                            variant: 'destructive',
                            title: 'Erreur',
                            description: "Impossible de mettre à jour l'abonnement.",
                        });
                    }
                }
            }
        };

        if (!loading) {
            handleSubscriptionUpdate();
        }
    }, [status, durationMonthsParam, subscription, updateSubscription, loading, toast]);
    

    if (status === 'success') {
        return (
             <div className="flex items-center justify-center h-full pt-20">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl flex items-center justify-center gap-2">
                           <CheckCircle className="h-8 w-8 text-green-500" /> Paiement Réussi !
                        </CardTitle>
                        <CardDescription>
                           Votre paiement a été traité avec succès. Votre abonnement est mis à jour.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="py-10">
                        <p className="text-muted-foreground">Vous allez être redirigé vers votre tableau de bord.</p>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={() => router.push('/dashboard')}>
                            Retourner au Tableau de Bord
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center h-full pt-20">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="text-2xl">
                        En attente de confirmation
                    </CardTitle>
                    <CardDescription>
                       Veuillez suivre les instructions sur votre téléphone pour valider le paiement.
                    </CardDescription>
                </CardHeader>
                <CardContent className="py-10 space-y-4">
                    <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                    <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                        <Mail className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <p>Vous pouvez fermer cette page en toute sécurité. Une fois le paiement confirmé, votre abonnement sera activé et vous pourrez recevoir une notification.</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" variant="outline" onClick={() => router.push('/dashboard/parametres/abonnement')}>
                        Retour à la page d'abonnement
                    </Button>
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
