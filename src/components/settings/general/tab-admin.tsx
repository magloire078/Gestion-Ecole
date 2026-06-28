'use client';

import { useFormContext } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FileSignature, Briefcase } from "lucide-react";
import type { SettingsFormValues } from "./settings-schema";

export function TabAdmin() {
  const { control } = useFormContext<SettingsFormValues>();

  return (
    <div className="space-y-6 mt-0">
      <Card className="rounded-xl border-none shadow-2xl shadow-primary/5 bg-white/80 backdrop-blur-xl border border-white/20 p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField control={control} name="matricule" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 font-bold"><FileSignature className="h-4 w-4 text-primary" />Matricule Officiel</FormLabel>
              <FormControl><Input placeholder="Ex: 0123/ETAB/2024" className="rounded-xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={control} name="cnpsEmployeur" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 font-bold"><Briefcase className="h-4 w-4 text-primary" />N° CNPS Employeur</FormLabel>
              <FormControl><Input placeholder="Numéro d'immatriculation" className="rounded-xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      </Card>
    </div>
  );
}
