
'use client';

import { Check, ArrowRight, PlayCircle, FileText, Users, Wallet, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import placeholderImages from '@/lib/placeholder-images.json';


const featureCategories = [
    {
        title: "Pédagogie & Élèves",
        icon: Users,
        features: ["Dossiers élèves complets", "Gestion des notes & bulletins", "Emploi du temps", "Suivi des absences"]
    },
    {
        title: "Finances & Administration",
        icon: Wallet,
        features: ["Suivi de la scolarité", "Facturation & Reçus", "Gestion multi-établissements", "Comptabilité générale"]
    },
     {
        title: "Vie Scolaire Intégrée",
        icon: Users,
        features: ["Gestion de la cantine", "Suivi du transport scolaire", "Administration de l'internat", "Activités parascolaires"]
    },
    {
        title: "Infrastructures & RH",
        icon: Briefcase,
        features: ["Gestion des bâtiments & salles", "Inventaire du matériel", "Suivi de la maintenance", "Rôles & Permissions"]
    }
];

const plans = [
    {
        name: "Essentiel",
        price: "Gratuit",
        description: "Idéal pour évaluer la plateforme avec des limites généreuses.",
        features: [
            "Gestion de base (élèves, classes, notes)",
            "Accès à tous les modules complémentaires",
            "Jusqu'à 50 élèves & 5 cycles",
            "Support communautaire",
        ],
        cta: "Démarrer gratuitement",
        variant: "secondary"
    },
    {
        name: "Pro",
        price: "49 900 CFA",
        priceSuffix: "/mois",
        description: "Pour les écoles en croissance avec des besoins avancés.",
        features: [
            "Toutes les fonctionnalités Essentiel",
            "Jusqu'à 250 élèves",
            "Modules complémentaires en option",
            "Support prioritaire par email",
        ],
        cta: "Passer au plan Pro",
        variant: "default",
        recommended: true
    },
    {
        name: "Premium",
        price: "99 900 CFA",
        priceSuffix: "/mois",
        description: "La solution complète pour les grands établissements.",
        features: [
            "Toutes les fonctionnalités Pro",
            "Élèves et cycles illimités",
            "Tous les modules complémentaires inclus",
            "Support dédié par téléphone",
        ],
        cta: "Choisir le Premium",
        variant: "secondary"
    }
];


export function LandingPageV2() {
  const router = useRouter();

  return (
    <div className="bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-20 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <Image src={placeholderImages.mainAppLogo} alt="GèreEcole Logo" width={56} height={56} className="object-contain" data-ai-hint="app logo" />
              <span className="font-bold text-lg">GèreEcole</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <nav className="flex items-center">
              <Button variant="ghost" asChild>
                <Link href="/contact">Contact</Link>
              </Button>
              <Button onClick={() => router.push('/auth/login')}>Se connecter</Button>
            </nav>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-12 text-center">
          <div className="container">
            <Badge variant="outline" className="mb-4 text-primary border-primary/30">La solution complète pour les groupes scolaires</Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              Gérez vos établissements <br />
              <span className="text-primary">avec simplicité et puissance.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              De l'inscription des élèves à la gestion de la paie, GèreEcole centralise tous les aspects de votre administration pour un ou plusieurs établissements.
            </p>
            <div className="mt-8 flex justify-center gap-4">
               <Button size="lg" asChild>
                <Link href="/contact" className="gap-2">
                  <PlayCircle className="h-5 w-5" />Demander une Démo
                </Link>
              </Button>
              <Button size="lg" variant="outline" onClick={() => router.push('/onboarding')}>
                Commencer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
             <div className="mt-12">
              <Image
                src={placeholderImages.heroImage}
                alt="GèreEcole - Application de gestion scolaire"
                width={900}
                height={600}
                className="rounded-xl shadow-2xl mx-auto"
                priority
                data-ai-hint="school children app"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 bg-muted/40">
          <div className="container">
            <div className="text-center">
              <h2 className="text-3xl font-bold">Une plateforme tout-en-un</h2>
              <p className="mt-2 text-muted-foreground">
                Tous les outils dont vous avez besoin, connectés et centralisés.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              {featureCategories.map((category) => (
                <Card key={category.title} className="flex flex-col">
                   <CardHeader className="flex-row items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/10">
                            <category.icon className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{category.title}</CardTitle>
                    </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {category.features.map((feature) => (
                        <li key={feature} className="flex items-start">
                          <Check className="mr-2 mt-1 h-4 w-4 flex-shrink-0 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        
        {/* Pricing Section */}
        <section id="pricing" className="py-16">
            <div className="container">
                 <div className="text-center">
                    <h2 className="text-3xl font-bold">Un tarif adapté à chaque école</h2>
                    <p className="mt-2 text-muted-foreground">
                        Choisissez le plan qui grandit avec votre établissement.
                    </p>
                </div>
                <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
                    {plans.map((plan) => (
                        <Card key={plan.name} className={cn("flex flex-col", plan.recommended && "border-2 border-primary shadow-2xl")}>
                             {plan.recommended && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Recommandé</Badge>}
                            <CardHeader>
                                <CardTitle>{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-6">
                                <div className="text-4xl font-bold">
                                    {plan.price}
                                    {plan.priceSuffix && <span className="text-lg font-normal text-muted-foreground">{plan.priceSuffix}</span>}
                                </div>
                                <ul className="space-y-3">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start">
                                            <Check className="mr-2 mt-1 h-4 w-4 text-emerald-500" />
                                            <span className="text-sm text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" variant={plan.variant as any} onClick={() => router.push('/onboarding')}>{plan.cta}</Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </section>

        {/* Survey CTA Section */}
        <section id="survey-cta" className="py-16 bg-muted/40">
          <div className="container text-center">
            <FileText className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-4 text-3xl font-bold">
              Votre avis est précieux
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Aidez-nous à construire la meilleure solution pour votre établissement en répondant à notre courte enquête. Cela ne vous prendra que quelques minutes.
            </p>
            <div className="mt-6">
              <Button asChild size="lg">
                <Link href="/survey">
                  Participer à l'enquête
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
             <Image src={placeholderImages.mainAppLogo} alt="GèreEcole Logo" width={24} height={24} className="object-contain" data-ai-hint="app logo"/>
            <span>© {new Date().getFullYear()} GèreEcole. Tous droits réservés.</span>
          </div>
          <nav className="flex gap-4">
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary">Contact</Link>
            <Link href="/survey" className="text-sm text-muted-foreground hover:text-primary">Enquête</Link>
             <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-primary">Connexion</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
