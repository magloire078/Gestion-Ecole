'use client';

import React, { useState, useEffect } from 'react';
import { Check, ArrowRight, PlayCircle, FileText, Users, Wallet, Briefcase, Rocket, Star, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Logo } from './logo';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';
import { motion, AnimatePresence } from 'framer-motion';

const featureCategories = [
  {
    title: "Pédagogie & Élèves",
    icon: Users,
    color: "bg-blue-500/10 text-blue-600",
    features: ["Dossiers élèves complets", "Gestion des notes & bulletins", "Emploi du temps", "Suivi des absences"]
  },
  {
    title: "Finances & Administration",
    icon: Wallet,
    color: "bg-emerald-500/10 text-emerald-600",
    features: ["Suivi de la scolarité", "Facturation & Reçus", "Gestion multi-établissements", "Comptabilité générale"]
  },
  {
    title: "Vie Scolaire Intégrée",
    icon: Star,
    color: "bg-amber-500/10 text-amber-600",
    features: ["Gestion de la cantine", "Suivi du transport scolaire", "Administration de l'internat", "Activités parascolaires"]
  },
  {
    title: "Infrastructures & RH",
    icon: Briefcase,
    color: "bg-purple-500/10 text-purple-600",
    features: ["Gestion des bâtiments & salles", "Inventaire du matériel", "Suivi de la maintenance", "Rôles & Permissions"]
  }
];

const heroImages = [
  "/custom-assets/home-hero.jpg?v=3",
  "/custom-assets/home-hero2.png?v=3",
  "/custom-assets/home-hero3.png?v=3",
];

