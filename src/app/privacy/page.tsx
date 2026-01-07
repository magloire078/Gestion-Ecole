'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Politique de Confidentialité</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert">
          <h2>1. Collecte des Données</h2>
          <p>
            Nous collectons les informations nécessaires à la fourniture du
            service, y compris les données des élèves, du personnel et de
            l'établissement.
          </p>

          <h2>2. Utilisation des Données</h2>
          <p>
            Vos données sont utilisées exclusivement pour le fonctionnement de
            la plateforme GèreEcole et ne sont jamais partagées avec des tiers
            sans votre consentement.
          </p>

          <h2>3. Sécurité</h2>
          <p>
            Nous mettons en œuvre des mesures de sécurité techniques et
            organisationnelles pour protéger vos données contre tout accès non
            autorisé.
          </p>

          <h2>4. Vos Droits</h2>
           <p>
            Vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles.
          </p>

          <div className="mt-8 text-center">
            <Button asChild>
              <Link href="/">Retour à l'accueil</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
