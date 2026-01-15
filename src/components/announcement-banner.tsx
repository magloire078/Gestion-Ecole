
'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Megaphone, ArrowRight } from 'lucide-react';
import { Button } from "./ui/button";
import Link from "next/link";

export function AnnouncementBanner() {
  // La requête a été supprimée pour éviter les erreurs de permission
  // et sera réintroduite avec une approche plus performante.
  const announcement = {
      title: "Bienvenue sur GèreEcole",
      content: "Utilisez les menus pour naviguer et gérer votre établissement."
  };

  return (
    <Alert className="bg-primary/10 border-primary/20 text-primary-foreground dark:bg-primary/20 dark:text-primary-foreground">
      <Megaphone className="h-4 w-4 !text-primary" />
      <div className="flex justify-between items-center w-full">
        <div>
          <AlertTitle className="font-bold !text-primary">{announcement.title}</AlertTitle>
          <AlertDescription className="!text-primary/90 line-clamp-2">
            {announcement.content}
          </AlertDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="shrink-0 ml-4 !text-primary hover:bg-primary/10">
            <Link href="/dashboard/messagerie">
                Voir les messages <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
        </Button>
      </div>
    </Alert>
  );
}
