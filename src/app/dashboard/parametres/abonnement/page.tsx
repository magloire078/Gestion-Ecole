

'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, AlertCircle, Building, Users, Utensils, Bus, Bed, HeartPulse, Trophy, Briefcase, LandPlot, Loader2, Calendar } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

type PlanName = 'Essentiel' | 'Pro' | 'Premium';
type ModuleName = 'sante' | 'cantine' | 'transport' | 'internat' | 'immobilier' | 'activites' | 'rh';

const MODULES_CONFIG = [
    { id: 'sante', name: 'Santé', icon: HeartPulse, price: 5000, desc: 'Suivi médical, carnet de vaccination...' },
    { id: 'cantine', name: 'Cantine', icon: Utensils, price: 10000, desc: 'Gestion des menus et réservations.' },
    { id: 'transport', name: 'Transport', icon: Bus, price: 10000, desc: 'Suivi de flotte et abonnements.' },
    { id: 'internat', name: 'Internat', icon: Bed, price: 15000, desc: 'Gestion des dortoirs et occupants.' },
    { id: 'rh', name: 'RH & Paie', icon: Briefcase, price: 15000, desc: 'Gestion du personnel et des salaires.' },
    { id: 'immobilier', name: 'Immobilier', icon: LandPlot, price: 10000, desc: 'Inventaire, maintenance, salles.' },
    { id: 'activites', name: 'Activités', icon: Trophy, price: 5000, desc: 'Clubs et compétitions.' },
] as const;


export default function SubscriptionPage() {
    const router = useRouter();
    const { schoolName, loading: schoolLoading, schoolData } = useSchoolData();
    const { subscription, updateSubscription, loading: subscriptionLoading } = useSubscription();
    const { toast } = useToast();
    const isLoading = schoolLoading || subscriptionLoading;
    const [error, setError] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

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
    
    const handleModuleToggle = async (moduleId: ModuleName, checked: boolean) => {
        if (!subscription || isUpdating) return;

        setIsUpdating(true);
        const currentModules = subscription.activeModules || [];
        const newModules = checked 
            ? [...currentModules, moduleId]
            : currentModules.filter(m => m !== moduleId);
            
        try {
            await updateSubscription({ ...subscription, activeModules: newModules });
            toast({
                title: "Module mis à jour",
                description: `Le module ${MODULES_CONFIG.find(m => m.id === moduleId)?.name} a été ${checked ? 'activé' : 'désactivé'}. La modification sera prise en compte sur votre prochaine facture.`,
            });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour les modules.' });
        } finally {
            setIsUpdating(false);
        }
    };
    
    const isCurrentPlan = (planName: PlanName) => {
        return subscription?.plan === planName;
    };
    
    const plans = [
        {
            name: "Essentiel",
            priceNumber: 0,
            price: "Gratuit",
            priceDescription: "pour découvrir",
            description: "Idéal pour évaluer toutes les fonctionnalités avec des limites généreuses.",
            features: [
                "Gestion de base (élèves, classes, notes)",
                "Accès à tous les modules complémentaires",
                "Support communautaire",
            ],
            limits: [
                { icon: Users, text: "Jusqu'à 50 élèves" },
                { icon: Building, text: "Jusqu'à 5 cycles" },
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
                "Accès aux modules complémentaires (payants)",
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
                "Tous les modules complémentaires inclus",
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
                 <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    const isPaidPlan = subscription?.plan === 'Pro' || subscription?.plan === 'Premium';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-lg font-semibold md:text-2xl">Abonnement</h1>
                <p className="text-muted-foreground">
                    Choisissez le plan qui correspond le mieux à la taille et aux besoins de <strong>{schoolName}</strong>.
                </p>
            </div>
            
            {subscription?.endDate && (
                <Card className="bg-primary/5">
                    <CardHeader className="flex flex-row items-center justify-between">
                       <div>
                         <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary"/> Statut de l'abonnement</CardTitle>
                         <CardDescription>Votre plan actuel est <strong>{subscription.plan}</strong>.</CardDescription>
                       </div>
                        <Badge variant={subscription.status === 'active' ? 'secondary' : 'destructive'} className="capitalize">{subscription.status}</Badge>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">Votre abonnement est valide jusqu'au <strong className="font-semibold">{format(new Date(subscription.endDate), 'd MMMM yyyy', {locale: fr})}</strong>.</p>
                        <p className="text-xs text-muted-foreground">Il vous reste {formatDistanceToNow(new Date(subscription.endDate), {locale: fr})}.</p>
                    </CardContent>
                </Card>
            )}

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

            {subscription?.plan === 'Pro' && (
              <Card>
                <CardHeader>
                    <CardTitle>Modules Complémentaires</CardTitle>
                    <CardDescription>
                        Activez des fonctionnalités additionnelles pour votre établissement. 
                        La facturation sera ajustée en conséquence.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {MODULES_CONFIG.map(module => {
                        const Icon = module.icon;
                        const isChecked = subscription?.activeModules?.includes(module.id);
                        const isDisabled = isUpdating;

                        return (
                             <div key={module.id} className={cn("flex items-center justify-between rounded-lg border p-4", isDisabled && "opacity-50")}>
                                <div className="space-y-0.5">
                                    <Label htmlFor={module.id} className="text-base flex items-center gap-2">
                                        <Icon className="h-5 w-5 text-primary" />
                                        {module.name}
                                    </Label>
                                    <div className="text-xs text-muted-foreground">{module.desc}</div>
                                    <div className="text-sm font-semibold">{module.price.toLocaleString('fr-FR')} CFA/mois</div>
                                </div>
                                <Switch
                                    id={module.id}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => handleModuleToggle(module.id, checked)}
                                    disabled={isDisabled}
                                />
                            </div>
                        )
                    })}
                </CardContent>
                 {isUpdating && (
                    <CardFooter>
                       <div className="flex items-center text-sm text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                            Mise à jour des modules...
                        </div>
                    </CardFooter>
                )}
              </Card>
            )}
        </div>
    )
}
