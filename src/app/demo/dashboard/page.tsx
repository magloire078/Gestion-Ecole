
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  SkipForward, 
  HelpCircle,
  X,
  School,
  Users,
  BookOpen,
  Wallet,
  MessageSquare,
  BarChart3,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DEMO_TOUR_STEPS = [
  { id: 'welcome', title: 'Bienvenue dans votre démo !', description: 'Explorez toutes les fonctionnalités de notre solution scolaire.', target: '#dashboard-header' },
  { id: 'students', title: 'Gestion des élèves', description: 'Consultez les dossiers complets des élèves, notes, présences.', target: '#students-widget' },
  { id: 'academic', title: 'Pédagogie', description: 'Saisissez des notes, générez des bulletins, suivez les compétences.', target: '#grades-widget' },
  { id: 'finance', title: 'Module financier', description: 'Gérez les frais scolaires, les paiements, la comptabilité.', target: '#finance-widget' },
  { id: 'communication', title: 'Communication', description: 'Échangez avec les parents, envoyez des notifications.', target: '#communication-widget' },
  { id: 'analytics', title: 'Analytics avancés', description: 'Tableaux de bord interactifs et rapports personnalisés.', target: '#analytics-widget' }
];

const WIDGETS = [
    { id: 'students-widget', title: 'Élèves', icon: Users, color: 'blue', badgeText: '120', description: 'Gestion complète des dossiers', button1Text: 'Voir tous les élèves', button2Text: 'Simuler une inscription' },
    { id: 'grades-widget', title: 'Pédagogie', icon: BookOpen, color: 'green', badgeText: '450 notes', description: 'Notes, bulletins, compétences', button1Text: 'Saisir des notes fictives', button2Text: 'Générer un bulletin' },
    { id: 'finance-widget', title: 'Finances', icon: Wallet, color: 'amber', badgeText: '85% payés', description: 'Frais, paiements, comptabilité', button1Text: 'Voir les statistiques', button2Text: 'Simuler un paiement' },
];

const SECONDARY_WIDGETS = [
    { id: 'communication-widget', title: 'Communication', icon: MessageSquare, color: 'purple', description: 'Parents, notifications, messages', buttonText: 'Envoyer un message test' },
    { id: 'analytics-widget', title: 'Analytics', icon: BarChart3, color: 'red', description: 'Tableaux de bord interactifs', buttonText: 'Explorer les données' },
    { id: 'settings-widget', title: 'Configuration', icon: Settings, color: 'gray', description: 'Personnalisez l\'application', buttonText: 'Voir les paramètres' },
];


export default function DemoDashboardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isTourActive, setIsTourActive] = useState(true);
  const [timeLeft, setTimeLeft] = useState(7 * 24 * 60 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/demo/expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}j ${hours}h ${minutes}m`;
  };

  const handleSkipTour = () => setIsTourActive(false);
  const handleNextStep = () => currentStep < DEMO_TOUR_STEPS.length - 1 ? setCurrentStep(prev => prev + 1) : setIsTourActive(false);
  const handlePrevStep = () => currentStep > 0 && setCurrentStep(prev => prev - 1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-background">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 dark:bg-background/80">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2"><School className="h-6 w-6 text-primary" /><span className="font-bold text-lg">École Démo Modèle</span><Badge variant="outline" className="ml-2">VERSION DÉMO</Badge></div>
            <div className="hidden md:flex items-center gap-6"><div className="text-sm"><div className="text-muted-foreground">Temps restant</div><div className="font-semibold">{formatTime(timeLeft)}</div></div><div className="text-sm"><div className="text-muted-foreground">Élèves fictifs</div><div className="font-semibold">120</div></div></div>
          </div>
          <div className="flex items-center gap-3"><Button variant="outline" size="sm" onClick={() => setIsTourActive(true)} className="gap-2"><HelpCircle className="h-4 w-4" />Visite guidée</Button><Button size="sm" onClick={() => router.push('/demo/contact')}>Contact commercial</Button></div>
        </div>
      </header>

      {isTourActive && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-in fade-in-50">
          <Card className="relative w-full max-w-lg mx-4">
            <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7" onClick={handleSkipTour}><X className="h-4 w-4" /></Button>
            <CardHeader><CardTitle>{DEMO_TOUR_STEPS[currentStep].title}</CardTitle><CardDescription>{DEMO_TOUR_STEPS[currentStep].description}</CardDescription></CardHeader>
            <CardContent>
              <div className="mb-4"><Progress value={(currentStep + 1) / DEMO_TOUR_STEPS.length * 100} className="h-2" /><div className="flex justify-between text-sm text-muted-foreground mt-2"><span>Étape {currentStep + 1} sur {DEMO_TOUR_STEPS.length}</span><span>{Math.round((currentStep + 1) / DEMO_TOUR_STEPS.length * 100)}%</span></div></div>
              <div className="flex justify-between"><Button variant="outline" onClick={handlePrevStep} disabled={currentStep === 0}>Précédent</Button><div className="flex gap-2"><Button variant="outline" onClick={handleSkipTour}>Passer la visite</Button><Button onClick={handleNextStep} className="gap-2">{currentStep === DEMO_TOUR_STEPS.length - 1 ? 'Terminer' : <>Suivant <SkipForward className="h-4 w-4" /></>}</Button></div></div>
            </CardContent>
          </Card>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        <div id="dashboard-header" className="mb-8"><h1 className="text-3xl font-bold mb-2">Bienvenue dans votre démonstration</h1><p className="text-muted-foreground">Explorez toutes les fonctionnalités avec des données fictives. Cliquez, testez, expérimentez !</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {WIDGETS.map((widget, index) => (
             <Card key={widget.id} id={widget.id} className={cn("cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1", isTourActive && currentStep === index + 1 && "ring-2 ring-primary")}>
              <CardHeader><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-primary">{React.createElement(widget.icon, {className: "h-5 w-5"})} {widget.title}</CardTitle><Badge variant="secondary">{widget.badgeText}</Badge></div><CardDescription>{widget.description}</CardDescription></CardHeader>
              <CardContent><div className="space-y-2"><Button className="w-full" onClick={() => router.push(`/demo/${widget.title.toLowerCase()}`)}>{widget.button1Text}</Button><Button variant="outline" className="w-full">{widget.button2Text}</Button></div></CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           {SECONDARY_WIDGETS.map((widget, index) => (
             <Card key={widget.id} id={widget.id} className={cn("cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1", isTourActive && currentStep === index + 4 && "ring-2 ring-primary")}>
                <CardHeader><CardTitle className="flex items-center gap-2 text-primary">{React.createElement(widget.icon, {className: "h-5 w-5"})} {widget.title}</CardTitle><CardDescription>{widget.description}</CardDescription></CardHeader>
                <CardContent><Button className="w-full" onClick={() => router.push(`/demo/${widget.title.toLowerCase()}`)}>{widget.buttonText}</Button></CardContent>
            </Card>
           ))}
        </div>

        <Card className="mb-8 bg-primary/5 border-primary/20">
          <CardContent className="pt-6"><div className="flex flex-col md:flex-row justify-between items-center gap-4"><div><h3 className="font-semibold text-lg">Prêt à passer à la version complète ?</h3><p className="text-muted-foreground">Nos commerciaux sont disponibles pour une démonstration personnalisée.</p></div><div className="flex gap-3"><Button variant="outline" onClick={() => router.push('/demo/features')}>Voir toutes les fonctionnalités</Button><Button onClick={() => router.push('/demo/contact')}>Demander un devis</Button></div></div></CardContent>
        </Card>
      </main>
    </div>
  );
}
