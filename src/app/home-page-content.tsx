'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '@/firebase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
  Users, BookOpen, BarChart, CheckCircle, School, 
  Shield, Calendar, MessageSquare, CreditCard, 
  Cloud, Smartphone, Globe, TrendingUp,
  ChevronRight, Star, Check
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function HomePageContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error('Erreur récupération données:', error);
        }
      } else {
        setUserData(null)
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    
    if (user) {
      if (userData?.schoolId) {
        router.replace('/dashboard');
      } else {
        router.replace('/onboarding');
      }
    }
  }, [user, userData, loading, router]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading || user) {
    return <LoadingScreen />;
  }

  const features = [
    {
      icon: Users,
      title: "Gestion des élèves",
      description: "Suivez les inscriptions, informations personnelles, parcours scolaires et historique complet de chaque élève.",
      color: "text-blue-600 bg-blue-50"
    },
    {
      icon: BookOpen,
      title: "Notes & Évaluations",
      description: "Saisie simplifiée des notes, génération automatique de bulletins, suivi des performances et statistiques détaillées.",
      color: "text-green-600 bg-green-50"
    },
    {
      icon: CreditCard,
      title: "Gestion financière",
      description: "Suivez les paiements, générez des factures, gérez les frais de scolarité et les remises avec des rapports financiers complets.",
      color: "text-purple-600 bg-purple-50"
    },
    {
      icon: Calendar,
      title: "Emplois du temps",
      description: "Créez et gérez les emplois du temps, les absences, les retards et les événements scolaires en quelques clics.",
      color: "text-orange-600 bg-orange-50"
    },
    {
      icon: MessageSquare,
      title: "Communication",
      description: "Messagerie intégrée, notifications automatiques, annonces aux parents et communication avec le personnel.",
      color: "text-pink-600 bg-pink-50"
    },
    {
      icon: BarChart,
      title: "Analyses & Rapports",
      description: "Tableaux de bord personnalisables, analyses de performance, rapports détaillés et indicateurs clés en temps réel.",
      color: "text-cyan-600 bg-cyan-50"
    }
  ];

  const testimonials = [
    {
      name: "Marc Dupont",
      role: "Directeur, Lycée Les Lauréats",
      content: "GèreEcole a révolutionné la gestion de notre établissement. Gain de temps considérable et communication améliorée avec les parents.",
      avatar: "MD"
    },
    {
      name: "Sophie Martin",
      role: "Secrétaire, École Primaire du Soleil",
      content: "L'interface est intuitive et toutes les fonctionnalités dont nous avons besoin sont là. Un outil indispensable !",
      avatar: "SM"
    },
    {
      name: "Jean Leroy",
      role: "Comptable, Collège Saint-Exupéry",
      content: "La gestion financière est simplifiée à l'extrême. Les rapports automatiques nous font gagner des heures chaque semaine.",
      avatar: "JL"
    }
  ];

  const pricingPlans = [
    {
        name: "Essentiel",
        price: "Gratuit",
        period: "à vie",
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
        highlighted: true
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

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className={cn(
        "sticky top-0 z-50 w-full border-b transition-all duration-200",
        scrolled 
          ? "bg-white/95 backdrop-blur-lg shadow-sm border-gray-200" 
          : "bg-transparent border-transparent"
      )}>
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <School className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                GèreEcole
              </span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">
                Fonctionnalités
              </Link>
              <Link href="#pricing" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">
                Tarifs
              </Link>
              <Link href="#testimonials" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">
                Témoignages
              </Link>
              <Link href="/contact" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">
                Contact
              </Link>
            </nav>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.push('/auth/login')}>
                Se connecter
              </Button>
              <Button onClick={() => router.push('/onboarding/create-school')}>
                Essai gratuit
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="container relative mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 px-4 py-1.5 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 mr-2" />
              +500 établissements nous font confiance
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              La gestion scolaire
              <span className="block mt-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                réinventée
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto">
              La plateforme tout-en-un pour gérer votre établissement scolaire efficacement. 
              <span className="font-semibold text-gray-900"> Gagnez du temps, améliorez la communication et prenez de meilleures décisions.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button 
                size="lg" 
                onClick={() => router.push('/onboarding/create-school')}
                className="px-10 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <span>Commencer gratuitement</span>
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => router.push('/contact')}
                className="px-10 py-6 text-lg font-semibold rounded-xl border-2"
              >
                Demander une démo
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {[
                { label: "Gratuit à démarrer", icon: Check },
                { label: "Sécurisé & conforme", icon: Shield },
                { label: "Accessible partout", icon: Smartphone },
                { label: "Support français", icon: Globe }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-center space-x-2">
                  <div className="rounded-full bg-green-100 p-1">
                    <item.icon className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Une plateforme tout-en-un
            </h2>
            <p className="text-xl text-gray-600">
              Tous les outils dont vous avez besoin, connectés et centralisés.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                <CardHeader>
                  <div className={`inline-flex p-3 rounded-xl ${feature.color} mb-4`}>
                    <feature.icon className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ce que disent nos utilisateurs
            </h2>
            <p className="text-xl text-gray-600">
              Découvrez comment GèreEcole transforme la gestion des établissements scolaires
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <Avatar className="h-12 w-12 mr-4">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {testimonial.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="text-gray-700 italic">"{testimonial.content}"</p>
                  <div className="flex mt-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Des tarifs adaptés à tous
            </h2>
            <p className="text-xl text-gray-600">
              Commencez gratuitement, évoluez selon vos besoins.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={cn(
                "relative border-2 flex flex-col transition-all hover:scale-[1.02]",
                plan.highlighted 
                  ? "border-primary shadow-2xl" 
                  : "border-gray-200 shadow-lg"
              )}>
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="px-4 py-1.5 font-semibold">
                      Recommandé
                    </Badge>
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.priceSuffix && (
                      <span className="text-gray-500 ml-2">{plan.priceSuffix}</span>
                    )}
                  </div>
                  <p className="text-gray-600 mt-2 h-12">{plan.description}</p>
                </CardHeader>
                
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <Check className="mr-2 mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                    <Button 
                        className="w-full py-6 text-lg font-semibold"
                        variant={plan.highlighted ? "default" : "secondary"}
                        onClick={() => router.push('/onboarding/create-school')}
                    >
                        {plan.name === "Entreprise" ? "Nous contacter" : "Commencer"}
                    </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <p className="text-gray-600">
              💡 Tous les plans incluent un essai gratuit de 30 jours.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-primary to-primary/90 rounded-3xl p-12 text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Prêt à simplifier la gestion de votre établissement ?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Rejoignez des centaines d'écoles qui font déjà confiance à GèreEcole.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-primary hover:bg-gray-100 px-10 py-6 text-lg font-semibold"
                onClick={() => router.push('/onboarding/create-school')}
              >
                <span>Commencer gratuitement</span>
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10 px-10 py-6 text-lg font-semibold"
                onClick={() => router.push('/contact')}
              >
                Demander une démo
              </Button>
            </div>
            <p className="mt-6 text-sm opacity-80">
              Aucune carte de crédit requise • Installation en 5 minutes
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <School className="h-8 w-8" />
                <span className="text-xl font-bold">GèreEcole</span>
              </div>
              <p className="text-gray-400">
                La solution moderne pour la gestion scolaire. Simple, sécurisée, efficace.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Produit</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white transition-colors">Fonctionnalités</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Tarifs</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Démo</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Nouveautés</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Ressources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/support" className="hover:text-white transition-colors">Support</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Communauté</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Entreprise</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition-colors">À propos</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Confidentialité</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Conditions</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} GèreEcole. Tous droits réservés.</p>
            <p className="mt-2 text-sm">
              Conçu avec ❤️ pour les établissements scolaires
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}