
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RoutesManagementPage() {
  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
            <CardTitle>Gestion des Lignes de Transport</CardTitle>
            <CardDescription>
              Définissez les lignes de bus, les arrêts et les horaires. (Bientôt disponible)
            </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cette section est en cours de développement.</p>
        </CardContent>
      </Card>
    </div>
  );
}
