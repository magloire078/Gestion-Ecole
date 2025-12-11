

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { 
  School, 
  Globe, 
  Building2, 
  Sparkles,
  Check,
  ArrowRight,
  Users,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { SchoolCreationService } from '@/services/school-creation';

export default function CreateSchoolPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();

  const [step, setStep] = useState('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [schoolData, setSchoolData] = useState({
    name: '',
    type: 'private',
    address: '',
    city: '',
    country: 'Côte d\'Ivoire',
  });
  const [loading, setLoading] = useState(false);

  const templates = [
    {
      id: 'french_primary',
      name: 'Système Ivoirien/Français',
      icon: <School className="w-8 h-8" />,
      description: 'Structure conforme au système éducatif ivoirien et français.',
      features: [
        'Cycles Maternelle à Lycée',
        'Programme Éducation Nationale',
        'Calendrier scolaire standard',
        'Bulletins officiels'
      ],
      stats: { levels: 'TPS à Tle', subjects: '~10', terms: 3 },
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'international',
      name: 'École Internationale',
      icon: <Globe className="w-8 h-8" />,
      description: 'Curriculum international (IB, British, American).',
      features: [
        'Multi-langues',
        'Programme IB/PYP',
        'Calendrier international',
        'Certifications'
      ],
      stats: { levels: 'Nursery à Year 11', subjects: '~12', terms: 2 },
      color: 'from-green-500 to-emerald-600'
    },
    {
      id: 'custom',
      name: 'Personnalisé',
      icon: <Sparkles className="w-8 h-8" />,
      description: 'Créez votre propre structure de A à Z.',
      features: [
        'Structure sur mesure',
        'Cycles personnalisés',
        'Matières définissables',
        'Calendrier flexible'
      ],
      stats: { levels: 'À définir', subjects: 'À définir', terms: 'À définir' },
      color: 'from-amber-500 to-orange-600'
    }
  ];
  
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setTimeout(() => setStep('details'), 300);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !user.uid || !user.email || !user.displayName) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Utilisateur non valide.' });
        return;
    }
    setLoading(true);

    const schoolCreationService = new SchoolCreationService(firestore);
    try {
      const result = await schoolCreationService.createSchool({
        ...schoolData,
        template: selectedTemplate!,
        directorId: user.uid,
        directorName: user.displayName,
        directorEmail: user.email,
        phone: '', // Add other required fields if necessary
        academicYear: '2024-2025',
        language: 'fr',
        currency: 'XOF',
      }, user.uid);
      
      await auth.currentUser?.getIdToken(true); // Force token refresh
      
      toast({
        title: 'École créée avec succès !',
        description: `Le code de votre établissement est : ${result.schoolCode}.`,
        duration: 9000,
      });

      // Redirect to the dashboard, AuthGuard will handle the rest
      window.location.href = '/dashboard';

    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: `La création de l'école a échoué. ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Créer une nouvelle école
          </h1>
          <p className="text-gray-600">
            Choisissez un modèle pour démarrer rapidement.
          </p>
        </div>
        
        {step === 'template' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in-50">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template.id)}
                className={`bg-white rounded-2xl p-6 shadow-sm border-2 hover:shadow-lg transition-all duration-300 text-left ${selectedTemplate === template.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 mb-4 bg-gradient-to-r ${template.color} text-white`}>
                  {template.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-600 mt-1 mb-4">{template.description}</p>
                <ul className="space-y-2 text-sm text-gray-700">
                  {template.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />{feature}</li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        )}
        
        {step === 'details' && (
          <div className="max-w-2xl mx-auto animate-in fade-in-50">
            <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center mb-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 bg-gradient-to-r ${templates.find(t => t.id === selectedTemplate)?.color} text-white`}>
                        {templates.find(t => t.id === selectedTemplate)?.icon}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{templates.find(t => t.id === selectedTemplate)?.name}</h2>
                        <p className="text-gray-600">Renseignez les informations de votre école.</p>
                    </div>
                </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="school-name">Nom de l'établissement *</Label>
                  <Input id="school-name" required value={schoolData.name} onChange={(e) => setSchoolData({...schoolData, name: e.target.value})} placeholder="Ex: École Les Lauréats" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="address">Adresse</Label>
                      <Input id="address" value={schoolData.address} onChange={(e) => setSchoolData({...schoolData, address: e.target.value})} placeholder="Ex: Cocody Angré" />
                    </div>
                    <div>
                      <Label htmlFor="city">Ville</Label>
                      <Input id="city" value={schoolData.city} onChange={(e) => setSchoolData({...schoolData, city: e.target.value})} placeholder="Ex: Abidjan" />
                    </div>
                  </div>
                <div className="flex justify-between mt-8 pt-6 border-t">
                  <Button type="button" variant="ghost" onClick={() => setStep('template')}>← Retour</Button>
                  <Button type="submit" disabled={loading || !schoolData.name || userLoading}>
                    {loading ? 'Création en cours...' : 'Créer mon école'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
