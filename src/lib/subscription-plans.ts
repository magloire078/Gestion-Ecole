
import { Users, Building, HeartPulse, Utensils, Bus, Bed, Briefcase, LandPlot, Trophy, LucideIcon } from 'lucide-react';

export type PlanName = 'Essentiel' | 'Pro' | 'Premium';
export type ModuleName = 'sante' | 'cantine' | 'transport' | 'internat' | 'immobilier' | 'activites' | 'rh';

export interface PlanLimit {
    icon: LucideIcon;
    text: string;
}

export interface PlanData {
    name: PlanName;
    price: number;
    priceString: string;
    priceSuffix?: string;
    description: string;
    features: string[];
    limits: PlanLimit[];
    cta: string;
    variant: "default" | "secondary" | "outline" | "ghost" | "link" | "destructive" | null | undefined;
    recommended?: boolean;
}

export const SUBSCRIPTION_PLANS: PlanData[] = [
    {
        name: "Essentiel",
        price: 0,
        priceString: "Gratuit",
        priceSuffix: "pour découvrir",
        description: "Idéal pour évaluer toutes les fonctionnalités avec des limites généreuses.",
        features: [
            "Gestion de base (élèves, classes, notes)",
            "Accès à tous les modules complémentaires",
            "Support communautaire",
        ],
        limits: [
            { icon: Users, text: "Jusqu'à 50 élèves" },
            { icon: Building, text: "Jusqu'à 5 cycles" },
        ],
        cta: "Démarrer gratuitement",
        variant: "secondary"
    },
    {
        name: "Pro",
        price: 49900,
        priceString: "49 900 CFA",
        priceSuffix: "/ mois",
        description: "Pour les écoles en croissance avec des besoins avancés.",
        features: [
            "Toutes les fonctionnalités Essentiel",
            "Accès aux modules complémentaires (payants)",
            "Support prioritaire par email",
        ],
        limits: [
            { icon: Users, text: "Jusqu'à 250 élèves" },
            { icon: Building, text: "Jusqu'à 5 cycles" },
        ],
        cta: "Passer au plan Pro",
        variant: "default",
        recommended: true
    },
    {
        name: "Premium",
        price: 99900,
        priceString: "99 900 CFA",
        priceSuffix: "/ mois",
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
        ],
        cta: "Choisir le Premium",
        variant: "secondary"
    }
];

export interface ModuleConfig {
    id: ModuleName;
    name: string;
    icon: LucideIcon;
    price: number;
    desc: string;
}

export const MODULES_CONFIG: ModuleConfig[] = [
    { id: 'sante', name: 'Santé', icon: HeartPulse, price: 5000, desc: 'Suivi médical, carnet de vaccination...' },
    { id: 'cantine', name: 'Cantine', icon: Utensils, price: 10000, desc: 'Gestion des menus et réservations.' },
    { id: 'transport', name: 'Transport', icon: Bus, price: 10000, desc: 'Suivi de flotte et abonnements.' },
    { id: 'internat', name: 'Internat', icon: Bed, price: 15000, desc: 'Gestion des dortoirs et occupants.' },
    { id: 'rh', name: 'RH & Paie', icon: Briefcase, price: 15000, desc: 'Gestion du personnel et des salaires.' },
    { id: 'immobilier', name: 'Immobilier', icon: LandPlot, price: 10000, desc: 'Inventaire, maintenance, salles.' },
    { id: 'activites', name: 'Activités', icon: Trophy, price: 5000, desc: 'Clubs et compétitions.' },
];

export function getPlanPrice(planName: PlanName, durationMonths: number = 1): number {
    const plan = SUBSCRIPTION_PLANS.find(p => p.name === planName);
    if (!plan) throw new Error(`Plan inconnu: ${planName}`);
    return plan.price * durationMonths;
}

export function getModulePrice(moduleId: ModuleName): number {
    const module = MODULES_CONFIG.find(m => m.id === moduleId);
    if (!module) throw new Error(`Module inconnu: ${moduleId}`);
    return module.price;
}
