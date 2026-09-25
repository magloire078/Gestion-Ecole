'use client';

import React, { useMemo } from 'react';
import { useSchoolData } from '@/hooks/use-school-data';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { SchoolInfoSheet } from '@/components/school-info-sheet';
import { Button } from '@/components/ui/button';
import { RefreshCw, Building2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { school as School } from '@/lib/data-types';

export default function SchoolSheetPage() {
  const { schoolData: contextSchoolData, schoolId: contextSchoolId, loading: schoolLoading, reloadUser } = useSchoolData();
  const { user, schoolId: userSchoolId, loading: userLoading } = useUser();
  const firestore = useFirestore();

  // Identifier l'école avec plusieurs niveaux de résilience
  const effectiveSchoolId = contextSchoolId || userSchoolId || user?.schoolId;

  // Référence directe au document Firestore en cas de délai de propagation du contexte
  const schoolDocRef = useMemo(() => {
    if (!firestore || !effectiveSchoolId) return null;
    return doc(firestore, 'ecoles', effectiveSchoolId) as DocumentReference<School>;
  }, [firestore, effectiveSchoolId]);

  const { data: directSchoolData, loading: directDocLoading } = useDoc<School>(schoolDocRef);

  const school = (contextSchoolData || directSchoolData) as School | null;
  const isLoading = !school && (schoolLoading || userLoading || directDocLoading);

  if (isLoading) {
    return (
      <div className="space-y-6 p-2 sm:p-4 max-w-4xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="rounded-2xl border bg-card/60 backdrop-blur-xl p-6 sm:p-8 space-y-8 shadow-xl">
          <div className="flex justify-between items-center pb-6 border-b border-border/50">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48 rounded-md" />
                <Skeleton className="h-4 w-32 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-8 w-36 rounded-md" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-32 md:col-span-2 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-2xl border border-destructive/20 bg-card/60 backdrop-blur-xl shadow-xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
          Informations de l'établissement introuvables
        </h2>
        <p className="text-sm text-slate-500">
          Impossible de charger la fiche de renseignements. Vérifiez votre connexion ou que votre établissement est correctement configuré.
        </p>
        <div className="pt-2">
          <Button 
            onClick={() => reloadUser?.()} 
            variant="outline" 
            className="rounded-xl gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            Fiche de renseignements de l'établissement
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Consultez et imprimez la fiche officielle d'informations de l'établissement.
          </p>
        </div>
      </div>

      <SchoolInfoSheet school={school} />
    </motion.div>
  );
}


