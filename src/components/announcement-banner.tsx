
'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Megaphone, ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { useFirestore, useCollection } from "@/firebase";
import { useSchoolData } from "@/hooks/use-school-data";
import { collection, query, orderBy, limit, where } from "firebase/firestore";
import type { message as Message } from "@/lib/data-types";
import { Skeleton } from "./ui/skeleton";
import Link from "next/link";
import { Button } from "./ui/button";

export function AnnouncementBanner() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  
  const latestMessageQuery = useMemo(() => {
      if (!schoolId) return null;
      // Query for the latest message sent to everyone
      return query(
          collection(firestore, `ecoles/${schoolId}/messagerie`),
          where('recipients.all', '==', true),
          orderBy('createdAt', 'desc'),
          limit(1)
      );
  }, [firestore, schoolId]);

  const { data: messageData, loading: messageLoading } = useCollection(latestMessageQuery);

  const announcement = useMemo(() => {
      if (!messageData || messageData.length === 0) {
          return { title: 'Bienvenue', content: 'Bienvenue sur votre tableau de bord GèreEcole.' };
      }
      const latestMessage = messageData[0].data() as Message;
      return { title: latestMessage.title, content: latestMessage.content };
  }, [messageData]);
  
  const isLoading = schoolLoading || messageLoading;

  if (isLoading) {
      return (
        <Alert className="bg-primary/10 border-primary/20">
          <Megaphone className="h-4 w-4 !text-primary" />
          <AlertTitle className="font-bold !text-primary">Annonces</AlertTitle>
          <AlertDescription>
            <Skeleton className="h-4 w-3/4" />
          </AlertDescription>
        </Alert>
      )
  }

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
