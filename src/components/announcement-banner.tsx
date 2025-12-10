'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Megaphone } from 'lucide-react';
import { useState } from 'react';

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState('Bienvenue sur votre tableau de bord GèreEcole.');

  return (
    <Alert className="bg-primary/10 border-primary/20 text-primary-foreground dark:bg-primary/20 dark:text-primary-foreground">
      <Megaphone className="h-4 w-4 !text-primary" />
      <AlertTitle className="font-bold !text-primary">Annonces</AlertTitle>
      <AlertDescription className="!text-primary/90">
        {announcement}
      </AlertDescription>
    </Alert>
  );
}
