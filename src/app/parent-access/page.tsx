'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ParentAccessRedirectPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>Portail Parent</CardTitle>
                    <CardDescription>
                        Pour activer votre accès parent, veuillez vous connecter ou créer un compte.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-6">
                        Une fois connecté, vous serez invité à entrer le code d'accès fourni par l'établissement scolaire.
                    </p>
                    <Button asChild className="w-full">
                        <Link href="/auth/login">Se connecter ou créer un compte</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
