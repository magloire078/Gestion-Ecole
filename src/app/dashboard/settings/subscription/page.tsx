'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useSchoolData } from "@/hooks/use-school-data";
import { Skeleton } from "@/components/ui/skeleton";

export default function SubscriptionPage() {

    const { schoolName, loading } = useSchoolData();

    const plans = [
        {
            name: "Essentiel",
            price: "Gratuit",
            description: "Idéal pour les petites écoles qui débutent.",
            features: [
                "Jusqu'à 50 élèves",
                "Jusqu'à 10 membres du personnel",
                "Gestion des élèves, classes et professeurs",
                "Fonctionnalités de base"
            ],
            isCurrent: true,
        },
        {
            name: "Pro",
            price: "Bientôt disponible",
            description: "Pour les écoles en croissance avec des besoins avancés.",
            features: [
                "Nombre d'élèves illimité",
                "Gestion RH et paie",
                "Gestion pédagogique complète",
                "Fonctionnalités IA avancées",
                "Support prioritaire"
            ],
            isCurrent: false,
        }
    ];

    if (loading) {
        return (
             <div className="space-y-6">
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">Abonnement</h1>
                    <p className="text-muted-foreground">
                        Consultez et gérez votre formule d'abonnement GèreEcole.
                    </p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-80 w-full" />
                    <Skeleton className="h-80 w-full" />
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
                    <Card key={plan.name} className={plan.isCurrent ? "border-primary border-2" : ""}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>{plan.name}</span>
                                {plan.isCurrent && <span className="text-xs font-normal bg-primary text-primary-foreground rounded-full px-3 py-1">Plan Actuel</span>}
                            </CardTitle>
                            <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="text-3xl font-bold">
                                {plan.price}
                             </div>
                             <ul className="space-y-2 text-sm text-muted-foreground">
                                {plan.features.map(feature => (
                                    <li key={feature} className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                             </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" disabled={plan.isCurrent || plan.name === "Pro"}>
                                {plan.isCurrent ? "Votre Plan Actuel" : "Choisir ce Plan"}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}
