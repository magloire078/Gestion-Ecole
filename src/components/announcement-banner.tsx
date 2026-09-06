
'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Megaphone, ArrowRight } from 'lucide-react';
import { Button } from "./ui/button";
import Link from "next/link";
import { useUserSession } from "@/hooks/use-user-session";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { useMemo } from "react";
import { collection, query, orderBy, limit, where, documentId } from "firebase/firestore";
import type { message as Message } from "@/lib/data-types";
import { Skeleton } from "./ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_ANNOUNCEMENT = { title: "Bienvenue sur GèreEcole", content: "Utilisez les menus pour naviguer et gérer votre établissement." };

export function AnnouncementBanner() {
  const { schoolId, isLoading: sessionLoading } = useUserSession();
  const { user } = useUser();
  const firestore = useFirestore();

  // On ne peut plus se contenter du tout dernier message : il faut filtrer
  // par destinataires (sinon un message "Enseignants uniquement" s'affiche
  // aussi aux parents et au reste du personnel).
  const messagesQuery = useMemo(() =>
    schoolId
      ? query(
        collection(firestore, `ecoles/${schoolId}/messagerie`),
        orderBy('createdAt', 'desc'),
        limit(20)
      )
      : null,
    [firestore, schoolId]
  );

  const { data: messagesData, loading: messagesLoading } = useCollection(messagesQuery);

  const isParent = !!user?.isParent;
  const isTeacher = user?.profile?.role === 'enseignant';
  const parentStudentIds = useMemo(() => user?.parentStudentIds || [], [user?.parentStudentIds]);

  const studentsQuery = useMemo(() =>
    (schoolId && isParent && parentStudentIds.length > 0)
      ? query(
        collection(firestore, `ecoles/${schoolId}/eleves`),
        where(documentId(), 'in', parentStudentIds.slice(0, 30)),
      )
      : null,
    [firestore, schoolId, isParent, parentStudentIds]);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);

  const myChildrenClassIds = useMemo(() =>
    studentsData?.map(d => d.data()?.classId).filter(Boolean) || [],
    [studentsData]);

  const announcement = useMemo(() => {
    if (!messagesData) return DEFAULT_ANNOUNCEMENT;
    const match = messagesData.find(d => {
      const m = d.data() as Message;
      const r = m.recipients || {};
      if (r.all) return true;
      if (isParent) {
        return !!r.classes?.some(c => myChildrenClassIds.includes(c));
      }
      return (isTeacher && !!r.teachers) || (!isTeacher && !!r.staff);
    });
    return match ? match.data() : DEFAULT_ANNOUNCEMENT;
  }, [messagesData, isParent, isTeacher, myChildrenClassIds]);

  const isLoading = sessionLoading || messagesLoading || studentsLoading;

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
