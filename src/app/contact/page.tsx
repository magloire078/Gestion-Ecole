
'use client';

import { useState, FormEvent, Suspense, useReducer } from 'react';
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

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'
];

async function sendContactRequest(data: any) {
    console.log("Sending contact request:", data);
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true };
}

const initialState = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    schoolName: '',
    schoolType: '',
    studentCount: '',
    needs: [] as string[],
    message: '',
    meetingDate: new Date(),
    meetingTime: '10:00',
    newsletter: true
};

type FormState = typeof initialState;
type FormAction = { type: 'SET_FIELD'; field: keyof FormState; value: any } | { type: 'TOGGLE_NEED'; need: string };

function formReducer(state: FormState, action: FormAction): FormState {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value };
        case 'TOGGLE_NEED':
            const needs = state.needs.includes(action.need)
                ? state.needs.filter(n => n !== action.need)
                : [...state.needs, action.need];
            return { ...state, needs };
        default:
            return state;
    }
}


function ContactPageContent() {
  const router = useRouter();
  const [state, dispatch] = useReducer(formReducer, initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleFieldChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      dispatch({ type: 'SET_FIELD', field, value: e.target.value });
  };
  
  const handleSelectChange = (field: keyof FormState) => (value: string) => {
      dispatch({ type: 'SET_FIELD', field, value });
  };

  const handleDateChange = (date: Date | undefined) => {
      if (date) {
        dispatch({ type: 'SET_FIELD', field: 'meetingDate', value: date });
      }
  }

  const handleNeedsChange = (need: string) => (checked: boolean | 'indeterminate') => {
      dispatch({ type: 'TOGGLE_NEED', need });
  }

  const handleNewsletterChange = (checked: boolean | 'indeterminate') => {
      dispatch({ type: 'SET_FIELD', field: 'newsletter', value: checked === true });
  }


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await sendContactRequest(state);
      setIsSubmitted(true);
      setTimeout(() => router.push('/'), 2000);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/40">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Demande envoyée !</h2>
            <p className="text-muted-foreground mb-6">
              Notre équipe commerciale vous contactera dans les 24h.
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
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="firstName">Prénom *</Label><Input id="firstName" value={state.firstName} onChange={handleFieldChange('firstName')} required/></div>
                    <div className="space-y-2"><Label htmlFor="lastName">Nom *</Label><Input id="lastName" value={state.lastName} onChange={handleFieldChange('lastName')} required/></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="email">Email professionnel *</Label><Input id="email" type="email" value={state.email} onChange={handleFieldChange('email')} required/></div>
                    <div className="space-y-2"><Label htmlFor="phone">Téléphone</Label><Input id="phone" type="tel" value={state.phone} onChange={handleFieldChange('phone')}/></div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="schoolName">Nom de votre établissement *</Label><Input id="schoolName" value={state.schoolName} onChange={handleFieldChange('schoolName')} required/></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Type d'établissement</Label><Select value={state.schoolType} onValueChange={handleSelectChange('schoolType')}><SelectTrigger><SelectValue placeholder="Sélectionnez" /></SelectTrigger><SelectContent><SelectItem value="primary">École primaire</SelectItem><SelectItem value="middle">Collège</SelectItem><SelectItem value="high">Lycée</SelectItem><SelectItem value="international">École internationale</SelectItem><SelectItem value="group">Groupe scolaire</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Nombre d'élèves</Label><Select value={state.studentCount} onValueChange={handleSelectChange('studentCount')}><SelectTrigger><SelectValue placeholder="Sélectionnez" /></SelectTrigger><SelectContent><SelectItem value="0-100">0-100 élèves</SelectItem><SelectItem value="100-500">100-500 élèves</SelectItem><SelectItem value="500-1000">500-1000 élèves</SelectItem><SelectItem value="1000+">Plus de 1000 élèves</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="space-y-2">
                    <Label>Vos besoins principaux</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {['Gestion administrative','Pédagogie et notes','Communication parents','Finances et paiements','Transport scolaire','Cantine/internat'].map((need) => (
                        <div key={need} className="flex items-center space-x-2"><Checkbox id={need} checked={state.needs.includes(need)} onCheckedChange={handleNeedsChange(need)}/><label htmlFor={need} className="text-sm font-normal">{need}</label></div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Date de rendez-vous souhaitée</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{state.meetingDate ? format(state.meetingDate, 'PPP', { locale: fr }) : <span>Choisir une date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={state.meetingDate} onSelect={handleDateChange} initialFocus/></PopoverContent></Popover></div>
                    <div className="space-y-2"><Label>Créneau horaire</Label><Select value={state.meetingTime} onValueChange={handleSelectChange('meetingTime')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIME_SLOTS.map((time) => (<SelectItem key={time} value={time}>{time}</SelectItem>))}</SelectContent></Select></div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="message">Message additionnel</Label><Textarea id="message" placeholder="Questions spécifiques, besoins particuliers..." value={state.message} onChange={handleFieldChange('message')} rows={4}/></div>
                  <div className="flex items-center space-x-2"><Checkbox id="newsletter" checked={state.newsletter} onCheckedChange={handleNewsletterChange}/><label htmlFor="newsletter" className="text-sm font-normal">Je souhaite recevoir les actualités et conseils</label></div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}{isSubmitting ? 'Envoi en cours...' : 'Demander ma démo personnalisée'}</Button>
                </form>
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

export default function ContactPage() {
    return (
        <Suspense fallback={<div>Chargement du formulaire...</div>}>
            <ContactPageContent />
        </Suspense>
    );
}
