
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MessageSquare, UserPlus } from 'lucide-react';

export default function DemoExpiredPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/40">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
            <div className="flex justify-center mb-4">
                <Clock className="h-12 w-12 text-primary" />
            </div>
          <CardTitle className="text-2xl">Votre session démo a expiré</CardTitle>
          <CardDescription>
            Nous espérons que vous avez apprécié cette démonstration. Pour continuer, vous pouvez contacter notre équipe ou créer votre propre compte.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-3">
          <Button className="w-full" onClick={() => router.push('/demo/contact')}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Contacter l'équipe commerciale
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => router.push('/login')}>
            <UserPlus className="mr-2 h-4 w-4" />
            Créer un compte réel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
