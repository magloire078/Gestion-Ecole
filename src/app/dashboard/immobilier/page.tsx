'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building } from 'lucide-react';

export default function ImmobilierDashboardPage() {

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Équipements
            </CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">...</div>
            <p className="text-xs text-muted-foreground">
              Nombre total d'équipements inventoriés
            </p>
          </CardContent>
        </Card>
        {/* Autres cartes de statistiques */}
      </div>
       <Card>
        <CardHeader>
            <CardTitle>Bienvenue</CardTitle>
        </CardHeader>
        <CardContent>
            <p>Le module de gestion immobilière est en cours de construction.</p>
        </CardContent>
       </Card>
    </div>
  );
}
