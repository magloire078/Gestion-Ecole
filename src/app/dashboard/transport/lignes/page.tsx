
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { transportNavLinks } from './links';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function RoutesManagementPage() {
  const transportLink = transportNavLinks.find(link => link.label === "Lignes");

  if (!transportLink) {
    return <p>Link not found</p>;
  }
  
  const { icon: Icon } = transportLink;

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
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
