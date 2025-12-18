
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  School, Users, BookOpen, Sparkles, PlayCircle, Eye, Zap, Loader2,
  LucideProps,
  Utensils,
  Building,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Link from 'next/link';


const FEATURES_TO_SHOWCASE = [
  { icon: Users, title: 'Gestion élèves', desc: 'Dossiers complets, historique, famille' },
  { icon: BookOpen, title: 'Pédagogie', desc: 'Notes, bulletins, compétences' },
  { icon: Utensils, title: 'Vie scolaire', desc: 'Cantine, transport, internat' },
  { icon: Building, title: 'Administration', desc: 'Finances, RH, documents' },
];

const FeatureCard = ({ icon: Icon, title, desc }: { icon: React.ElementType<LucideProps>, title: string, desc: string }) => (
    <Card className="text-center">
        <CardContent className="pt-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4"><Icon className="h-6 w-6 text-primary" /></div>
            <h3 className="font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
        </CardContent>
    </Card>
);

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-background">
      <header className="py-4 px-4 sm:px-6">
        <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2 font-bold text-lg">
                <School className="h-6 w-6 text-primary" />
                GèreEcole
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" asChild>
                    <Link href="/demo/contact">Contact</Link>
                </Button>
                <Button asChild>
                    <Link href="/login">Se connecter</Link>
                </Button>
            </div>
        </div>
      </header>
      <main>
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge className="mb-4 px-4 py-1 bg-primary/10 text-primary border-primary/20"><Sparkles className="mr-2 h-3 w-3" />Solution Tout-en-un</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">La plateforme de gestion scolaire <span className="text-primary">intuitive et puissante</span></h1>
            <p className="text-xl text-muted-foreground mb-8">Simplifiez l'administration, optimisez la pédagogie et améliorez la communication au sein de votre établissement.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" asChild>
                <Link href="/demo" className="gap-2">
                  <PlayCircle className="h-5 w-5" />Explorer la Démo
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                 <Link href="/login" className="gap-2">
                    <Zap className="h-5 w-5" />Démarrer
                </Link>
              </Button>
            </div>
          </div>

          <div className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-8">Fonctionnalités Clés</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURES_TO_SHOWCASE.map((feature, index) => <FeatureCard key={index} {...feature} />)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
