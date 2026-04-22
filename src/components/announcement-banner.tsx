'use client';

import { Megaphone, ArrowRight } from 'lucide-react';
import { Button } from "./ui/button";
import Link from "next/link";
import { useUserSession } from "@/hooks/use-user-session";
import { useCollection, useFirestore } from "@/firebase";
import { useMemo } from "react";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";

export function AnnouncementBanner() {
  const { schoolId, isLoading: sessionLoading } = useUserSession();
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

  const isLoading = sessionLoading || messagesLoading;

  if (isLoading) {
    return <Skeleton className="h-16 w-full rounded-xl" />;
  }

  return (
    <div
      role="status"
      className="flex items-center gap-4 rounded-xl border border-blue-300/70 bg-gradient-to-r from-blue-50 to-indigo-50/40 dark:from-blue-950/40 dark:to-indigo-950/30 dark:border-blue-800/60 p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/30">
        <Megaphone className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-blue-900 dark:text-blue-100">
          {announcement.title}
        </p>
        <p className="text-sm font-medium leading-snug mt-0.5 text-blue-800/90 dark:text-blue-200/90 line-clamp-1">
          {announcement.content}
        </p>
      </div>
      <Button asChild size="sm" className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/30 font-semibold">
        <Link href="/dashboard/messagerie">
          Voir les messages
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
