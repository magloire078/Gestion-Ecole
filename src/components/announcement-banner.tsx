
'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Megaphone } from 'lucide-react';
import { useState, useEffect } from 'react';

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState('Bienvenue sur votre tableau de bord GèreEcole.');

  return (
    <Alert className="bg-primary/10 border-primary/20 text-primary">
      <Megaphone className="h-4 w-4 !text-primary" />
      <AlertTitle className="font-bold">Annonces</AlertTitle>
      <AlertDescription>
        {announcement}
      </AlertDescription>
    </Alert>
  );
}
