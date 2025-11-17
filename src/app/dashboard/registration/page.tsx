'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { ArrowRight, ArrowLeft, User, Users, GraduationCap, Building } from 'lucide-react';

interface Class {
  id: string;
  name: string;
}

export default function RegistrationPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const schoolId = user ? (user.customClaims?.schoolId as string || 'test-school') : null;


  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/classes`) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes: Class[] = classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [];

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    placeOfBirth: '',
    previousSchool: '',
    classId: '',
    parent1Name: '',
    parent1Contact: '',
    parent2Name: '',
    parent2Contact: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNextStep = () => setStep(s => Math.min(s + 1, 3));
  const handlePrevStep = () => setStep(s => Math.max(s - 1, 1));
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !formData.name || !formData.dateOfBirth || !formData.placeOfBirth || !formData.classId || !formData.parent1Name || !formData.parent1Contact) {
      toast({
        variant: "destructive",
        title: "Champs requis",
        description: "Veuillez remplir tous les champs obligatoires.",
      });
      return;
    }
    
    const selectedClass = classes.find(c => c.id === formData.classId);

    const studentData = {
      ...formData,
      class: selectedClass?.name || 'N/A',
      amountDue: 0, // Default value
      tuitionStatus: 'Partiel', // Default value
      feedback: '', // Default value
    };

    const studentsCollectionRef = collection(firestore, `schools/${schoolId}/students`);
    addDoc(studentsCollectionRef, studentData)
    .then((docRef) => {
        toast({
            title: "Inscription réussie",
            description: `${formData.name} a été inscrit(e) avec succès.`,
        });
        router.push(`/dashboard/students/${docRef.id}`);
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: studentsCollectionRef.path, operation: 'create', requestResourceData: studentData });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Nouvelle Inscription</h1>
        <p className="text-muted-foreground">Suivez les étapes pour inscrire un nouvel élève.</p>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Formulaire d'inscription</CardTitle>
          <CardDescription>Étape {step} sur 3</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in-50">
                <div className="flex items-center gap-2 text-lg font-semibold text-primary"><User className="h-5 w-5"/>Informations de l'élève</div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom complet de l'élève</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Ex: Adama Gueye" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date de naissance</Label>
                    <Input id="dateOfBirth" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} type="date" required />
                  </div>
                </div>
                 <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="placeOfBirth">Lieu de naissance</Label>
                        <Input id="placeOfBirth" name="placeOfBirth" value={formData.placeOfBirth} onChange={handleChange} placeholder="Ex: Dakar" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="previousSchool">Ancien établissement (si applicable)</Label>
                        <Input id="previousSchool" name="previousSchool" value={formData.previousSchool} onChange={handleChange} placeholder="Ex: Lycée Lamine Gueye" />
                    </div>
                 </div>
              </div>
            )}
            
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in-50">
                <div className="flex items-center gap-2 text-lg font-semibold text-primary"><GraduationCap className="h-5 w-5"/>Informations scolaires</div>
                <div className="space-y-2">
                    <Label htmlFor="classId">Classe souhaitée</Label>
                    <Select name="classId" onValueChange={(value) => handleSelectChange('classId', value)} value={formData.classId} required>
                        <SelectTrigger>
                            <SelectValue placeholder={classesLoading ? "Chargement..." : "Sélectionner une classe"} />
                        </SelectTrigger>
                        <SelectContent>
                            {!classesLoading && classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
              </div>
            )}
            
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in-50">
                <div className="flex items-center gap-2 text-lg font-semibold text-primary"><Users className="h-5 w-5"/>Informations des parents/tuteurs</div>
                <div className="p-4 border rounded-lg space-y-4">
                    <h4 className="font-medium">Parent 1</h4>
                     <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="parent1Name">Nom complet</Label>
                            <Input id="parent1Name" name="parent1Name" value={formData.parent1Name} onChange={handleChange} placeholder="Nom du parent 1" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="parent1Contact">Contact</Label>
                            <Input id="parent1Contact" name="parent1Contact" value={formData.parent1Contact} onChange={handleChange} placeholder="Téléphone, Email..." required />
                        </div>
                    </div>
                </div>
                 <div className="p-4 border rounded-lg space-y-4">
                    <h4 className="font-medium">Parent 2 (optionnel)</h4>
                     <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="parent2Name">Nom complet</Label>
                            <Input id="parent2Name" name="parent2Name" value={formData.parent2Name} onChange={handleChange} placeholder="Nom du parent 2" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="parent2Contact">Contact</Label>
                            <Input id="parent2Contact" name="parent2Contact" value={formData.parent2Contact} onChange={handleChange} placeholder="Téléphone, Email..." />
                        </div>
                    </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={handlePrevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
                </Button>
              ) : <div />}
              {step < 3 ? (
                <Button type="button" onClick={handleNextStep}>
                  Suivant <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit">
                  Soumettre l'inscription
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

    