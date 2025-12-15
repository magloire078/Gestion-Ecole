
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function BusManagementPage() {
  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Gestion de la Flotte</CardTitle>
          <CardDescription>
            Gérez les bus de votre flotte de transport scolaire. (Bientôt disponible)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cette section est en cours de développement.</p>
        </CardContent>
      </Card>
    </div>
  );
}

    