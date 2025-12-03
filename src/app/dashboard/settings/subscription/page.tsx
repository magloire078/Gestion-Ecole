
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, AlertCircle } from "lucide-react";
import { useSchoolData } from "@/hooks/use-school-data";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';
import { cn } from "@/lib/utils";

export default function SubscriptionPage() {
    const { schoolName, loading: schoolLoading } = useSchoolData();
    const { subscription, updateSubscription, loading: subscriptionLoading } = useSubscription();
    const { toast } = useToast();
    const isLoading = schoolLoading || subscriptionLoading;
    const [error, setError] = useState<string | null>(null);

    const wavePaymentLink = "https://pay.wave.com/m/M_ci_2Td7SafrFP8R/c/ci/";

    const handleDowngrade = async () => {
        setError(null);
        try {
            await updateSubscription({ plan: 'Essentiel', status: 'active' });
            toast({
                title: 'Modification enregistrée',
                description: 'Votre abonnement a été changé pour le plan Essentiel.',
            });
        } catch (err) {
             setError('Une erreur est survenue. Veuillez réessayer.');
        }
    };

    const plans = [
        {
            name: "Essentiel",
            price: "Gratuit",
            description: "Idéal pour les petites écoles qui débutent.",
            features: [
                "Jusqu'à 50 élèves",
                "Gestion des élèves, classes et professeurs",
                "Suivi basique des notes",
                "Gestion de la scolarité",
                "Comptabilité de base",
            ],
            isCurrent: subscription?.plan === "Essentiel",
            action: handleDowngrade,
            actionLabel: "Revenir au plan Essentiel",
            buttonDisabled: subscription?.plan === "Essentiel",
        },
        {
            name: "Pro",
            price: "49 900 CFA / mois",
            description: "Pour les écoles en croissance avec des besoins avancés.",
            features: [
                "Toutes les fonctionnalités du plan Essentiel",
                "Nombre d'élèves illimité",
                "Gestion des RH et de la paie",
                "Fonctionnalités IA (appréciations, etc.)",
                "Support prioritaire",
            ],
            isCurrent: subscription?.plan === "Pro",
            action: () => {}, // L'action est maintenant gérée par le lien
            actionLabel: "Passer au Plan Pro",
            buttonDisabled: subscription?.plan === "Pro",
        }
    ];

    if (isLoading) {
        return (
             <div className="space-y-6">
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">Abonnement</h1>
                    <p className="text-muted-foreground">
                        Consultez et gérez votre formule d'abonnement GèreEcole.
                    </p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-96 w-full" />
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-lg font-semibold md:text-2xl">Abonnement</h1>
                <p className="text-muted-foreground">
                    Consultez et gérez votre formule d'abonnement pour <strong>{schoolName}</strong>.
                </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
                {plans.map(plan => (
                    <Card key={plan.name} className={plan.isCurrent ? "border-primary" : ""}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span>{plan.name}</span>
                                {plan.isCurrent && <Badge variant="default" className="text-xs">Plan Actuel</Badge>}
                            </CardTitle>
                            <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="text-3xl font-bold">
                                {plan.price}
                             </div>
                             <ul className="space-y-2 text-sm text-muted-foreground">
                                {plan.features.map(feature => (
                                    <li key={feature} className="flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                             </ul>
                        </CardContent>
                        <CardFooter>
                           {plan.name === 'Pro' ? (
                                <Button asChild className="w-full" disabled={plan.buttonDisabled}>
                                    <Link href={wavePaymentLink} target="_blank" rel="noopener noreferrer">
                                        <Zap className="mr-2 h-4 w-4" />
                                        {plan.isCurrent ? "Votre Plan Actuel" : "Passer au Plan Pro"}
                                    </Link>
                                </Button>
                            ) : (
                                <Button className="w-full" onClick={plan.action} disabled={plan.buttonDisabled}>
                                    {plan.isCurrent ? "Votre Plan Actuel" : "Revenir au plan Essentiel"}
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erreur</AlertTitle>
                    <AlertDescription>
                        {error}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    )
}
