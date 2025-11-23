
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
import { ArrowRight, ArrowLeft, User, Users, GraduationCap } from 'lucide-react';
import { useAuthProtection } from '@/hooks/use-auth-protection.tsx';
import { useSchoolData } from '@/hooks/use-school-data';
import { schoolClasses } from '@/lib/data';

interface Class {
  id: string;
  name: string;
}

export default function RegistrationPage() {
  const { isLoading: isAuthLoading, AuthProtectionLoader } = useAuthProtection();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { schoolId } = useSchoolData();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    placeOfBirth: '',
    previousSchool: '',
    className: '', // Storing the name of the class now
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
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !formData.name || !formData.dateOfBirth || !formData.placeOfBirth || !formData.className || !formData.parent1Name || !formData.parent1Contact) {
      toast({
        variant: "destructive",
        title: "Champs requis",
        description: "Veuillez remplir tous les champs obligatoires.",
      });
      return;
    }
    
    // Find the corresponding class from the predefined list to get its cycle
    const selectedClassInfo = schoolClasses.find(c => c.name === formData.className);

    const studentData = {
      name: formData.name,
      dateOfBirth: formData.dateOfBirth,
      placeOfBirth: formData.placeOfBirth,
      previousSchool: formData.previousSchool,
      class: formData.className,
      cycle: selectedClassInfo?.cycle || 'N/A', // Add cycle here
      parent1Name: formData.parent1Name,
      parent1Contact: formData.parent1Contact,
      parent2Name: formData.parent2Name,
      parent2Contact: formData.parent2Contact,
      amountDue: 0, 
      tuitionStatus: 'Partiel',
      feedback: '',
    };

    const studentsCollectionRef = collection(firestore, `ecoles/${schoolId}/eleves`);
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

  if (isAuthLoading) {
    return <AuthProtectionLoader />;
  }

  const classOptions = schoolClasses.map(c => ({ value: c.name, label: c.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Nouvelle Inscription</h1>
        <p className="text-muted-foreground">Suivez les étapes pour inscrire un nouvel élève.</p>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Formulaire d'Inscription</CardTitle>
          <CardDescription>Étape {step} sur 3</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in-50">
                <div className="flex items-center gap-2 text-lg font-semibold text-primary"><User className="h-5 w-5"/>Informations de l'Élève</div>
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
                <div className="flex items-center gap-2 text-lg font-semibold text-primary"><GraduationCap className="h-5 w-5"/>Informations Scolaires</div>
                <div className="space-y-2">
                    <Label htmlFor="className">Classe souhaitée</Label>
                    <Select name="className" onValueChange={(value) => handleSelectChange('className', value)} value={formData.className} required>
                        <SelectTrigger>
                            <SelectValue placeholder={"Sélectionner une classe"} />
                        </SelectTrigger>
                        <SelectContent>
                            {classOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
              </div>
            )}
            
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in-50">
                <div className="flex items-center gap-2 text-lg font-semibold text-primary"><Users className="h-5 w-5"/>Informations des Parents/Tuteurs</div>
                <div className="p-4 border rounded-lg space-y-4">
                    <h4 className="font-medium">Parent 1</h4>
                     <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="parent1Name">Nom complet</Label>
                            <Input id="parent1Name" name="parent1Name" value={formData.parent1Name} onChange={handleChange} placeholder="Nom du parent 1" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="parent1Contact">Contact (Téléphone)</Label>
                            <Input id="parent1Contact" name="parent1Contact" value={formData.parent1Contact} onChange={handleChange} placeholder="Numéro de téléphone" required />
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
                            <Label htmlFor="parent2Contact">Contact (Téléphone)</Label>
                            <Input id="parent2Contact" name="parent2Contact" value={formData.parent2Contact} onChange={handleChange} placeholder="Numéro de téléphone" />
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
                  Soumettre l'Inscription
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
