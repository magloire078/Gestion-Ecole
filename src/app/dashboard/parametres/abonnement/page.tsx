
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, AlertCircle, Building, Users } from "lucide-react";
import { useSchoolData } from "@/hooks/use-school-data";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type PlanName = 'Essentiel' | 'Pro' | 'Premium';

export default function SubscriptionPage() {
    const router = useRouter();
    const { schoolName, loading: schoolLoading } = useSchoolData();
    const { subscription, loading: subscriptionLoading } = useSubscription();
    const { toast } = useToast();
    const isLoading = schoolLoading || subscriptionLoading;
    const [error, setError] = useState<string | null>(null);

    const handleChoosePlan = (planName: PlanName, price: number) => {
        setError(null);
        if (!schoolName) {
            setError("Le nom de l'école n'est pas encore chargé. Veuillez patienter un instant.");
            return;
        }

        const transactionDetails = new URLSearchParams({
            plan: planName,
            price: price.toString(),
            description: `Abonnement ${planName} pour ${schoolName}`,
        }).toString();

        router.push(`/dashboard/parametres/abonnement/paiement?${transactionDetails}`);
    };
    
    const isCurrentPlan = (planName: PlanName) => {
        return subscription?.plan === planName;
    };
    
    const plans = [
        {
            name: "Essentiel",
            priceNumber: 0,
            price: "Gratuit",
            priceDescription: "pour toujours",
            description: "Idéal pour les petites écoles qui débutent.",
            features: [
                "Gestion de base (élèves, classes, notes)",
                "Comptabilité simplifiée",
                "Support communautaire",
            ],
            limits: [
                { icon: Users, text: "Jusqu'à 50 élèves" },
                { icon: Building, text: "Jusqu'à 2 cycles" },
            ]
        },
        {
            name: "Pro",
            priceNumber: 49900,
            price: "49 900 CFA",
            priceDescription: "/ mois",
            description: "Pour les écoles en croissance avec des besoins avancés.",
            features: [
                "Toutes les fonctionnalités Essentiel",
                "Gestion RH & Paie",
                "Fonctionnalités IA (appréciations...)",
                "Support prioritaire par email",
            ],
             limits: [
                { icon: Users, text: "Jusqu'à 250 élèves" },
                { icon: Building, text: "Jusqu'à 5 cycles" },
            ]
        },
        {
            name: "Premium",
            priceNumber: 99900,
            price: "99 900 CFA",
            priceDescription: "/ mois",
            description: "La solution complète pour les grands établissements.",
            features: [
                "Toutes les fonctionnalités Pro",
                "Portail Parents & Élèves (Bientôt)",
                "Analyses et rapports avancés",
                "Support dédié par téléphone",
            ],
             limits: [
                { icon: Users, text: "Élèves illimités" },
                { icon: Building, text: "Cycles illimités" },
            ]
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
                <div className="grid gap-6 md:grid-cols-3">
                    <Skeleton className="h-96 w-full" />
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
                    Choisissez le plan qui correspond le mieux à la taille et aux besoins de <strong>{schoolName}</strong>.
                </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plans.map(plan => {
                    const current = isCurrentPlan(plan.name as PlanName);
                    return (
                        <Card key={plan.name} className={cn("flex flex-col transform transition-transform duration-300 hover:scale-[1.02] hover:shadow-2xl", current && "border-2 border-primary shadow-2xl scale-[1.02]")}>
                            <CardHeader className="text-center">
                                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                                    <span>{plan.name}</span>
                                    {current && <Badge variant="default" className="text-xs">Actuel</Badge>}
                                </CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="text-center mb-6">
                                        <span className="text-4xl font-bold">{plan.price}</span>
                                        <span className="text-muted-foreground">{plan.priceDescription}</span>
                                    </div>
                                    <ul className="space-y-3 text-sm">
                                        {plan.features.map(feature => (
                                            <li key={feature} className="flex items-start gap-3">
                                                <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="pt-6 border-t">
                                     <h4 className="text-sm font-semibold mb-3">Limites du plan :</h4>
                                     <ul className="space-y-3 text-sm text-muted-foreground">
                                        {plan.limits.map(limit => (
                                            <li key={limit.text} className="flex items-center gap-3">
                                                <limit.icon className="h-4 w-4" />
                                                <span>{limit.text}</span>
                                            </li>
                                        ))}
                                     </ul>
                                </div>
                            </CardContent>
                            <CardFooter>
                               {current ? (
                                   <Button className="w-full" disabled>Votre Plan Actuel</Button>
                                ) : (
                                    <Button 
                                        className="w-full" 
                                        variant={plan.name === 'Essentiel' ? 'secondary' : 'default'}
                                        onClick={() => handleChoosePlan(plan.name as PlanName, plan.priceNumber)}
                                        disabled={isLoading}
                                    >
                                        {plan.name !== 'Essentiel' && <Zap className="mr-2 h-4 w-4" />}
                                        Choisir le Plan {plan.name}
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    )
                })}
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

    