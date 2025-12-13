
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function NewClassPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // États du formulaire
  const [formData, setFormData] = useState({
    // Informations de base
    name: '',
    code: '',
    cycleId: '',
    niveauId: '',
    section: 'A',
    academicYear: '2024-2025',
    
    // Effectifs
    maxStudents: 28,
    
    // Enseignant
    mainTeacherId: '',
    
    // Localisation
    classroom: '',
    building: '',
    
    // Horaires
    startTime: '08:00',
    endTime: '16:30',
    days: ['LUN', 'MAR', 'MER', 'JEU', 'VEN'],
    
    // Options
    isActive: true,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulation d'enregistrement
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: 'Classe créée !',
        description: 'La classe a été créée avec succès.',
      });
      
      router.push('/dashboard/pedagogie/structure');
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de créer la classe.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Données simulées
  const cycles = [
    { id: '1', name: 'Maternelle' },
    { id: '2', name: 'Primaire' },
    { id: '3', name: 'Collège' },
    { id: '4', name: 'Lycée' },
  ];

  const niveaux = {
    '1': [ // Maternelle
      { id: '11', name: 'PS' },
      { id: '12', name: 'MS' },
      { id: '13', name: 'GS' },
    ],
    '2': [ // Primaire
      { id: '21', name: 'CP' },
      { id: '22', name: 'CE1' },
      { id: '23', name: 'CE2' },
      { id: '24', name: 'CM1' },
      { id: '25', name: 'CM2' },
    ],
    '3': [ // Collège
      { id: '31', name: '6ème' },
      { id: '32', name: '5ème' },
      { id: '33', name: '4ème' },
      { id: '34', name: '3ème' },
    ],
    '4': [ // Lycée
      { id: '41', name: '2nde' },
      { id: '42', name: '1ère' },
      { id: '43', name: 'Terminale' },
    ],
  };

  const teachers = [
    { id: '1', name: 'M. Dupont' },
    { id: '2', name: 'Mme. Martin' },
    { id: '3', name: 'M. Laurent' },
    { id: '4', name: 'Mme. Dubois' },
  ];

  const sections = ['A', 'B', 'C', 'D', 'E'];
  const daysOptions = [
    { value: 'LUN', label: 'Lundi' },
    { value: 'MAR', label: 'Mardi' },
    { value: 'MER', label: 'Mercredi' },
    { value: 'JEU', label: 'Jeudi' },
    { value: 'VEN', label: 'Vendredi' },
    { value: 'SAM', label: 'Samedi' },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/pedagogie/structure">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Créer une nouvelle classe</h1>
          <p className="text-muted-foreground">
            Configurez une nouvelle classe pour l'année scolaire
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="informations" className="space-y-6">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="informations">Informations</TabsTrigger>
            <TabsTrigger value="effectif">Effectif</TabsTrigger>
            <TabsTrigger value="horaire">Horaires</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
          </TabsList>

          {/* Onglet Informations */}
          <TabsContent value="informations">
            <Card>
              <CardHeader>
                <CardTitle>Informations de la classe</CardTitle>
                <CardDescription>
                  Définissez les caractéristiques principales de la classe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Cycle */}
                  <div className="space-y-2">
                    <Label htmlFor="cycle">Cycle *</Label>
                    <Select 
                      value={formData.cycleId} 
                      onValueChange={(value) => {
                        handleInputChange('cycleId', value);
                        handleInputChange('niveauId', ''); // Reset niveau
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        {cycles.map((cycle) => (
                          <SelectItem key={cycle.id} value={cycle.id}>
                            {cycle.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Niveau */}
                  <div className="space-y-2">
                    <Label htmlFor="niveau">Niveau *</Label>
                    <Select 
                      value={formData.niveauId} 
                      onValueChange={(value) => handleInputChange('niveauId', value)}
                      disabled={!formData.cycleId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un niveau" />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.cycleId && niveaux[formData.cycleId as keyof typeof niveaux]?.map((niveau) => (
                          <SelectItem key={niveau.id} value={niveau.id}>
                            {niveau.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Nom de la classe */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom de la classe *</Label>
                    <Input
                      id="name"
                      placeholder="Ex: CE1-A"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>

                  {/* Code */}
                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      placeholder="Ex: CE1A"
                      value={formData.code}
                      onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                      required
                    />
                  </div>

                  {/* Section */}
                  <div className="space-y-2">
                    <Label htmlFor="section">Section</Label>
                    <Select 
                      value={formData.section} 
                      onValueChange={(value) => handleInputChange('section', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map((section) => (
                          <SelectItem key={section} value={section}>
                            Section {section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Année scolaire */}
                  <div className="space-y-2">
                    <Label htmlFor="academicYear">Année scolaire *</Label>
                    <Select 
                      value={formData.academicYear} 
                      onValueChange={(value) => handleInputChange('academicYear', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-2025">2024-2025</SelectItem>
                        <SelectItem value="2025-2026">2025-2026</SelectItem>
                        <SelectItem value="2026-2027">2026-2027</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Enseignant principal */}
                  <div className="space-y-2">
                    <Label htmlFor="teacher">Enseignant principal</Label>
                    <Select 
                      value={formData.mainTeacherId} 
                      onValueChange={(value) => handleInputChange('mainTeacherId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un enseignant" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Salle de classe */}
                  <div className="space-y-2">
                    <Label htmlFor="classroom">Salle de classe</Label>
                    <Input
                      id="classroom"
                      placeholder="Ex: Salle 101"
                      value={formData.classroom}
                      onChange={(e) => handleInputChange('classroom', e.target.value)}
                    />
                  </div>

                  {/* Bâtiment */}
                  <div className="space-y-2">
                    <Label htmlFor="building">Bâtiment</Label>
                    <Input
                      id="building"
                      placeholder="Ex: Bâtiment A"
                      value={formData.building}
                      onChange={(e) => handleInputChange('building', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Effectif */}
          <TabsContent value="effectif">
            <Card>
              <CardHeader>
                <CardTitle>Configuration de l'effectif</CardTitle>
                <CardDescription>
                  Définissez les limites d'effectif pour cette classe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxStudents">Nombre maximum d'élèves *</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          id="maxStudents"
                          type="number"
                          min="1"
                          max="40"
                          value={formData.maxStudents}
                          onChange={(e) => handleInputChange('maxStudents', parseInt(e.target.value))}
                          className="w-32"
                        />
                        <span className="text-sm text-muted-foreground">
                          Recommandé: 28 élèves maximum
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">Recommandations</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Maternelle: 25 élèves maximum</li>
                        <li>• Primaire: 28 élèves maximum</li>
                        <li>• Collège/Lycée: 32 élèves maximum</li>
                        <li>• Spécialisé: 15 élèves maximum</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-6 border rounded-lg text-center">
                      <div className="text-4xl font-bold text-primary">
                        {formData.maxStudents}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        places disponibles
                      </p>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-lg">
                      <h4 className="font-medium text-amber-800 mb-2">Attention</h4>
                      <p className="text-sm text-amber-700">
                        Une fois la classe créée, cette limite pourra être ajustée 
                        mais pas réduite en dessous du nombre d'élèves déjà inscrits.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Horaires */}
          <TabsContent value="horaire">
            <Card>
              <CardHeader>
                <CardTitle>Horaires de la classe</CardTitle>
                <CardDescription>
                  Configurez les heures et jours de cours
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Heure de début *</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">Heure de fin *</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Jours de cours</Label>
                  <div className="flex flex-wrap gap-2">
                    {daysOptions.map(day => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={formData.days.includes(day.value) ? 'default' : 'outline'}
                        onClick={() => {
                          const newDays = formData.days.includes(day.value)
                            ? formData.days.filter(d => d !== day.value)
                            : [...formData.days, day.value];
                          handleInputChange('days', newDays);
                        }}
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium">
                    Emploi du temps détaillé
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Vous pourrez configurer l'emploi du temps matière par matière après avoir créé la classe.
                  </p>
                  <Button type="button" variant="secondary" disabled>
                    Configurer l'emploi du temps détaillé
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Options */}
          <TabsContent value="options">
            <Card>
              <CardHeader>
                <CardTitle>Options avancées</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="is-active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                  />
                  <Label htmlFor="is-active">Activer la classe pour l'année en cours</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes internes (visibles uniquement par l'administration)</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="Ajoutez des notes ou commentaires ici..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Boutons d'action */}
        <div className="flex justify-end gap-4 mt-8">
          <Button variant="outline" asChild>
            <Link href="/dashboard/classes">Annuler</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer la classe'}
          </Button>
        </div>
      </form>
    </div>
  );
}

