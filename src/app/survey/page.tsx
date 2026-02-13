
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CheckCircle, Loader2, School } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const surveySchema = z.object({
  schoolName: z.string().min(1, "Le nom de l'établissement est requis."),
  schoolType: z.string().min(1, "Veuillez sélectionner un type."),
  studentCount: z.string().min(1, "Veuillez sélectionner une tranche."),
  currentManagement: z.string().min(1, "Veuillez décrire votre méthode actuelle."),
  painPoints: z.array(z.string()).min(1, "Veuillez sélectionner au moins un défi."),
  featureInterest: z.object({
    pedagogy: z.number(),
    finance: z.number(),
    communication: z.number(),
    schoolLife: z.number(),
    rh: z.number(),
    infra: z.number(),
  }),
  budget: z.string().optional(),
  comments: z.string().optional(),
  contactEmail: z.string().email("L'email est invalide.").optional().or(z.literal('')),
});

type SurveyFormValues = z.infer<typeof surveySchema>;

const featureConfig = [
  { id: 'pedagogy', label: 'Pédagogie (notes, bulletins, classes)' },
  { id: 'finance', label: 'Finances (scolarité, comptabilité)' },
  { id: 'communication', label: 'Communication (parents, personnel)' },
  { id: 'schoolLife', label: 'Vie Scolaire (cantine, transport, internat)' },
  { id: 'rh', label: 'Ressources Humaines & Paie' },
  { id: 'infra', label: 'Immobilier & Maintenance' },
] as const;


export default function SurveyPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<SurveyFormValues>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      schoolName: '',
      painPoints: [],
      featureInterest: { pedagogy: 3, finance: 3, communication: 3, schoolLife: 3, rh: 3, infra: 3 },
      currentManagement: 'Logiciel spécifique',
    }
  });

  const handleSubmit = async (values: SurveyFormValues) => {
    if (!firestore) {
      toast({ variant: "destructive", title: "Erreur", description: "La base de données n'est pas accessible." });
      return;
    }
    setIsSubmitting(true);
    const surveyCollectionRef = collection(firestore, 'survey_responses');
    const dataToSave = {
      ...values,
      submittedAt: serverTimestamp(),
    };

    try {
      await addDoc(surveyCollectionRef, dataToSave);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting survey:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer votre réponse." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const painPointOptions = [
    "Suivi des paiements de scolarité",
    "Génération des bulletins de notes",
    "Gestion des emplois du temps",
    "Communication avec les parents",
    "Suivi des absences",
    "Gestion du personnel et de la paie",
    "Manque de centralisation des données",
    "Processus manuels (papier, Excel)",
  ];

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/40">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Merci pour votre participation !</h2>
            <p className="text-muted-foreground">
              Vos réponses nous sont précieuses et nous aideront à construire la meilleure solution pour les écoles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex justify-center items-center gap-3 mb-4">
              <School className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Enquête GèreEcole</h1>
            </div>
            <p className="text-xl text-muted-foreground">
              Aidez-nous à mieux comprendre les besoins de votre établissement.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Votre avis compte</CardTitle>
              <CardDescription>
                Ce formulaire rapide (environ 5 minutes) nous permettra d'adapter notre solution à vos réalités.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">

                  {/* Section 1: Profil */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">1. À propos de votre établissement</h3>
                    <FormField control={form.control} name="schoolName" render={({ field }) => (<FormItem><FormLabel>Nom de l'établissement *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="schoolType" render={({ field }) => (<FormItem><FormLabel>Type d'établissement *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="prescolaire">Préscolaire</SelectItem><SelectItem value="primaire">Primaire</SelectItem><SelectItem value="secondaire">Secondaire (Collège/Lycée)</SelectItem><SelectItem value="groupe">Groupe Scolaire</SelectItem><SelectItem value="superieur">Supérieur/Professionnel</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="studentCount" render={({ field }) => (<FormItem><FormLabel>Nombre d'élèves *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="0-100">Moins de 100</SelectItem><SelectItem value="100-500">100 - 500</SelectItem><SelectItem value="500-1000">500 - 1000</SelectItem><SelectItem value="1000+">Plus de 1000</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    </div>
                  </div>

                  {/* Section 2: Besoins */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">2. Vos méthodes et défis actuels</h3>
                    <FormField control={form.control} name="currentManagement" render={({ field }) => (<FormItem><FormLabel>Comment gérez-vous principalement votre école aujourd'hui ?</FormLabel>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="papier-excel" /></FormControl><FormLabel className="font-normal">Papier et/ou tableurs (Excel, Google Sheets)</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="logiciel-specifique" /></FormControl><FormLabel className="font-normal">Un logiciel spécifique (ex: comptabilité, notes)</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="erp-maison" /></FormControl><FormLabel className="font-normal">Une solution "maison" développée en interne</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="autre" /></FormControl><FormLabel className="font-normal">Autre</FormLabel></FormItem>
                      </RadioGroup>
                      <FormMessage /></FormItem>)} />

                    <FormField control={form.control} name="painPoints" render={() => (
                      <FormItem><FormLabel>Quels sont vos plus grands défis administratifs ? (plusieurs choix possibles) *</FormLabel>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {painPointOptions.map((item) => (
                            <FormField key={item} control={form.control} name="painPoints" render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl>
                                <Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {
                                  return checked ? field.onChange([...(field.value || []), item]) : field.onChange(field.value?.filter((value) => value !== item))
                                }} />
                              </FormControl><FormLabel className="font-normal">{item}</FormLabel></FormItem>
                            )} />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {/* Section 3: Intérêt */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">3. Importance des fonctionnalités</h3>
                    <p className="text-sm text-muted-foreground">Évaluez l'importance de chaque module pour votre établissement (1 = Pas important, 5 = Très important).</p>
                    {featureConfig.map(feature => (
                      <FormField key={feature.id} control={form.control} name={`featureInterest.${feature.id}`} render={({ field }) => (
                        <FormItem>
                          <FormLabel>{feature.label}</FormLabel>
                          <div className="flex items-center gap-4">
                            <FormControl><Slider defaultValue={[field.value]} min={1} max={5} step={1} onValueChange={(value) => field.onChange(value[0])} /></FormControl>
                            <span className="font-bold text-primary w-4">{field.value}</span>
                          </div>
                        </FormItem>
                      )} />
                    ))}
                  </div>

                  {/* Section 4: Budget et Contact */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">4. Budget et suivi</h3>
                    <FormField control={form.control} name="budget" render={({ field }) => (<FormItem><FormLabel>Quel budget mensuel (en CFA) seriez-vous prêt à allouer pour une solution de gestion complète ?</FormLabel>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="<50k" /></FormControl><FormLabel className="font-normal">Moins de 50 000 CFA</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="50k-100k" /></FormControl><FormLabel className="font-normal">Entre 50 000 et 100 000 CFA</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="100k-200k" /></FormControl><FormLabel className="font-normal">Entre 100 000 et 200 000 CFA</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value=">200k" /></FormControl><FormLabel className="font-normal">Plus de 200 000 CFA</FormLabel></FormItem>
                      </RadioGroup>
                    </FormItem>)} />
                    <FormField control={form.control} name="comments" render={({ field }) => (<FormItem><FormLabel>Avez-vous des commentaires ou des besoins spécifiques non mentionnés ?</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="contactEmail" render={({ field }) => (<FormItem><FormLabel>Votre email (pour être recontacté avec une offre personnalisée)</FormLabel><FormControl><Input type="email" placeholder="directeur@ecole.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {isSubmitting ? 'Envoi en cours...' : 'Envoyer mes réponses'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}


