
'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Megaphone, ArrowRight } from 'lucide-react';
import { Button } from "./ui/button";
import Link from "next/link";
import { useUserSession } from "@/hooks/use-user-session";
import { useCollection, useFirestore } from "@/firebase";
import { useMemo } from "react";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

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
    return (
      <div className="w-full h-[88px] rounded-xl overflow-hidden glass-card p-4 flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl bg-slate-200/50" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3 bg-slate-200/80" />
          <Skeleton className="h-4 w-1/2 bg-slate-200/50" />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative group"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-400 to-blue-400 rounded-xl blur opacity-15 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
      
      <div className="relative overflow-hidden rounded-xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl transition-all duration-500 hover:shadow-2xl">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        </div>

        <div className="relative z-10 p-5 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 items-center justify-between">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 bg-indigo-400/20 rounded-xl blur-sm" />
              <div className="relative p-3.5 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-200 border border-indigo-400/30">
                <Megaphone className="h-6 w-6" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight leading-none">
                {announcement.title}
              </h3>
              <p className="text-slate-500 text-sm md:text-base font-medium line-clamp-1">
                {announcement.content}
              </p>
            </div>
          </div>

          <Button 
            asChild 
            className="rounded-xl font-black px-6 h-12 bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-lg shadow-indigo-200 transition-all duration-300 hover:scale-105 active:scale-95 group/btn shrink-0"
          >
            <Link href="/dashboard/messagerie">
              Voir les messages
              <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
