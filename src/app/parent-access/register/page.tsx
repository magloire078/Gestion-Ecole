'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl } from '@/lib/api-base';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  GraduationCap, 
  User, 
  Phone, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Loader2, 
  Building2, 
  CreditCard, 
  AlertTriangle,
  CalendarDays,
  Users
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import { getTuitionInfoForClass } from '@/lib/school-utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function PublicParentRegistrationPageForm() {
  const searchParams = useSearchParams();
  const schoolId = searchParams.get('schoolId');

  const [step, setStep] = useState(1);
  const [loadingSchool, setLoadingSchool] = useState(true);
  const [schoolError, setSchoolError] = useState<string | null>(null);

  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.width = `${(step / 3) * 100}%`;
    }
  }, [step]);

  // Données de l'école chargées depuis l'API publique
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [niveaux, setNiveaux] = useState<any[]>([]);

  // State du formulaire
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    gender: '' as 'Masculin' | 'Féminin' | '',
    dateOfBirth: '',
    classId: '',
    parent1LastName: '',
    parent1FirstName: '',
    parent1Contact: '',
    paymentProvider: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Charger les infos de l'école
  useEffect(() => {
    if (!schoolId) {
      setSchoolError("L'identifiant de l'école est manquant dans l'adresse. Veuillez scanner à nouveau le QR Code officiel.");
      setLoadingSchool(false);
      return;
    }

    async function fetchSchoolData() {
      try {
        const res = await fetch(apiUrl(`/api/public/school-info?schoolId=${schoolId}`));
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Erreur de chargement des informations.");
        }

        setSchoolInfo(data.school);
        setClasses(data.classes || []);
        setFees(data.fees || []);
        setNiveaux(data.niveaux || []);
      } catch (err: any) {
        console.error(err);
        setSchoolError(err.message || "Impossible de récupérer les informations de l'établissement.");
      } finally {
        setLoadingSchool(false);
      }
    }

    fetchSchoolData();
  }, [schoolId]);

  // Calcul du tarif
  const selectedClass = classes.find(c => c.id === formData.classId);
  const tuitionInfo = getTuitionInfoForClass(formData.classId, classes, niveaux, fees);
  const tuitionAmount = tuitionInfo.fee;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateStep = (currentStep: number): boolean => {
    const errors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.lastName.trim()) errors.lastName = "Le nom de l'élève est requis.";
      if (!formData.firstName.trim()) errors.firstName = "Le prénom de l'élève est requis.";
      if (!formData.gender) errors.gender = "Le sexe est requis.";
      if (!formData.classId) errors.classId = "Veuillez sélectionner la classe.";
    } else if (currentStep === 2) {
      if (!formData.parent1LastName.trim()) errors.parent1LastName = "Le nom du parent est requis.";
      if (!formData.parent1FirstName.trim()) errors.parent1FirstName = "Le prénom du parent est requis.";
      if (!formData.parent1Contact.trim()) {
        errors.parent1Contact = "Le numéro de téléphone est requis.";
      } else {
        // Validation simple du format numéro téléphone africain
        const cleanContact = formData.parent1Contact.replace(/[\s\-\+]/g, '');
        if (cleanContact.length < 8) {
          errors.parent1Contact = "Numéro de téléphone invalide (8 chiffres minimum).";
        }
      }
    } else if (currentStep === 3) {
      if (!formData.paymentProvider) errors.paymentProvider = "Veuillez choisir un moyen de paiement.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(s => Math.min(s + 1, 3));
    }
  };

  const handlePrev = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setSubmitting(true);
    try {
      const response = await fetch(apiUrl('/api/public/register-student'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schoolId,
          ...formData
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Une erreur est survenue lors de la création de l'inscription.");
      }

      if (result.redirectUrl) {
        // Rediriger le parent vers la page de paiement
        window.location.href = result.redirectUrl;
      } else {
        throw new Error("Lien de redirection de paiement manquant.");
      }
    } catch (err: any) {
      console.error(err);
      setFormErrors({ form: err.message || "Erreur lors du traitement de l'inscription." });
      setSubmitting(false);
    }
  };

  if (loadingSchool) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Chargement de la page d&apos;inscription...</p>
      </div>
    );
  }

  if (schoolError || !schoolInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md border-rose-100 shadow-2xl rounded-2xl bg-white/80 backdrop-blur-xl">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-2" />
            <CardTitle className="text-slate-900 font-black tracking-tight text-xl">Accès Impossible</CardTitle>
            <CardDescription className="mt-2 text-slate-500 text-sm">
              {schoolError || "Établissement introuvable."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <p className="text-xs text-slate-400">GèreEcole - Portail Inscriptions Publiques</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-50/50 via-slate-50 to-emerald-50/30 py-12 px-4 flex flex-col items-center justify-center">
      {/* School Header */}
      <div className="mb-8 text-center flex flex-col items-center max-w-md">
        <Avatar className="h-20 w-20 shadow-lg border-2 border-white mb-3">
          <AvatarImage src={schoolInfo.logoUrl || undefined} alt="School Logo" />
          <AvatarFallback className="bg-indigo-600 text-white text-xl font-bold">
            {schoolInfo.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">{schoolInfo.name}</h1>
        <p className="text-xs font-black uppercase tracking-widest text-indigo-600/80 mt-1">
          Portail Inscription & Paiement en Ligne
        </p>
      </div>

      {/* Main Registration Card */}
      <Card className="w-full max-w-lg bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-200">
          <div 
            ref={progressRef}
            className="h-full bg-indigo-600 transition-all duration-300"
          />
        </div>

        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Étape {step} sur 3</span>
            {formData.classId && (
              <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                Frais : <span className="font-mono">{formatCurrency(tuitionAmount)}</span>
              </span>
            )}
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-slate-950">
            {step === 1 && "Élève à inscrire"}
            {step === 2 && "Coordonnées du Parent / Tuteur"}
            {step === 3 && "Moyen de paiement & Validation"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Veuillez saisir les informations concernant l'enfant."}
            {step === 2 && "Entrez votre contact pour le suivi et le reçu par SMS."}
            {step === 3 && "Sélectionnez votre moyen de paiement mobile ou par carte."}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-2">
            
            {formErrors.form && (
              <Alert variant="destructive" className="rounded-xl border-rose-200 bg-rose-50/50">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <AlertTitle className="font-bold">Une erreur est survenue</AlertTitle>
                <AlertDescription className="text-xs">{formErrors.form}</AlertDescription>
              </Alert>
            )}

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400" htmlFor="lastName">Nom de famille</Label>
                      <Input 
                        id="lastName" 
                        placeholder="Ex: DIOP" 
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="rounded-xl"
                      />
                      {formErrors.lastName && <p className="text-rose-600 text-xs font-semibold">{formErrors.lastName}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400" htmlFor="firstName">Prénom(s)</Label>
                      <Input 
                        id="firstName" 
                        placeholder="Ex: Fatou" 
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="rounded-xl"
                      />
                      {formErrors.firstName && <p className="text-rose-600 text-xs font-semibold">{formErrors.firstName}</p>}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Sexe</Label>
                      <Select 
                        value={formData.gender} 
                        onValueChange={(val) => handleInputChange('gender', val)}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Sélectionner le sexe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Masculin">Masculin</SelectItem>
                          <SelectItem value="Féminin">Féminin</SelectItem>
                        </SelectContent>
                      </Select>
                      {formErrors.gender && <p className="text-rose-600 text-xs font-semibold">{formErrors.gender}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400" htmlFor="dateOfBirth">Date de naissance</Label>
                      <Input 
                        id="dateOfBirth" 
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Classe demandée</Label>
                    <Select 
                      value={formData.classId} 
                      onValueChange={(val) => handleInputChange('classId', val)}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Choisir la classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(c => (
                          <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.classId && <p className="text-rose-600 text-xs font-semibold">{formErrors.classId}</p>}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400" htmlFor="parent1LastName">Nom du Parent</Label>
                      <Input 
                        id="parent1LastName" 
                        placeholder="Votre nom" 
                        value={formData.parent1LastName}
                        onChange={(e) => handleInputChange('parent1LastName', e.target.value)}
                        className="rounded-xl"
                      />
                      {formErrors.parent1LastName && <p className="text-rose-600 text-xs font-semibold">{formErrors.parent1LastName}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400" htmlFor="parent1FirstName">Prénom du Parent</Label>
                      <Input 
                        id="parent1FirstName" 
                        placeholder="Votre prénom" 
                        value={formData.parent1FirstName}
                        onChange={(e) => handleInputChange('parent1FirstName', e.target.value)}
                        className="rounded-xl"
                      />
                      {formErrors.parent1FirstName && <p className="text-rose-600 text-xs font-semibold">{formErrors.parent1FirstName}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400" htmlFor="parent1Contact">Téléphone (Reçu SMS)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        id="parent1Contact" 
                        type="tel"
                        placeholder="Ex: +225 01020304" 
                        value={formData.parent1Contact}
                        onChange={(e) => handleInputChange('parent1Contact', e.target.value)}
                        className="pl-10 rounded-xl font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">Format international recommandé (ex : +221770000000 ou +2250102...)</p>
                    {formErrors.parent1Contact && <p className="text-rose-600 text-xs font-semibold">{formErrors.parent1Contact}</p>}
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Récapitulatif */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Récapitulatif de l&apos;inscription
                    </h4>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <span className="text-slate-500">Élève :</span>
                      <span className="font-bold text-slate-900">{formData.firstName} {formData.lastName.toUpperCase()}</span>
                      
                      <span className="text-slate-500">Classe :</span>
                      <span className="font-semibold text-slate-900">{selectedClass?.name || 'Non choisie'}</span>
                      
                      <span className="text-slate-500">Parent :</span>
                      <span className="font-semibold text-slate-900">{formData.parent1FirstName} {formData.parent1LastName.toUpperCase()}</span>

                      <span className="text-slate-500">Reçu SMS :</span>
                      <span className="font-mono font-semibold text-slate-900">{formData.parent1Contact}</span>
                    </div>

                    <div className="pt-2 border-t flex justify-between items-center">
                      <span className="text-sm font-bold text-indigo-700">Frais d&apos;inscription :</span>
                      <span className="text-lg font-black text-indigo-600 font-mono">
                        {formatCurrency(tuitionAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Moyen de Paiement */}
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Mode de paiement mobile</Label>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'wave', label: 'Wave', icon: '🌊', color: 'border-cyan-200 hover:border-cyan-500 bg-cyan-50/10' },
                        { id: 'orangemoney', label: 'Orange Money', icon: '🍊', color: 'border-orange-200 hover:border-orange-500 bg-orange-50/10' },
                        { id: 'mtn', label: 'MTN MoMo', icon: '💛', color: 'border-yellow-200 hover:border-yellow-500 bg-yellow-50/10' },
                        { id: 'paydunya', label: 'Paydunya', icon: '💳', color: 'border-slate-200 hover:border-slate-500 bg-slate-50/10' },
                        { id: 'stripe', label: 'Stripe (International)', icon: '🌍', color: 'border-indigo-200 hover:border-indigo-500 bg-indigo-50/10' }
                      ].map((prov) => (
                        <div 
                          key={prov.id}
                          onClick={() => handleInputChange('paymentProvider', prov.id)}
                          className={`p-3 border rounded-xl cursor-pointer transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] ${prov.color} ${formData.paymentProvider === prov.id ? 'border-2 ring-2 ring-indigo-500/20 bg-indigo-50/30' : 'border-slate-200 bg-white'}`}
                        >
                          <span className="text-xl">{prov.icon}</span>
                          <span className="font-bold text-xs text-slate-700">{prov.label}</span>
                        </div>
                      ))}
                    </div>
                    {formErrors.paymentProvider && <p className="text-rose-600 text-xs font-semibold">{formErrors.paymentProvider}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </CardContent>

          <CardFooter className="flex justify-between border-t bg-muted/20 px-6 py-4 rounded-b-2xl">
            {step > 1 ? (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handlePrev}
                disabled={submitting}
                className="rounded-xl transition-all hover:scale-105 active:scale-95 text-slate-500"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button 
                type="button" 
                onClick={handleNext}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all hover:scale-105 active:scale-95"
              >
                Suivant <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                type="submit" 
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all hover:scale-105 active:scale-95 min-w-[150px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirection...
                  </>
                ) : (
                  <>
                    Valider & Payer <CheckCircle2 className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
      
      <div className="mt-8 text-center text-xs text-slate-400">
        <p>Sécurisé par <strong>GèreEcole</strong> &middot; Tous droits réservés</p>
      </div>
    </div>
  );
}

export default function PublicParentRegistrationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Chargement...</p>
      </div>
    }>
      <PublicParentRegistrationPageForm />
    </Suspense>
  );
}
