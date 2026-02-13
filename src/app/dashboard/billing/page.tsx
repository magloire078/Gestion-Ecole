'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/firebase';
import { SUBSCRIPTION_PLANS, type PlanName } from '@/lib/subscription-plans';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { calculateMonthlyUsage, applyPricing, type MonthlyUsage } from '@/lib/billing-calculator';

export default function BillingPage() {
    const auth = useAuth();
    const user = auth.currentUser;
    const [currentPlan, setCurrentPlan] = useState<PlanName>('Essentiel');
    const [usage, setUsage] = useState<MonthlyUsage | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBillingData() {
            if (!user) return;
            // Fetch school data to get plan
            // This is a simplified fetch, normally we'd get the school ID from user claims or context
            // For now assuming we can get it or user has one active school.
            // Let's mock or use a placeholder if we don't have school context ready.

            // Mock data for demo until we have school context
            setCurrentPlan('Essentiel');
            setUsage({
                studentsCount: 42,
                cyclesCount: 3,
                storageUsed: 0.8 // GB
            });
            setLoading(false);
        }
        fetchBillingData();
    }, [user]);

    if (loading) {
        return <div className="p-8 text-center">Chargement des informations de facturation...</div>;
    }

    const currentPlanDetails = SUBSCRIPTION_PLANS.find(p => p.name === currentPlan);

    return (
        <div className="space-y-8 p-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Abonnement & Facturation</h2>
                    <p className="text-muted-foreground">Gérez votre plan et suivez votre consommation.</p>
                </div>
            </div>

            {/* Consommation Actuelle */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Plan Actuel</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{currentPlan}</div>
                        <p className="text-xs text-muted-foreground">
                            {currentPlanDetails?.priceString} {currentPlanDetails?.priceSuffix}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Élèves</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{usage?.studentsCount}</div>
                        <Progress value={(usage?.studentsCount || 0) / 50 * 100} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                            {currentPlan === 'Essentiel' ? 'Limite: 50' : 'Illimité'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Stockage</CardTitle>
                        {/* Icon placeholder if needed */}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{usage?.storageUsed} Go</div>
                        <Progress value={(usage?.storageUsed || 0) / (currentPlanDetails?.storageLimitGB || 1) * 100} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                            Sur {currentPlanDetails?.storageLimitGB === Infinity ? 'Illimité' : `${currentPlanDetails?.storageLimitGB} Go`}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Plans Disponibles */}
            <h3 className="text-xl font-semibold mt-8">Changer de plan</h3>
            <div className="grid gap-6 lg:grid-cols-3">
                {SUBSCRIPTION_PLANS.map((plan) => (
                    <Card key={plan.name} className={plan.name === currentPlan ? "border-primary border-2" : ""}>
                        <CardHeader>
                            <CardTitle>{plan.name}</CardTitle>
                            <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="text-2xl font-bold">
                                {plan.priceString}
                                <span className="text-sm font-normal text-muted-foreground">{plan.priceSuffix}</span>
                            </div>
                            <ul className="space-y-2 text-sm">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center">
                                        <Check className="mr-2 h-4 w-4 text-primary" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" variant={plan.name === currentPlan ? "outline" : "default"} disabled={plan.name === currentPlan}>
                                {plan.name === currentPlan ? "Plan Actuel" : "Choisir ce plan"}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
