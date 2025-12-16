'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KeyRound, PlusCircle } from 'lucide-react';

export default function ClesPage() {

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Gestion des Clés</CardTitle>
                    <CardDescription>
                        Suivez la distribution et le retour des clés de l'établissement.
                    </CardDescription>
                </div>
                <Button disabled>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ajouter un trousseau
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <div className="bg-muted p-4 rounded-full mb-4">
                    <KeyRound className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold">Bientôt disponible</h3>
                <p className="text-muted-foreground max-w-sm">
                    La gestion des clés et des trousseaux sera bientôt disponible ici pour vous aider à suivre qui a accès à quoi.
                </p>
            </div>
        </CardContent>
       </Card>
    </div>
  );
}
