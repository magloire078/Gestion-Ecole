
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CyclesManager } from "@/components/pedagogy/cycles-manager";
import { ClassesList } from "@/components/pedagogy/classes-list";
import { School, Users, Book } from "lucide-react";
import { SubjectsManager } from "@/components/pedagogy/subjects-manager";
import { useSchoolData } from "@/hooks/use-school-data";
import { Skeleton } from "@/components/ui/skeleton";

export default function StructurePage() {
  const { schoolData, loading } = useSchoolData();

  if (loading) {
    return (
        <div className="p-8 space-y-6">
            <Skeleton className="h-12 w-1/2 rounded-2xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-3xl" />
        </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 to-slate-500 bg-clip-text text-transparent">
            Structure Pédagogique
          </h1>
          <p className="text-slate-500 max-w-2xl text-sm font-medium">
            Configurez l'architecture éducative de votre établissement : cycles, niveaux, classes et matières.
          </p>
        </div>
      </div>

      <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/40 dark:border-slate-800/40 p-2 rounded-[2rem] shadow-sm">
        <Tabs defaultValue="classes" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-transparent p-1 h-auto gap-2">
            <TabsTrigger 
              value="classes" 
              className="rounded-2xl py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all duration-300 font-bold"
            >
              <Users className="mr-2 h-4 w-4" />
              Classes
            </TabsTrigger>
            <TabsTrigger 
              value="cycles"
              className="rounded-2xl py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all duration-300 font-bold"
            >
              <School className="mr-2 h-4 w-4" />
              Cycles & Niveaux
            </TabsTrigger>
            <TabsTrigger 
              value="matieres"
              className="rounded-2xl py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all duration-300 font-bold"
            >
              <Book className="mr-2 h-4 w-4" />
              Matières
            </TabsTrigger>
          </TabsList>
          
          <div className="px-2 pb-2">
            <TabsContent value="classes" className="mt-4 focus-visible:ring-0">
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[1.5rem] overflow-hidden shadow-sm">
                <ClassesList academicYear={schoolData?.currentAcademicYear} />
              </div>
            </TabsContent>
            
            <TabsContent value="cycles" className="mt-4 focus-visible:ring-0">
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[1.5rem] overflow-hidden shadow-sm">
                <CyclesManager />
              </div>
            </TabsContent>
            
            <TabsContent value="matieres" className="mt-4 focus-visible:ring-0">
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[1.5rem] overflow-hidden shadow-sm">
                <SubjectsManager />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
