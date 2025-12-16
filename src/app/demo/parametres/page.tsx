
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Settings, Users, School, Briefcase } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function DemoSettingsPage() {
  const router = useRouter();

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-muted/40 p-6">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold md:text-2xl">Démo: Paramètres</h1>
              <p className="text-muted-foreground">Simulation de la page de configuration de l'établissement.</p>
            </div>
            <Button variant="outline" onClick={() => router.back()}>Retour au tableau de bord</Button>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><School className="h-5 w-5"/> Informations de l'École Démo Modèle</CardTitle>
                <CardDescription>Ces informations sont modifiables dans la version complète.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="schoolName">Nom de l'établissement</Label>
                        <Input id="schoolName" value="École Démo Modèle" disabled />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="schoolAddress">Adresse</Label>
                        <Input id="schoolAddress" value="Abidjan, Côte d'Ivoire" disabled />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="directorName">Nom du Directeur</Label>
                    <Input id="directorName" value="Jean Dupont" disabled />
                </div>
                 <div className="flex justify-end pt-4">
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button disabled>Enregistrer les modifications</Button>
                        </TooltipTrigger>
                        <TooltipContent>Fonctionnalité désactivée en mode démo</TooltipContent>
                    </Tooltip>
                 </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Code d'Invitation</CardTitle>
                <CardDescription>Partagez ce code avec vos collaborateurs pour les inviter.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 p-4 bg-muted rounded-md">
                    <code className="flex-1 font-mono text-lg tracking-wider text-center">DEMO-1234</code>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" disabled>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Désactivé en mode démo</TooltipContent>
                    </Tooltip>
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5"/> Gestion des Rôles</CardTitle>
                <CardDescription>Définissez des rôles personnalisés avec des permissions spécifiques.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">La gestion avancée des permissions des utilisateurs est disponible dans les plans Pro et Premium.</p>
                <Button variant="secondary" className="mt-4" disabled>Voir les Rôles</Button>
            </CardContent>
        </Card>
      </div>
    </div>
    </TooltipProvider>
  );
}
