'use client';

import { ClassesList } from "@/components/pedagogy/classes-list";
import { useSchoolData } from "@/hooks/use-school-data";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClassesPage() {
  const { schoolData, loading } = useSchoolData();

  if (loading) {
    return (
        <div className="p-4 md:p-6 space-y-6">
            <Skeleton className="h-12 w-1/2 rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 to-slate-500 bg-clip-text text-transparent">
          Gestion des Classes
        </h1>
        <p className="text-slate-500 max-w-2xl text-sm font-medium">
          Consultez et gérez la liste des classes et leurs enseignants principaux pour l&apos;année en cours.
        </p>
      </div>

      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-2xl overflow-hidden shadow-sm p-4">
        <ClassesList academicYear={schoolData?.currentAcademicYear} />
      </div>
    </div>
  );
}