export function LandingPageV2() {
  const router = useRouter();
  const [currentHero, setCurrentHero] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHero((prev) => (prev + 1) % heroImages.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-premium min-h-screen transition-colors duration-500 overflow-x-hidden">
      {/* Abstract 3D Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[-5%] w-64 h-64 bg-primary/10 rounded-full blur-3xl floating" />
        <div className="absolute bottom-[20%] right-[-5%] w-96 h-96 bg-blue-400/10 rounded-full blur-3xl floating-delayed" />
        <div className="absolute top-[40%] right-[10%] w-32 h-32 bg-cyan-400/5 rounded-full blur-2xl floating" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-auto py-4 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2 transition-transform hover:scale-105">
              <Logo disableLink />
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <nav className="flex items-center gap-2">
              <Button variant="ghost" asChild className="hover:bg-primary/10 transition-colors">
                <Link href="/contact">Contact</Link>
              </Button>
              <Button
                onClick={() => router.push('/auth/login')}
                className="bg-[#2D9CDB] hover:bg-[#2D9CDB]/90 text-white shadow-lg shadow-blue-500/20 px-6"
              >
                Se connecter
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-20 pb-12 text-center overflow-hidden">
          <div className="container relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Badge variant="outline" className="mb-6 px-4 py-1 text-primary border-primary/30 bg-primary/5 backdrop-blur-sm">
                <Rocket className="w-3 h-3 mr-2" />
                La solution complète pour les groupes scolaires
              </Badge>
              <h1 className="text-5xl font-black tracking-tight md:text-7xl text-[#0C365A] dark:text-white leading-[1.1]">
                Gérez vos établissements <br />
                <span className="text-primary italic relative">
                  avec simplicité et puissance.
                  <span className="absolute bottom-1 left-0 w-full h-3 bg-primary/10 -z-10 -rotate-1" />
                </span>
              </h1>
              <p className="mx-auto mt-8 max-w-2xl text-xl text-muted-foreground px-4 leading-relaxed">
                De l&apos;inscription des élèves à la gestion de la paie, GèreEcole centralise tous les aspects de votre administration pour un ou plusieurs établissements.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Button size="lg" asChild className="bg-[#0C365A] hover:bg-[#0C365A]/90 text-white shadow-xl shadow-blue-900/20 px-8 h-14">
                  <Link href="/contact" className="gap-2">
                    <PlayCircle className="h-5 w-5" />Demander une Démo
                  </Link>
                </Button>
                <Button size="lg" variant="outline" onClick={() => router.push('/onboarding')} className="border-[#2D9CDB] text-[#2D9CDB] hover:bg-[#2D9CDB]/10 px-8 h-14 backdrop-blur-sm">
                  Commencer l&apos;aventure
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </div>

          <div className="mt-20 perspective-1000 w-full max-w-[1400px] mx-auto px-4 md:px-8">
            <motion.div
              initial={{ opacity: 0, rotateX: 10, y: 40 }}
              animate={{ opacity: 1, rotateX: 0, y: 0 }}
              transition={{ delay: 0.4, duration: 1 }}
              className="relative rounded-3xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.2)] bg-card floating aspect-[16/9] md:aspect-[21/9]"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentHero}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  <Image
                    src={heroImages[currentHero]}
                    alt={`GèreEcole - Interface de gestion scolaire ${currentHero + 1}`}
                    fill
                    className="object-cover transition-transform duration-[8s] hover:scale-110"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0C365A]/50 via-transparent to-transparent pointer-events-none" />
                </motion.div>
              </AnimatePresence>

              {/* Slider Dots */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {heroImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentHero(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      currentHero === i ? "w-8 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
                    )}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-muted/40 -z-10 skew-y-3 origin-right scale-110" />
          <div className="container">
            <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center mb-20">
              <h2 className="text-4xl font-black tracking-tight sm:text-5xl text-[#0C365A] dark:text-white">
                Une architecture modulaire <br /> pour tous vos besoins
              </h2>
              <div className="w-20 h-1.5 bg-primary rounded-full" />
              <p className="max-w-[85%] leading-normal text-muted-foreground text-lg sm:leading-7 mt-4">
                Tous les outils dont vous avez besoin, connectés et centralisés au sein d&apos;une interface fluide et moderne.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 px-4">
              {featureCategories.map((category, index) => (
                <motion.div
                  key={category.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="flex flex-col h-full glass-card group hover:scale-[1.02] transition-all duration-500 overflow-hidden relative border-white/20">
                    <CardHeader className="flex-row items-center gap-4 relative z-10">
                      <div className={cn("p-4 rounded-2xl shadow-inner transition-transform group-hover:rotate-12 duration-300", category.color)}>
                        <category.icon className="h-7 w-7" />
                      </div>
                      <CardTitle className="text-xl font-bold text-[#0C365A] dark:text-white group-hover:text-primary transition-colors">
                        {category.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 relative z-10">
                      <ul className="space-y-3 text-base text-muted-foreground">
                        {category.features.map((feature) => (
                          <li key={feature} className="flex items-start group/item">
                            <div className="mr-3 mt-1.5 h-2 w-2 rounded-full bg-primary/40 group-hover/item:scale-150 group-hover/item:bg-primary transition-all" />
                            <span className="group-hover/item:text-foreground transition-colors">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 relative overflow-hidden">
          <div className="container relative z-10">
            <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center mb-20">
              <h2 className="text-4xl font-black tracking-tight sm:text-5xl text-[#0C365A] dark:text-white">
                Un tarif adapté à chaque école
              </h2>
              <p className="max-w-[85%] leading-normal text-muted-foreground text-lg sm:leading-7">
                Choisissez le plan qui grandit avec votre établissement, sans frais cachés.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:max-w-6xl mx-auto px-4">
              {SUBSCRIPTION_PLANS.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex"
                >
                  <Card className={cn(
                    "flex flex-col relative w-full transition-all duration-500 group border-white/20",
                    plan.recommended
                      ? "border-primary shadow-[0_20px_60px_rgba(45,156,219,0.25)] scale-[1.05] z-10 glass-card bg-primary/5"
                      : "hover:shadow-2xl hover:-translate-y-2"
                  )}>
                    {plan.recommended && (
                      <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary px-6 py-1.5 shadow-lg animate-pulse uppercase tracking-widest text-[10px] font-black">
                        Recommandé
                      </Badge>
                    )}
                    <CardHeader className="pt-10">
                      <CardTitle className="text-2xl font-black text-[#0C365A] dark:text-white uppercase tracking-tight">{plan.name}</CardTitle>
                      <CardDescription className="text-base min-h-[3rem]">{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-8 pb-8">
                      <div className="flex items-baseline text-4xl font-black text-[#0C365A] dark:text-white">
                        {plan.priceString}
                        {plan.priceSuffix && <span className="text-lg font-medium text-muted-foreground ml-1">{plan.priceSuffix}</span>}
                      </div>
                      <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
                      <ul className="space-y-4">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start">
                            <div className="p-0.5 rounded-full bg-emerald-500/10 mr-3 mt-1">
                              <Check className="h-4 w-4 text-emerald-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground leading-tight">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter className="pb-10 pt-2">
                      <Button
                        className={cn(
                          "w-full h-14 text-base font-bold transition-all shadow-lg",
                          plan.recommended
                            ? "bg-[#2D9CDB] hover:bg-[#2D9CDB]/90 text-white shadow-blue-500/30"
                            : "bg-white dark:bg-slate-900 border-[#2D9CDB]/20 text-[#2D9CDB] hover:bg-[#2D9CDB]/10"
                        )}
                        variant={plan.recommended ? "default" : "outline"}
                        onClick={() => router.push('/onboarding')}
                      >
                        {plan.cta}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-24 bg-[#0C365A] text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />
          <div className="container text-center relative z-10">
            <h2 className="text-4xl md:text-6xl font-black mb-8">Prêt à moderniser <br />votre établissement ?</h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-12">Rejoignez les dizaines d&apos;écoles qui font confiance à GéreEcole pour leur transformation digitale.</p>
            <Button size="lg" className="bg-[#2D9CDB] hover:bg-[#2D9CDB]/90 text-white px-12 h-16 text-lg font-bold rounded-2xl shadow-2xl shadow-blue-500/40">
              Commencer maintenant
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-16 bg-background relative z-10">
        <div className="container flex flex-col items-center justify-between gap-10 md:flex-row">
          <div className="flex flex-col items-center md:items-start gap-6">
            <Logo compact />
            <p className="text-sm text-muted-foreground text-center md:text-left max-w-xs">
              La plateforme de gestion scolaire nouvelle génération, conçue pour l&apos;excellence académique et administrative.
            </p>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">© {new Date().getFullYear()} GéreEcole.</span>
          </div>
          <nav className="flex flex-col sm:flex-row gap-8 items-center">
            <Link href="/contact" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Support & Contact</Link>
            <Link href="/auth/login" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Espace Client</Link>
            <Link href="/mentions-legales" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Mentions Légales</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
