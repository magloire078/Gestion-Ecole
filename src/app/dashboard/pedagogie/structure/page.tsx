

'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CyclesManager } from "@/components/pedagogy/cycles-manager";
import { NiveauxManager } from "@/components/pedagogy/niveaux-manager";
import { ClassesList } from "@/components/pedagogy/classes-list";
import { School, GraduationCap, Users, Book } from "lucide-react";
import { SubjectsManager } from "@/components/pedagogy/subjects-manager";

export default function StructurePage() {
  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-2xl font-bold">Structure Pédagogique</h1>
        <p className="text-muted-foreground">
          Organisez les cycles, niveaux, classes et matières de votre établissement.
        </p>
      </div>
       <Tabs defaultValue="classes" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="classes">
            <Users className="mr-2 h-4 w-4" />
            Classes
          </TabsTrigger>
          <TabsTrigger value="niveaux">
            <GraduationCap className="mr-2 h-4 w-4" />
            Niveaux
          </TabsTrigger>
          <TabsTrigger value="cycles">
            <School className="mr-2 h-4 w-4" />
            Cycles
          </TabsTrigger>
          <TabsTrigger value="matieres">
            <Book className="mr-2 h-4 w-4" />
            Matières
          </TabsTrigger>
        </TabsList>
        <TabsContent value="classes" className="mt-6">
          <ClassesList />
        </TabsContent>
        <TabsContent value="niveaux" className="mt-6">
          <NiveauxManager />
        </TabsContent>
        <TabsContent value="cycles" className="mt-6">
          <CyclesManager />
        </TabsContent>
        <TabsContent value="matieres" className="mt-6">
          <SubjectsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
