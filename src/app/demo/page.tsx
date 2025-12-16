
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  School, Users, BookOpen, Clock, Sparkles, PlayCircle, Eye, Zap, Loader2,
  LucideProps,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// --- Constants ---
const DEMO_TEMPLATES = [
  { id: 'primary_school', name: 'École Primaire', description: 'Découvrez la gestion complète d\'une école primaire', features: ['Gestion des élèves', 'Notes et bulletins', 'Cantine scolaire', 'Communication parents'], students: 120, teachers: 8, color: 'blue' },
  { id: 'high_school', name: 'Lycée', description: 'Solution avancée pour établissement secondaire', features: ['Gestion des notes', 'Emploi du temps', 'Transport scolaire', 'Internat', 'Comptabilité'], students: 450, teachers: 35, color: 'purple' },
  { id: 'international_school', name: 'École Internationale', description: 'Gestion multilingue et multicampus', features: ['Multi-langues', 'Multi-devises', 'Gestion RH', 'Analytics avancés'], students: 800, teachers: 65, color: 'green' }
];

const FEATURES_TO_SHOWCASE = [
  { icon: Users, title: 'Gestion élèves', desc: 'Dossiers complets, historique, famille' },
  { icon: BookOpen, title: 'Pédagogie', desc: 'Notes, bulletins, compétences' },
  { icon: Utensils, title: 'Vie scolaire', desc: 'Cantine, transport, internat' },
  { icon: Building, title: 'Administration', desc: 'Finances, RH, documents' },
];

const TEMPLATE_COLORS: { [key: string]: string } = {
  blue: 'text-blue-500',
  purple: 'text-purple-500',
  green: 'text-green-500',
};

// --- Mock API Layer ---
async function createDemoAccount(options: { template: string; visitorEmail?: string; duration: number; }) {
  console.log("Creating demo account with options:", options);
  await new Promise(resolve => setTimeout(resolve, 1500)); 
  return { id: `demo_${Math.random().toString(36).substring(2, 10)}` };
}

async function generateDemoLoginUrl(demoId: string) {
    return `/demo/login/${demoId}`;
}
// --- End Mock API Layer ---

// --- Sub-components ---
const FeatureCard = ({ icon: Icon, title, desc }: { icon: React.ElementType<LucideProps>, title: string, desc: string }) => (
    <Card className="text-center">
        <CardContent className="pt-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4"><Icon className="h-6 w-6 text-primary" /></div>
            <h3 className="font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
        </CardContent>
    </Card>
);

const TemplateCard = ({ template, isSelected, onSelect }: { template: typeof DEMO_TEMPLATES[0], isSelected: boolean, onSelect: () => void }) => (
    <Card className={cn("cursor-pointer transition-all hover:scale-[1.02]", isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md')} onClick={onSelect}>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className={cn("flex items-center gap-2", TEMPLATE_COLORS[template.color] || 'text-primary')}><School className="h-5 w-5" />{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                </div>
                {isSelected && <Badge variant="default">Sélectionné</Badge>}
            </div>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                <div className="flex justify-between text-sm"><div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>{template.students} élèves</span></div><div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /><span>{template.teachers} enseignants</span></div></div>
                <div className="space-y-2">{template.features.map((feature, index) => (<div key={index} className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-primary" /><span className="text-sm">{feature}</span></div>))}</div>
            </div>
        </CardContent>
    </Card>
);


// --- Main Component ---
export default function DemoLandingPage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState('primary_school');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateDemo = async () => {
    setIsCreating(true);
    try {
      const demoAccount = await createDemoAccount({ template: selectedTemplate, visitorEmail: visitorEmail || undefined, duration: 7 * 24 * 60 * 60 * 1000 });
      const demoLoginUrl = await generateDemoLoginUrl(demoAccount.id);
      router.push(demoLoginUrl);
    } catch (error) {
      console.error('Error creating demo:', error);
      setIsCreating(false);
    }
  };

  const handleQuickDemo = () => router.push('/demo/login/instant-demo-id');

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge className="mb-4 px-4 py-1 bg-primary/10 text-primary border-primary/20"><Sparkles className="mr-2 h-3 w-3" />VERSION DÉMONSTRATION</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Découvrez la puissance de notre <span className="text-primary">solution scolaire</span></h1>
          <p className="text-xl text-muted-foreground mb-8">Explorez toutes les fonctionnalités avec des données fictives. Aucune configuration requise.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" onClick={handleQuickDemo} className="gap-2"><PlayCircle className="h-5 w-5" />Démo instantanée (2 min)</Button>
            <Button size="lg" variant="outline" onClick={() => document.getElementById('full-demo')?.scrollIntoView()}><Eye className="h-5 w-5 mr-2" />Voir la démo complète</Button>
          </div>
        </div>

        <div id="full-demo" className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Choisissez votre modèle d'établissement</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {DEMO_TEMPLATES.map(template => <TemplateCard key={template.id} template={template} isSelected={selectedTemplate === template.id} onSelect={() => setSelectedTemplate(template.id)} />)}
          </div>
          
          <Card className="max-w-2xl mx-auto">
            <CardHeader><CardTitle>Accédez à la démo complète</CardTitle><CardDescription>Recevez un accès de 7 jours par email pour explorer toutes les fonctionnalités.</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div><Label htmlFor="email">Votre email professionnel</Label><Input id="email" type="email" placeholder="vous@etablissement.com" value={visitorEmail} onChange={(e) => setVisitorEmail(e.target.value)} className="mt-2" /><p className="text-sm text-muted-foreground mt-2">Nous vous enverrons un lien d'accès et des informations complémentaires.</p></div>
                <div className="bg-muted p-4 rounded-lg"><div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4" /><span className="font-medium">Ce que vous allez découvrir :</span></div><ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">{['Tableau de bord interactif', 'Gestion complète des élèves', 'Module financier détaillé', 'Communication parents', 'Rapports et analytics', 'Gestion transport/cantine'].map((item, index) => (<li key={index} className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-primary" />{item}</li>))}</ul></div>
                <Button size="lg" className="w-full gap-2" onClick={handleCreateDemo} disabled={isCreating}>{isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}{isCreating ? 'Création de votre démo...' : 'Créer ma démo gratuite'}</Button>
                <p className="text-center text-sm text-muted-foreground">Aucune carte de crédit requise • Expire automatiquement après 7 jours</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Fonctionnalités à découvrir</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES_TO_SHOWCASE.map((feature, index) => <FeatureCard key={index} {...feature} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
