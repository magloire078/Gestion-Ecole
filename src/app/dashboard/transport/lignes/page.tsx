
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bus } from 'lucide-react';

export default function RoutesManagementPage() {
  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bus className="h-6 w-6" />
              </div>
              <div>
                  <CardTitle>Gestion des Lignes</CardTitle>
                  <CardDescription>
                    Définissez les lignes de bus, les arrêts et les horaires. (Bientôt disponible)
                  </CardDescription>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cette section est en cours de développement.</p>
        </CardContent>
         <CardFooter>
            <Button variant="outline" asChild>
                <Link href="/dashboard/transport/bus">Gérer la flotte de bus</Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
