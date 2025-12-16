
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, Send, Users, User, BookUser } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const DEMO_MESSAGES = [
    { id: 'msg1', title: 'Réunion des parents d\'élèves - CM2', date: '2024-05-18T10:00:00Z', sender: 'M. Diallo', recipients: 'Classe CM2-A, CM2-B' },
    { id: 'msg2', title: 'Rappel : Fête de fin d\'année', date: '2024-05-17T14:30:00Z', sender: 'Administration', recipients: 'Toute l\'école' },
    { id: 'msg3', title: 'Modification emploi du temps 6ème', date: '2024-05-16T09:00:00Z', sender: 'Direction Pédagogique', recipients: 'Enseignants, Classe 6ème-B' },
    { id: 'msg4', title: 'Informations transport scolaire', date: '2024-05-15T16:00:00Z', sender: 'Service Transport', recipients: 'Parents concernés' },
];

export default function DemoCommunicationPage() {
  const router = useRouter();

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-muted/40 p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold md:text-2xl">Démo: Messagerie</h1>
              <p className="text-muted-foreground">Simulation de l'envoi de messages et notifications.</p>
            </div>
             <Button variant="outline" onClick={() => router.back()}>Retour au tableau de bord</Button>
        </div>
        
        <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                  <CardTitle>Historique des envois</CardTitle>
                  <CardDescription>Liste des derniers messages et notifications envoyés.</CardDescription>
                </div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button disabled>
                          <span className="flex items-center gap-2">
                            <PlusCircle className="h-4 w-4" /> Nouveau Message
                          </span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Fonctionnalité désactivée en mode démo</p></TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Destinataires</TableHead>
                    <TableHead>Auteur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DEMO_MESSAGES.map((message) => (
                    <TableRow key={message.id}>
                        <TableCell>{format(new Date(message.date), 'd MMM yyyy, HH:mm', { locale: fr })}</TableCell>
                        <TableCell className="font-medium">{message.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{message.recipients}</TableCell>
                        <TableCell>{message.sender}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>Exemple de formulaire d'envoi</CardTitle>
                <CardDescription>Voici à quoi ressemblerait la création d'un message.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 opacity-50 cursor-not-allowed">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Titre</label>
                    <Input disabled placeholder="Objet de votre message" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Message</label>
                    <textarea disabled className="w-full h-24 p-2 border rounded-md" placeholder="Rédigez votre message..."></textarea>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Destinataires</label>
                    <div className="p-4 border rounded-md space-y-3">
                        <div className="flex items-center gap-2"><Checkbox disabled id="demo-check-1" /><label htmlFor="demo-check-1" className="text-sm">Toute l'école</label></div>
                        <div className="flex items-center gap-2"><Checkbox disabled id="demo-check-2" /><label htmlFor="demo-check-2" className="text-sm">Tous les enseignants</label></div>
                        <div className="flex items-center gap-2"><Checkbox disabled id="demo-check-3" /><label htmlFor="demo-check-3" className="text-sm">Personnel non-enseignant</label></div>
                        <div className="space-y-1">
                            <label className="text-sm">Classes spécifiques</label>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">CM2-A</Badge>
                                <Badge variant="secondary">6ème-B</Badge>
                                <Badge variant="outline">+ 4 autres</Badge>
                            </div>
                        </div>
                    </div>
                </div>
                <Button disabled className="w-full">
                    <Send className="mr-2 h-4 w-4" /> Envoyer le message
                </Button>
            </CardContent>
          </Card>
      </div>
    </div>
    </TooltipProvider>
  );
}

    