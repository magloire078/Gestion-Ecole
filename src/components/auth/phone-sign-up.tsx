'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, KeyRound, ArrowLeft } from 'lucide-react';
import { apiUrl } from '@/lib/api-base';

type Step = 'phone' | 'code';

/**
 * Création de compte par numéro de téléphone, en deux étapes.
 *
 * Le serveur envoie un code (WhatsApp, repli SMS) puis, après vérification, renvoie un
 * jeton personnalisé. `signInWithCustomToken` ouvre alors une session Firebase ordinaire :
 * le reste de l'application — `useUser`, `AuthGuard`, règles Firestore — fonctionne sans
 * modification.
 *
 * Aucun reCAPTCHA n'intervient, contrairement à `signInWithPhoneNumber` : c'est ce qui
 * permet à ce flux de fonctionner à l'identique dans la WebView Capacitor.
 */
export function PhoneSignUp({ onCancel }: { onCancel?: () => void }) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phone.trim()) {
      setError('Veuillez saisir votre numéro de téléphone.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(apiUrl('/api/auth/phone/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Impossible d'envoyer le code.");
        return;
      }

      setStep('code');
      toast({
        title: 'Code envoyé',
        description: 'Vous allez recevoir un code à 6 chiffres. Vérifiez WhatsApp, puis vos SMS.',
      });
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau.');
    } finally {
      setIsProcessing(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.trim().length !== 6) {
      setError('Le code comporte 6 chiffres.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(apiUrl('/api/auth/phone/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Code incorrect.');
        return;
      }

      await signInWithCustomToken(auth, data.token);
      toast({
        title: data.isNewAccount ? 'Compte créé avec succès' : 'Connexion réussie',
        description: 'Préparation de votre espace établissement...',
      });
      router.push(data.isNewAccount ? '/onboarding' : '/dashboard');
    } catch {
      setError('La vérification a échoué. Réessayez.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (step === 'code') {
    return (
      <form onSubmit={submitCode} className="space-y-3">
        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="otp-code" className="font-bold text-slate-600">
            Code reçu
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
            <Input
              id="otp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={event => setCode(event.target.value.replace(/\D/g, ''))}
              className="h-14 rounded-xl pl-12 text-center text-2xl font-bold tracking-[0.5em]"
            />
          </div>
          <p className="text-xs text-slate-400">
            Envoyé au {phone}. Le code expire dans 10 minutes.
          </p>
        </div>

        <Button
          type="submit"
          disabled={isProcessing}
          className="h-14 w-full rounded-xl bg-[#2D9CDB] text-lg font-bold text-white hover:bg-[#2D9CDB]/90"
        >
          {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Vérifier et continuer'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setStep('phone');
            setCode('');
            setError('');
          }}
          className="w-full font-bold text-slate-500"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Changer de numéro
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={requestCode} className="space-y-3">
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="otp-phone" className="font-bold text-slate-600">
          Numéro de téléphone
        </Label>
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
          <Input
            id="otp-phone"
            type="tel"
            autoComplete="tel"
            placeholder="07 12 34 56 78"
            value={phone}
            onChange={event => setPhone(event.target.value)}
            className="h-14 rounded-xl pl-12"
          />
        </div>
        <p className="text-xs text-slate-400">
          Vous recevrez un code par WhatsApp, ou par SMS à défaut.
        </p>
      </div>

      <Button
        type="submit"
        disabled={isProcessing}
        className="h-14 w-full rounded-xl bg-[#2D9CDB] text-lg font-bold text-white hover:bg-[#2D9CDB]/90"
      >
        {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Recevoir mon code'}
      </Button>

      {onCancel && (
        <Button type="button" variant="ghost" onClick={onCancel} className="w-full font-bold text-slate-500">
          Utiliser plutôt une adresse email
        </Button>
      )}
    </form>
  );
}
