
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
    pricePerStudent?: number;
    storageLimitGB: number;
}

export const SUBSCRIPTION_PLANS: PlanData[] = [
    {
        name: "Essentiel",
        price: 0,
        priceString: "Gratuit",
        priceSuffix: "",
        description: "Idéal pour évaluer toutes les fonctionnalités avec des limites généreuses.",
        features: [
            "Gestion de base (élèves, classes, notes)",
            "Accès aux modules complémentaires (payants)",
            "Support communautaire",
        ],
        limits: [
            { icon: Users, text: "Jusqu'à 50 élèves" },
            { icon: Building, text: "Jusqu'à 5 cycles" },
        ],
        cta: "Démarrer gratuitement",
        variant: "secondary",
        pricePerStudent: 0,
        storageLimitGB: 1
    },
    {
        name: "Pro", // On garde le nom interne 'Pro' pour éviter de casser le typage existant, mais on l'affiche comme 'Standard' si besoin, ou on renomme. Gardons 'Pro' pour l'instant pour la compatibilité.
        price: 0, // Base price is 0, cost is per student
        priceString: "200 FCFA",
        priceSuffix: "/ élève / mois",
        description: "Pour les écoles en croissance. Payez uniquement pour ce que vous utilisez.",
        features: [
            "Toutes les fonctionnalités Essentiel",
            "Accès aux modules complémentaires (payants)",
            "Support prioritaire par email",
            "Facturation ajustée au nombre d'élèves"
        ],
        limits: [
            { icon: Users, text: "Élèves illimités" },
            { icon: Building, text: "Cycles illimités" },
        ],
        cta: "Choisir le plan Standard",
        variant: "default",
        recommended: true,
        pricePerStudent: 200,
        storageLimitGB: 10
    },
    {
        name: "Premium",
        price: 0, // Base price 0
        priceString: "500 FCFA",
        priceSuffix: "/ élève / mois",
        description: "La solution complète tout inclus pour une tranquillité d'esprit.",
        features: [
            "Toutes les fonctionnalités Standard",
            "Tous les modules complémentaires INCLUS",
            "Analyses et rapports avancés",
            "Support dédié par téléphone",
        ],
        limits: [
            { icon: Users, text: "Élèves illimités" },
            { icon: Building, text: "Cycles illimités" },
        ],
        cta: "Choisir le Premium",
        variant: "secondary",
        pricePerStudent: 500,
        storageLimitGB: Infinity
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
    const modData = MODULES_CONFIG.find(m => m.id === moduleId);
    if (!modData) throw new Error(`Module inconnu: ${moduleId}`);
    return modData.price;
}
