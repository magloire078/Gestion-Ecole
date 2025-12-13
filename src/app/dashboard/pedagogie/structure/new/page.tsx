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

                <div className="space-y-3">
                  <Label>Jours de cours *</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {daysOptions.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`day-${day.value}`}
                          checked={formData.days.includes(day.value)}
                          onChange={(e) => {
                            const newDays = e.target.checked
                              ? [...formData.days, day.value]
                              : formData.days.filter(d => d !== day.value);
                            handleInputChange('days', newDays);
                          }}
                          className="h-4 w-4"
                        />
                        <label htmlFor={`day-${day.value}`} className="text-sm">
                          {day.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Récapitulatif horaire</h4>
                  <div className="text-sm text-muted-foreground">
                    <p>La classe aura cours de <strong>{formData.startTime}</strong> à <strong>{formData.endTime}</strong></p>
                    <p>les jours: <strong>{formData.days.map(d => daysOptions.find(opt => opt.value === d)?.label).join(', ')}</strong></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Options */}
          <TabsContent value="options">
            <Card>
              <CardHeader>
                <CardTitle>Options supplémentaires</CardTitle>
                <CardDescription>
                  Paramètres avancés et notes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="isActive" className="font-medium">
                        Classe active
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Désactivez pour archiver la classe
                      </p>
                    </div>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes internes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Informations supplémentaires sur cette classe..."
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={4}
                    />
                    <p className="text-sm text-muted-foreground">
                      Ces notes sont visibles uniquement par l'administration.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Boutons d'action */}
        <div className="flex items-center justify-between pt-6">
          <Button variant="outline" type="button" asChild>
            <Link href="/dashboard/pedagogie/structure">
              Annuler
            </Link>
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" type="button">
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer le brouillon
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Création...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Créer la classe
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
