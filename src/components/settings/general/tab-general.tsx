'use client';

import { useFormContext } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { School, Calendar, Building } from "lucide-react";
import type { SettingsFormValues } from "./settings-schema";

export function TabGeneral() {
  const { control } = useFormContext<SettingsFormValues>();

  return (
    <div className="relative space-y-6 mt-0">
      <div className="absolute top-0 right-0 -translate-y-8 translate-x-8 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <Card className="rounded-xl border-none shadow-2xl shadow-primary/5 bg-white/80 backdrop-blur-xl border border-white/20 p-4 md:p-6 overflow-hidden relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <FormField control={control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 font-bold"><School className="h-4 w-4 text-primary" />Nom de l&apos;Établissement</FormLabel>
              <FormControl><Input className="rounded-xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={control} name="currentAcademicYear" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 font-bold"><Calendar className="h-4 w-4 text-primary" />Année Académique</FormLabel>
              <FormControl><Input placeholder="Ex: 2024-2025" className="rounded-xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="md:col-span-2">
            <FormField control={control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 font-bold"><Building className="h-4 w-4 text-primary" />Adresse Physique</FormLabel>
                <FormControl><Input placeholder="Quartier, Rue, Ville..." className="rounded-xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>
      </Card>
    </div>
  );
}
