'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, GraduationCap } from 'lucide-react';

const CANONICAL_PROMOTION_URL = '/dashboard/parametres/annee-scolaire/promotion';

/**
 * Cet écran de "Passage en Classe Supérieure" a été remplacé : il écrivait
 * directement sur `eleve.classId`/`enrollments[]` sans passer par
 * `inscriptions_classe`, en parallèle du flux de promotion lié à l'assistant
 * "Nouvelle Année Scolaire". Les deux mécanismes divergeaient sur les mêmes
 * données. La page ci-dessous (accessible via Paramètres > Année Scolaire)
 * est désormais la seule voie pour promouvoir des élèves.
 */
export default function TransitionRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        const timeout = setTimeout(() => router.replace(CANONICAL_PROMOTION_URL), 4000);
        return () => clearTimeout(timeout);
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
            <Card className="max-w-lg w-full bg-white/40 backdrop-blur-xl border border-white/60">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-indigo-600" />
                        Cette page a déménagé
                    </CardTitle>
                    <CardDescription>
                        Le passage en classe supérieure se fait désormais depuis l&apos;assistant
                        &laquo;&nbsp;Nouvelle Année Scolaire&nbsp;&raquo;, dans Paramètres. Vous allez être redirigé
                        automatiquement.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Link href={CANONICAL_PROMOTION_URL}>
                            Aller à la page de promotion <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
