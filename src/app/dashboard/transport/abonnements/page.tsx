
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TransportSubscriptionsPage() {
  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Abonnements au Transport</CardTitle>
          <CardDescription>
            Gérez les abonnements des élèves au service de transport scolaire. (Bientôt disponible)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cette section est en cours de développement.</p>
        </CardContent>
      </Card>
    </div>
  );
}

    