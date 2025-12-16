
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Map } from 'lucide-react';

export default function PlanPage() {

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Plan des locaux</CardTitle>
                    <CardDescription>
                        Visualisez et interagissez avec le plan de votre établissement.
                    </CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <div className="bg-muted p-4 rounded-full mb-4">
                    <Map className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold">Bientôt disponible</h3>
                <p className="text-muted-foreground max-w-sm">
                    La fonctionnalité de plan interactif est en cours de développement et sera disponible prochainement.
                </p>
            </div>
        </CardContent>
       </Card>
    </div>
  );
}
