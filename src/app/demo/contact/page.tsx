
'use client';

import { useState, FormEvent, Suspense } from 'react';
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
    // This would typically be an API call to a serverless function
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true };
}


function DemoContactPageContent() {
  const router = useRouter();
  const [formData, setFormData] = useState({
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
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Envoyer la demande à votre CRM/email
      await sendContactRequest(formData);
      setIsSubmitted(true);
      
      // Rediriger vers une page de confirmation
      setTimeout(() => {
        // In a real app, you might have a /demo/thank-you page
        router.push('/demo'); 
      }, 2000);
      
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
            {/* Formulaire */}
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
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom *</Label>
                      <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} required/>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom *</Label>
                      <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} required/>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email professionnel *</Label>
                      <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required/>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}/>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schoolName">Nom de votre établissement *</Label>
                    <Input id="schoolName" value={formData.schoolName} onChange={(e) => setFormData({...formData, schoolName: e.target.value})} required/>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type d'établissement</Label>
                      <Select value={formData.schoolType} onValueChange={(value) => setFormData({...formData, schoolType: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionnez" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="primary">École primaire</SelectItem>
                          <SelectItem value="middle">Collège</SelectItem>
                          <SelectItem value="high">Lycée</SelectItem>
                          <SelectItem value="international">École internationale</SelectItem>
                          <SelectItem value="group">Groupe scolaire</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nombre d'élèves</Label>
                      <Select value={formData.studentCount} onValueChange={(value) => setFormData({...formData, studentCount: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionnez" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0-100">0-100 élèves</SelectItem>
                          <SelectItem value="100-500">100-500 élèves</SelectItem>
                          <SelectItem value="500-1000">500-1000 élèves</SelectItem>
                          <SelectItem value="1000+">Plus de 1000 élèves</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Vos besoins principaux</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {['Gestion administrative','Pédagogie et notes','Communication parents','Finances et paiements','Transport scolaire','Cantine/internat'].map((need) => (
                        <div key={need} className="flex items-center space-x-2">
                          <Checkbox id={need} checked={formData.needs.includes(need)} onCheckedChange={(checked) => {
                              if (checked) { setFormData({ ...formData, needs: [...formData.needs, need] });
                              } else { setFormData({ ...formData, needs: formData.needs.filter(n => n !== need) }); }
                            }}
                          />
                          <label htmlFor={need} className="text-sm font-normal">{need}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date de rendez-vous souhaitée</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.meetingDate ? format(formData.meetingDate, 'PPP', { locale: fr }) : <span>Choisir une date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={formData.meetingDate} onSelect={(date) => date && setFormData({...formData, meetingDate: date})} initialFocus/>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Créneau horaire</Label>
                      <Select value={formData.meetingTime} onValueChange={(value) => setFormData({...formData, meetingTime: value})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TIME_SLOTS.map((time) => (<SelectItem key={time} value={time}>{time}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message additionnel</Label>
                    <Textarea id="message" placeholder="Questions spécifiques, besoins particuliers..." value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} rows={4}/>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="newsletter" checked={formData.newsletter} onCheckedChange={(checked) => setFormData({...formData, newsletter: checked === true})}/>
                    <label htmlFor="newsletter" className="text-sm font-normal">Je souhaite recevoir les actualités et conseils</label>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
                    {isSubmitting ? 'Envoi en cours...' : 'Demander ma démo personnalisée'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Infos côté */}
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Video className="h-8 w-8 text-primary" />
                      <div><h3 className="font-semibold">Démo en visio</h3><p className="text-sm text-muted-foreground">Présentation interactive en direct</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-8 w-8 text-primary" />
                      <div><h3 className="font-semibold">45 minutes</h3><p className="text-sm text-muted-foreground">Découverte complète des fonctionnalités</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8 text-primary" />
                      <div><h3 className="font-semibold">Expert dédié</h3><p className="text-sm text-muted-foreground">Réponses à toutes vos questions</p></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg">Prochaines étapes</CardTitle></CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
                      <div><h4 className="font-medium">Confirmation</h4><p className="text-sm text-muted-foreground">Vous recevez un email de confirmation avec le lien de la visio.</p></div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
                      <div><h4 className="font-medium">Démo personnalisée</h4><p className="text-sm text-muted-foreground">Présentation adaptée à votre établissement.</p></div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div>
                      <div><h4 className="font-medium">Devis personnalisé</h4><p className="text-sm text-muted-foreground">Proposition commerciale adaptée à vos besoins.</p></div>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DemoContactPage() {
    return (
        <Suspense fallback={<div>Chargement du formulaire...</div>}>
            <DemoContactPageContent />
        </Suspense>
    );
}
