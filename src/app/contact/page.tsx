
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CheckCircle, Users, Clock, Video, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'
];

const contactSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis.'),
  lastName: z.string().min(1, 'Le nom est requis.'),
  email: z.string().email("L'email est invalide."),
  phone: z.string().optional(),
  schoolName: z.string().min(1, "Le nom de l'établissement est requis."),
  schoolType: z.string().optional(),
  studentCount: z.string().optional(),
  needs: z.array(z.string()).optional(),
  message: z.string().optional(),
  meetingDate: z.date().optional(),
  meetingTime: z.string().optional(),
  newsletter: z.boolean().default(false),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactFormValues>({
      resolver: zodResolver(contactSchema),
      defaultValues: {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          schoolName: '',
          needs: [],
          meetingDate: new Date(),
          meetingTime: '10:00',
          newsletter: true,
      }
  });

  const handleSubmit = async (values: ContactFormValues) => {
    setIsSubmitting(true);
    const collectionRef = collection(firestore, 'contact_requests');
    const dataToSave = {
      ...values,
      meetingDate: values.meetingDate ? format(values.meetingDate, 'yyyy-MM-dd') : null,
      submittedAt: serverTimestamp(),
    };

    addDoc(collectionRef, dataToSave)
      .then(() => {
        setIsSubmitted(true);
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: collectionRef.path,
          operation: 'create',
          requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/40">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Demande envoyée !</h2>
            <p className="text-muted-foreground mb-6">
              Merci pour votre intérêt. Notre équipe commerciale vous contactera dans les 24h pour confirmer votre démonstration.
            </p>
            <Button onClick={() => router.push('/')}>
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold mb-4">
              Demandez une démonstration personnalisée
            </h1>
            <p className="text-xl text-muted-foreground">
              Un expert vous présente la solution adaptée à votre établissement.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Planifiez votre démo</CardTitle>
                <CardDescription>
                  Remplissez ce formulaire et nous vous recontacterons sous 24h.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Prénom *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Nom *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email professionnel *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl></FormItem>)} />
                  </div>
                  <FormField control={form.control} name="schoolName" render={({ field }) => (<FormItem><FormLabel>Nom de votre établissement *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="schoolType" render={({ field }) => (<FormItem><FormLabel>Type d'établissement</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez" /></SelectTrigger></FormControl><SelectContent><SelectItem value="primary">École primaire</SelectItem><SelectItem value="middle">Collège</SelectItem><SelectItem value="high">Lycée</SelectItem><SelectItem value="international">École internationale</SelectItem><SelectItem value="group">Groupe scolaire</SelectItem></SelectContent></Select></FormItem>)} />
                     <FormField control={form.control} name="studentCount" render={({ field }) => (<FormItem><FormLabel>Nombre d'élèves</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez" /></SelectTrigger></FormControl><SelectContent><SelectItem value="0-100">0-100 élèves</SelectItem><SelectItem value="100-500">100-500 élèves</SelectItem><SelectItem value="500-1000">500-1000 élèves</SelectItem><SelectItem value="1000+">Plus de 1000 élèves</SelectItem></SelectContent></Select></FormItem>)} />
                  </div>
                  <FormField
                      control={form.control}
                      name="needs"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">Vos besoins principaux</FormLabel>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {['Gestion administrative','Pédagogie et notes','Communication parents','Finances et paiements','Transport scolaire','Cantine/internat'].map((item) => (
                            <FormField
                              key={item}
                              control={form.control}
                              name="needs"
                              render={({ field }) => {
                                return (
                                  <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), item])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== item
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">{item}</FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                          </div>
                        </FormItem>
                      )}
                    />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="meetingDate" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Date de rendez-vous souhaitée</FormLabel>
                            <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="w-full justify-start font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'PPP', { locale: fr }) : <span>Choisir une date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="meetingTime" render={({ field }) => (
                        <FormItem><FormLabel>Créneau horaire</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{TIME_SLOTS.map((time) => (<SelectItem key={time} value={time}>{time}</SelectItem>))}</SelectContent>
                        </Select>
                        </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="message" render={({ field }) => (<FormItem><FormLabel>Message additionnel</FormLabel><FormControl><Textarea placeholder="Questions spécifiques, besoins particuliers..." {...field} rows={4}/></FormControl></FormItem>)} />
                  <FormField control={form.control} name="newsletter" render={({ field }) => (<FormItem className="flex items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl><Label htmlFor="newsletter" className="text-sm font-normal">Je souhaite recevoir les actualités et conseils</Label></FormItem>)} />
                  <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}{isSubmitting ? 'Envoi en cours...' : 'Demander ma démo personnalisée'}</Button>
                </form>
                </Form>
              </CardContent>
            </Card>
            <div className="space-y-6">
              <Card><CardContent className="pt-6"><div className="space-y-4"><div className="flex items-center gap-3"><Video className="h-8 w-8 text-primary" /><div><h3 className="font-semibold">Démo en visio</h3><p className="text-sm text-muted-foreground">Présentation interactive en direct</p></div></div><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-primary" /><div><h3 className="font-semibold">45 minutes</h3><p className="text-sm text-muted-foreground">Découverte complète des fonctionnalités</p></div></div><div className="flex items-center gap-3"><Users className="h-8 w-8 text-primary" /><div><h3 className="font-semibold">Expert dédié</h3><p className="text-sm text-muted-foreground">Réponses à toutes vos questions</p></div></div></div></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-lg">Prochaines étapes</CardTitle></CardHeader><CardContent><ol className="space-y-4"><li className="flex items-start gap-3"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div><div><h4 className="font-medium">Confirmation</h4><p className="text-sm text-muted-foreground">Vous recevez un email de confirmation avec le lien de la visio.</p></div></li><li className="flex items-start gap-3"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div><div><h4 className="font-medium">Démo personnalisée</h4><p className="text-sm text-muted-foreground">Présentation adaptée à votre établissement.</p></div></li><li className="flex items-start gap-3"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div><div><h4 className="font-medium">Devis personnalisé</h4><p className="text-sm text-muted-foreground">Proposition commerciale adaptée à vos besoins.</p></div></li></ol></CardContent></Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
