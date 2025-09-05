'use client';

import { generateSchoolAnnouncement } from '@/ai/flows/dynamically-generate-school-announcements';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Megaphone } from 'lucide-react';
import { useState, useEffect } from 'react';

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState('Chargement des annonces...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnnouncement() {
      setIsLoading(true);
      try {
        const result = await generateSchoolAnnouncement({
          userRole: 'administrator',
          schoolEvents: 'La semaine prochaine, c\'est la semaine des examens. Journée portes ouvertes le 25 du mois.',
          schoolDetails: 'GèreEcole est une institution qui valorise l\'excellence académique et le développement personnel.'
        });
        setAnnouncement(result.announcement);
      } catch (error) {
        console.error('Failed to generate announcement:', error);
        setAnnouncement('Impossible de charger les annonces pour le moment.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnnouncement();
  }, []);

  return (
    <Alert className="bg-primary/10 border-primary/20 text-primary">
      <Megaphone className="h-4 w-4 !text-primary" />
      <AlertTitle className="font-bold">Annonces</AlertTitle>
      <AlertDescription>
        {isLoading ? 'Génération de l\'annonce par l\'IA...' : announcement}
      </AlertDescription>
    </Alert>
  );
}
