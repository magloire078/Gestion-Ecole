
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TransportDashboardPage() {
  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Suivi en Temps Réel</CardTitle>
          <CardDescription>
            Suivez la position de vos bus en temps réel. (Bientôt disponible)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cette section est en cours de développement.</p>
        </CardContent>
      </Card>
    </div>
  );
}

    