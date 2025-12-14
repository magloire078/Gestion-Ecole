
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { 
  School, 
  Globe, 
  Sparkles,
  User as UserIcon
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

  const [step, setStep] = useState('details');
  const [schoolData, setSchoolData] = useState({
    name: '',
    address: '',
    city: '',
    country: 'Côte d\'Ivoire',
  });
   const [directorData, setDirectorData] = useState({
    firstName: user?.displayName?.split(' ')[0] || '',
    lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !user.uid || !user.email) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Utilisateur non valide.' });
        return;
    }
    setLoading(true);

    const schoolCreationService = new SchoolCreationService(firestore);
    try {
      const result = await schoolCreationService.createSchool({
        ...schoolData,
        directorId: user.uid,
        directorFirstName: directorData.firstName,
        directorLastName: directorData.lastName,
        directorEmail: user.email,
        phone: '', 
        email: '',
        academicYear: '2024-2025',
        language: 'fr',
        currency: 'XOF',
      }, user.uid);
      
      // Force a token refresh to get the new custom claims
      await auth.currentUser?.getIdToken(true); 
      
      toast({
        title: 'École créée avec succès !',
        description: `Le code de votre établissement est : ${result.schoolCode}. Redirection en cours...`,
        duration: 9000,
      });

      // Use router.push to allow AuthGuard to re-evaluate the user state correctly
      router.push('/dashboard');

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
            Créer votre établissement
          </h1>
          <p className="text-gray-600">
            Renseignez les informations de base pour démarrer.
          </p>
        </div>
        
        <div className="max-w-2xl mx-auto animate-in fade-in-50">
          <div className="bg-white rounded-2xl shadow-lg p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium flex items-center gap-2"><School className="h-5 w-5 text-primary" /> Informations de l'école</h3>
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
                </div>

                <div className="space-y-4 p-4 border rounded-lg">
                   <h3 className="font-medium flex items-center gap-2"><UserIcon className="h-5 w-5 text-primary" /> Informations du Directeur/Fondateur</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="director-firstname">Votre prénom *</Label>
                          <Input id="director-firstname" required value={directorData.firstName} onChange={(e) => setDirectorData({...directorData, firstName: e.target.value})} />
                        </div>
                        <div>
                          <Label htmlFor="director-lastname">Votre nom *</Label>
                          <Input id="director-lastname" required value={directorData.lastName} onChange={(e) => setDirectorData({...directorData, lastName: e.target.value})} />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-8 pt-6 border-t">
                  <Button type="submit" disabled={loading || !schoolData.name || !directorData.firstName || !directorData.lastName || userLoading}>
                    {loading ? 'Création en cours...' : 'Créer mon école'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
      </div>
    </div>
  );
};
