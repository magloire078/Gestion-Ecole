
'use client';

import { generateSchoolAnnouncement } from '@/ai/flows/dynamically-generate-school-announcements';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Megaphone } from 'lucide-react';
import { useState, useEffect } from 'react';

const SESSION_STORAGE_KEY = 'school-announcement';

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState('Chargement des annonces...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnnouncement() {
      // 1. Check if announcement is already in session storage
      const cachedAnnouncement = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (cachedAnnouncement) {
        setAnnouncement(cachedAnnouncement);
        setIsLoading(false);
        return;
      }

      // 2. If not cached, generate a new one
      setIsLoading(true);
      try {
        const result = await generateSchoolAnnouncement({
          userRole: 'administrator', // This can be dynamically set based on user's actual role
          schoolEvents: 'La semaine prochaine, c\'est la semaine des examens. Journée portes ouvertes le 25 du mois.',
          schoolDetails: 'GèreEcole est une institution qui valorise l\'excellence académique et le développement personnel.'
        });
        
        // 3. Save to state and session storage
        setAnnouncement(result.announcement);
        sessionStorage.setItem(SESSION_STORAGE_KEY, result.announcement);

      } catch (error) {
        console.error('Failed to generate announcement:', error);
        // Fallback to a default message if the AI service fails
        const fallbackMessage = 'Bienvenue sur votre tableau de bord GèreEcole.';
        setAnnouncement(fallbackMessage);
        // Also cache the fallback to prevent repeated API calls on failure
        sessionStorage.setItem(SESSION_STORAGE_KEY, fallbackMessage);
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
