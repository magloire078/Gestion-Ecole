'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Conditions Générales d'Utilisation</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert">
          <h2>1. Introduction</h2>
          <p>
            Bienvenue sur GèreEcole. En utilisant nos services, vous acceptez
            d'être lié par ces conditions.
          </p>

          <h2>2. Utilisation du Service</h2>
          <p>
            Vous vous engagez à utiliser le service de manière responsable et
            conformément à la loi.
          </p>

          <h2>3. Contenu et Données</h2>
          <p>
            Vous êtes responsable des données que vous téléchargez sur la
            plateforme. Nous nous engageons à protéger la confidentialité de
            ces données.
          </p>
          
           <h2>4. Limitation de Responsabilité</h2>
          <p>
            Le service est fourni "en l'état". Nous ne garantissons pas que le service sera exempt d'erreurs ou ininterrompu.
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
