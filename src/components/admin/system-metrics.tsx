'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const SystemMetrics = ({ metrics }: { metrics: any }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Métrique du système</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Les métriques du système seront bientôt affichées ici.</p>
      </CardContent>
    </Card>
  );
};

    