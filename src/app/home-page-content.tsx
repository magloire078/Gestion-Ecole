'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase'; // Utilisation du hook centralisé
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, BarChart, CheckCircle, School } from 'lucide-react';
import Link from 'next/link';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function HomePageContent() {
  const router = useRouter();
  const { user, loading, hasSchool } = useUser();
  
  useEffect(() => {
    if (loading) return;
    
    if (user) {
      if (hasSchool) {
        router.replace('/dashboard');
      } else {
        router.replace('/onboarding');
      }
    }
  }, [user, loading, hasSchool, router]);

  // Si on est en cours de chargement ou si un utilisateur est détecté (et donc une redirection est imminente)
  if (loading || user) {
    return <LoadingScreen />;
  }
  
  // Landing page pour les visiteurs non connectés
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
       <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <School className="h-6 w-6 text-primary" />
              <span className="font-bold">GèreEcole</span>
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
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Bienvenue sur
            <span className="block text-primary mt-2">GèreEcole</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            La solution tout-en-un pour la gestion scolaire moderne
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              size="lg"
              onClick={() => router.push('/onboarding/create-school')}
              className="px-8 py-3 text-lg"
            >
              S'inscrire gratuitement
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push('/auth/login')}
              className="px-8 py-3 text-lg"
            >
              Se connecter
            </Button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-12">Tout ce dont vous avez besoin</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Users,
              title: "Gestion des élèves",
              description: "Inscriptions, informations, parcours scolaires"
            },
            {
              icon: BookOpen,
              title: "Notes & Évaluations",
              description: "Saisie des notes, bulletins, suivi des performances"
            },
            {
              icon: BarChart,
              title: "Analyses & Rapports",
              description: "Statistiques détaillées et rapports personnalisés"
            },
            {
              icon: CheckCircle,
              title: "Communication",
              description: "Échanges avec les parents et le personnel"
            }
          ].map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary mb-2" />
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-semibold">GèreEcole</h3>
              <p className="text-sm text-muted-foreground">
                Simplifiez la gestion de votre établissement
              </p>
            </div>
            <div className="flex gap-6">
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary">
                Conditions
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary">
                Confidentialité
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary">
                Contact
              </Link>
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground mt-6">
            © {new Date().getFullYear()} GèreEcole. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
