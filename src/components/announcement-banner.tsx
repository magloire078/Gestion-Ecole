
'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Megaphone, ArrowRight } from 'lucide-react';
import { Button } from "./ui/button";
import Link from "next/link";
import { useSchoolData } from "@/hooks/use-school-data";
import { useCollection, useFirestore } from "@/firebase";
import { useMemo } from "react";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";

export function AnnouncementBanner() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();

  const messagesQuery = useMemo(() => 
    schoolId 
      ? query(
          collection(firestore, `ecoles/${schoolId}/messagerie`), 
          orderBy('createdAt', 'desc'), 
          limit(1)
        ) 
      : null,
    [firestore, schoolId]
  );
  
  const { data: messagesData, loading: messagesLoading } = useCollection(messagesQuery);

  const announcement = useMemo(() => 
    messagesData && messagesData.length > 0 
      ? messagesData[0].data() 
      : { title: "Bienvenue sur GèreEcole", content: "Utilisez les menus pour naviguer et gérer votre établissement." },
    [messagesData]
  );
  
  const isLoading = schoolLoading || messagesLoading;

  if (isLoading) {
    return (
       <Alert className="bg-primary/10 border-primary/20">
         <div className="flex justify-between items-center w-full">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-8 w-24" />
        </div>
       </Alert>
    )
  }

  return (
    <Alert className="bg-primary/10 border-primary/20 text-primary-foreground dark:bg-primary/20 dark:text-primary-foreground">
      <Megaphone className="h-4 w-4 !text-primary" />
      <div className="flex justify-between items-center w-full">
        <div>
          <AlertTitle className="font-bold !text-primary">{announcement.title}</AlertTitle>
          <AlertDescription className="!text-primary/90 line-clamp-1">
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
